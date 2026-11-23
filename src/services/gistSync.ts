/**
 * Serverless cross-device sync through a PRIVATE GitHub Gist.
 *
 * Design constraints that are easy to get wrong and expensive to debug:
 *
 * 1. `PATCH` MUST be uppercase. Some browser/proxy stacks normalise lowercase
 *    method strings inconsistently and the CORS preflight for `patch` fails,
 *    which surfaces as an opaque "TypeError: Failed to fetch".
 * 2. `GET` MUST use `cache: 'no-store'`, otherwise a device can wake up and
 *    read a stale HTTP-cached Gist for minutes and silently lose progress.
 * 3. Credentials NEVER live in source code. They are passed in at runtime from
 *    `localStorage` by the store layer.
 * 4. Conflicts resolve by comparing `updatedAt` ISO timestamps (last write
 *    wins, deterministic tie-break toward the remote copy so devices converge).
 */

import { sanitizeData } from '../lib/storage';
import type { StreakData, SyncCredentials } from '../types/streak';

export const GIST_FILE_NAME = 'streak-data.json';
export const GIST_API_BASE = 'https://api.github.com';
export const GIST_DESCRIPTION = 'Vault — encrypted-at-rest-in-your-account streak backup';

export class GistApiError extends Error {
  readonly status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = 'GistApiError';
    this.status = status;
  }
}

export interface GistFile {
  filename?: string;
  content?: string;
  truncated?: boolean;
  raw_url?: string;
}

export interface GistResponse {
  id: string;
  public?: boolean;
  updated_at?: string;
  files?: Record<string, GistFile>;
}

type FetchLike = typeof fetch;

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function describeError(err: unknown): string {
  if (err instanceof GistApiError) {
    switch (err.status) {
      case 401:
        return 'unauthorized';
      case 403:
        return 'forbidden';
      case 404:
        return 'not-found';
      case 409:
        return 'no-gist';
      case 422:
        return 'invalid-payload';
      default:
        return 'api-error';
    }
  }
  if (err instanceof Error && /fetch|network/i.test(err.message)) return 'network';
  return 'unknown';
}

function throwForStatus(status: number): void {
  if (status >= 200 && status < 300) return;
  throw new GistApiError(`GitHub API responded with ${status}`, status);
}

export function serializeForGist(data: StreakData): string {
  return JSON.stringify(data, null, 2);
}

/** GET a single gist. `cache: 'no-store'` is mandatory — see file header. */
export async function getGist(token: string, gistId: string, fetchImpl: FetchLike = fetch): Promise<GistResponse> {
  const res = await fetchImpl(`${GIST_API_BASE}/gists/${encodeURIComponent(gistId)}`, {
    method: 'GET',
    headers: authHeaders(token),
    cache: 'no-store',
  });
  throwForStatus(res.status);
  return (await res.json()) as GistResponse;
}

/** Create a PRIVATE gist holding `streak-data.json`. */
export async function createGist(
  token: string,
  data: StreakData,
  fetchImpl: FetchLike = fetch,
): Promise<GistResponse> {
  const res = await fetchImpl(`${GIST_API_BASE}/gists`, {
    method: 'POST',
    headers: authHeaders(token),
    cache: 'no-store',
    body: JSON.stringify({
      description: GIST_DESCRIPTION,
      public: false,
      files: { [GIST_FILE_NAME]: { content: serializeForGist(data) } },
    }),
  });
  throwForStatus(res.status);
  const gist = (await res.json()) as GistResponse;
  if (!gist?.id) throw new GistApiError('Gist creation returned no id', 500);
  return gist;
}

/** Update an existing gist. Method is intentionally the literal uppercase 'PATCH'. */
export async function updateGist(
  token: string,
  gistId: string,
  data: StreakData,
  fetchImpl: FetchLike = fetch,
): Promise<GistResponse> {
  const res = await fetchImpl(`${GIST_API_BASE}/gists/${encodeURIComponent(gistId)}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    cache: 'no-store',
    body: JSON.stringify({ files: { [GIST_FILE_NAME]: { content: serializeForGist(data) } } }),
  });
  throwForStatus(res.status);
  return (await res.json()) as GistResponse;
}

/** Read + parse the streak payload out of a gist, following truncated files. */
export async function readGistData(gist: GistResponse, fetchImpl: FetchLike = fetch): Promise<StreakData | null> {
  const file = gist.files?.[GIST_FILE_NAME];
  if (!file) return null;

  let content = file.content;
  if ((file.truncated || !content) && file.raw_url) {
    const res = await fetchImpl(file.raw_url, { method: 'GET', cache: 'no-store' });
    throwForStatus(res.status);
    content = await res.text();
  }
  if (!content) return null;

  try {
    return sanitizeData(JSON.parse(content));
  } catch {
    return null;
  }
}

/**
 * Looks for an existing gist that already holds `streak-data.json`.
 * Used when the user pastes only a token on a second device: instead of
 * creating a duplicate gist (which would split the sync in two), we adopt the
 * most recently updated streak gist in the account.
 */
export async function findStreakGist(token: string, fetchImpl: FetchLike = fetch): Promise<string | null> {
  const res = await fetchImpl(`${GIST_API_BASE}/gists?per_page=100`, {
    method: 'GET',
    headers: authHeaders(token),
    cache: 'no-store',
  });
  throwForStatus(res.status);
  const list: unknown = await res.json();
  if (!Array.isArray(list)) return null;

  const candidates = (list as GistResponse[])
    .filter((gist) => gist && gist.id && gist.files && Object.prototype.hasOwnProperty.call(gist.files, GIST_FILE_NAME))
    .sort((a, b) => Date.parse(b.updated_at ?? '0') - Date.parse(a.updated_at ?? '0'));

  return candidates[0]?.id ?? null;
}

export type ConflictSource = 'local' | 'remote' | 'none';

export interface ConflictResolution {
  /** The winning payload (null only when both sides are empty). */
  data: StreakData | null;
  source: ConflictSource;
  /** Machine-readable reason, handy for the sync indicator tooltip. */
  reason:
    | 'local-only'
    | 'remote-only'
    | 'local-newer'
    | 'remote-newer'
    | 'in-sync'
    | 'tie-remote'
    | 'remote-seeded'
    | 'local-seeded';
}

const FRESH_START_MS = 5 * 60 * 1000;

/**
 * A freshly-installed device has a default payload whose `updatedAt` is "now".
 * Timestamps alone would let that blank state overwrite a real streak, so any
 * payload with no actual usage is treated as "no data" during reconciliation.
 *
 * A run that was started seconds before connecting to the cloud also counts as
 * "no data": tapping "Start streak" and then pairing must never erase the vault
 * that already exists in the account.
 */
export function isEmptyStreakData(data: StreakData | null | undefined): boolean {
  if (!data) return true;
  if (data.history.length > 0) return false;
  if (data.urgesResisted > 0) return false;
  if (data.personalPledge.trim().length > 0) return false;
  if (!data.activeChallengeStart) return true;

  const started = Date.parse(data.activeChallengeStart);
  const updated = Date.parse(data.updatedAt);
  if (!Number.isFinite(started)) return true;
  if (!Number.isFinite(updated)) return false;
  return updated - started < FRESH_START_MS;
}

function timestampOf(data: StreakData | null | undefined): number {
  if (!data?.updatedAt) return Number.NEGATIVE_INFINITY;
  const parsed = Date.parse(data.updatedAt);
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}

/**
 * Pure last-write-wins conflict resolution.
 * - remote newer -> remote
 * - local newer -> local
 * - identical timestamps + identical payload -> none (already in sync)
 * - identical timestamps + different payload -> remote (deterministic convergence)
 */
export function resolveConflict(
  local: StreakData | null | undefined,
  remote: StreakData | null | undefined,
): ConflictResolution {
  if (!local && !remote) return { data: null, source: 'none', reason: 'in-sync' };
  if (!local) return { data: remote ?? null, source: 'remote', reason: 'remote-only' };
  if (!remote) return { data: local, source: 'local', reason: 'local-only' };

  // Never let a blank install clobber a real streak (or vice versa).
  if (isEmptyStreakData(local) && !isEmptyStreakData(remote)) {
    return { data: remote, source: 'remote', reason: 'remote-seeded' };
  }
  if (isEmptyStreakData(remote) && !isEmptyStreakData(local)) {
    return { data: local, source: 'local', reason: 'local-seeded' };
  }

  const localTs = timestampOf(local);
  const remoteTs = timestampOf(remote);

  if (localTs === remoteTs) {
    const identical = serializeForGist(local) === serializeForGist(remote);
    return identical
      ? { data: local, source: 'none', reason: 'in-sync' }
      : { data: remote, source: 'remote', reason: 'tie-remote' };
  }

  return remoteTs > localTs
    ? { data: remote, source: 'remote', reason: 'remote-newer' }
    : { data: local, source: 'local', reason: 'local-newer' };
}

export interface SyncOutcome {
  data: StreakData | null;
  /** What the engine did, so the UI can show the right indicator. */
  action: 'pulled' | 'pushed' | 'in-sync' | 'created-gist';
  reason: ConflictResolution['reason'] | 'created' | 'no-credentials';
  /**
   * The gist this device is bound to after the call. The store MUST persist it:
   * that is what makes the next sync (and the pairing QR) use the same gist.
   */
  gistId: string | null;
  /** True only when this call actually created a brand-new gist. */
  created: boolean;
}

export interface SyncOptions {
  /**
   * Only the explicit "Connect & sync" action should create a gist. Background
   * syncs never invent one, so a blank install cannot spawn a second gist.
   */
  createIfMissing?: boolean;
}

/**
 * Two-way sync engine. Stateless between calls apart from the credentials it
 * was constructed with, which makes it easy to unit test and to re-create
 * whenever the user edits their token.
 */
export class GistSyncEngine {
  private credentials: SyncCredentials | null;
  private readonly fetchImpl: FetchLike;

  constructor(credentials: SyncCredentials | null, fetchImpl?: FetchLike) {
    this.credentials = credentials && credentials.token ? credentials : null;
    this.fetchImpl = fetchImpl ?? ((...args: Parameters<FetchLike>) => fetch(...args));
  }

  get isConfigured(): boolean {
    return Boolean(this.credentials?.token);
  }

  get gistId(): string | null {
    return this.credentials?.gistId ?? null;
  }

  setCredentials(credentials: SyncCredentials | null): void {
    this.credentials = credentials && credentials.token ? credentials : null;
  }

  private requireCredentials(): SyncCredentials {
    if (!this.credentials) throw new GistApiError('No GitHub token configured', 401);
    return this.credentials;
  }

  /**
   * Guarantees this device is bound to a gist.
   * - configured id -> verify it still exists (recreate only if it was deleted)
   * - no id -> adopt the newest existing streak gist, else create a private one
   */
  async ensureGist(data: StreakData): Promise<{ gistId: string; created: boolean }> {
    const { token, gistId } = this.requireCredentials();
    if (gistId) {
      try {
        await getGist(token, gistId, this.fetchImpl);
        return { gistId, created: false };
      } catch (err) {
        if (err instanceof GistApiError && err.status === 404) {
          const gist = await createGist(token, data, this.fetchImpl);
          this.credentials = { ...this.requireCredentials(), gistId: gist.id };
          return { gistId: gist.id, created: true };
        }
        throw err;
      }
    }

    const existing = await findStreakGist(token, this.fetchImpl).catch(() => null);
    if (existing) {
      this.credentials = { ...this.requireCredentials(), gistId: existing };
      return { gistId: existing, created: false };
    }

    const gist = await createGist(token, data, this.fetchImpl);
    this.credentials = { ...this.requireCredentials(), gistId: gist.id };
    return { gistId: gist.id, created: true };
  }

  async pull(): Promise<{ data: StreakData | null; gist: GistResponse; gistId: string }> {
    const { token, gistId } = this.requireCredentials();
    if (!gistId) throw new GistApiError('No gist configured yet', 409);
    const gist = await getGist(token, gistId, this.fetchImpl);
    const data = await readGistData(gist, this.fetchImpl);
    return { data, gist, gistId };
  }

  async push(data: StreakData, options: SyncOptions = {}): Promise<{ gistId: string; gist: GistResponse }> {
    const { token } = this.requireCredentials();
    const configured = this.requireCredentials().gistId;
    if (!configured && !options.createIfMissing) {
      throw new GistApiError('No gist configured yet', 409);
    }
    const { gistId, created } = await this.ensureGist(data);
    if (created) return { gistId, gist: { id: gistId } };
    const gist = await updateGist(token, gistId, data, this.fetchImpl);
    return { gistId, gist };
  }

  /** Full two-way reconciliation used on load, on focus and after mutations. */
  async synchronize(local: StreakData, options: SyncOptions = {}): Promise<SyncOutcome> {
    if (!this.credentials?.token) {
      return { data: local, action: 'in-sync', reason: 'no-credentials', gistId: null, created: false };
    }

    // Never silently mint a new gist from a background sync: that would fork
    // the account into two gists that can never converge.
    let created = false;
    if (!this.credentials.gistId) {
      if (!options.createIfMissing) throw new GistApiError('No gist configured yet', 409);
      const ensured = await this.ensureGist(local);
      this.credentials = { ...this.credentials, gistId: ensured.gistId };
      created = ensured.created;
    }

    let remote: StreakData | null;
    try {
      remote = (await this.pull()).data;
    } catch (err) {
      if (err instanceof GistApiError && err.status === 404) {
        // The gist was deleted on GitHub: recreate one and seed it locally.
        const { gistId, created: recreated } = await this.ensureGist(local);
        this.credentials = { ...this.requireCredentials(), gistId };
        return { data: local, action: 'created-gist', reason: 'created', gistId: this.credentials.gistId, created: recreated };
      }
      throw err;
    }

    const gistId = this.credentials.gistId;
    const resolution = resolveConflict(local, remote);

    if (resolution.source === 'remote' && resolution.data) {
      return { data: resolution.data, action: 'pulled', reason: resolution.reason, gistId, created };
    }

    if (resolution.source === 'local' && resolution.data) {
      await updateGist(this.requireCredentials().token, this.requireCredentials().gistId as string, resolution.data, this.fetchImpl);
      return { data: resolution.data, action: 'pushed', reason: resolution.reason, gistId, created };
    }

    if (resolution.source === 'none' && !remote) {
      // Gist exists but has no payload yet: seed it.
      await updateGist(this.requireCredentials().token, this.requireCredentials().gistId as string, local, this.fetchImpl);
      return { data: local, action: 'pushed', reason: 'local-only', gistId, created };
    }

    return { data: resolution.data ?? local, action: 'in-sync', reason: resolution.reason, gistId, created };
  }
}

export { describeError };
export type { FetchLike };
