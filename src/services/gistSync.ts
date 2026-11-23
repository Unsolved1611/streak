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

/**
 * A freshly-installed device has a default payload whose `updatedAt` is "now".
 * Timestamps alone would let that blank state overwrite a real streak, so a
 * payload with no actual usage is treated as "no data" during reconciliation.
 */
export function isEmptyStreakData(data: StreakData | null | undefined): boolean {
  if (!data) return true;
  return (
    !data.activeChallengeStart &&
    data.history.length === 0 &&
    data.urgesResisted === 0 &&
    data.personalPledge.trim().length === 0
  );
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
   * Guarantees a gist exists. When the user supplied a Gist ID we trust it and
   * only create one when the ID is missing (or points at a deleted gist).
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
          return { gistId: gist.id, created: true };
        }
        throw err;
      }
    }
    const gist = await createGist(token, data, this.fetchImpl);
    return { gistId: gist.id, created: true };
  }

  async pull(): Promise<{ data: StreakData | null; gist: GistResponse; gistId: string }> {
    const { token, gistId } = this.requireCredentials();
    if (!gistId) throw new GistApiError('No gist id configured', 404);
    const gist = await getGist(token, gistId, this.fetchImpl);
    const data = await readGistData(gist, this.fetchImpl);
    return { data, gist, gistId };
  }

  async push(data: StreakData): Promise<{ gistId: string; gist: GistResponse }> {
    const { token } = this.requireCredentials();
    const { gistId, created } = await this.ensureGist(data);
    if (created) return { gistId, gist: { id: gistId } };
    const gist = await updateGist(token, gistId, data, this.fetchImpl);
    return { gistId, gist };
  }

  /** Full two-way reconciliation used on load, on focus and after mutations. */
  async synchronize(local: StreakData): Promise<SyncOutcome> {
    if (!this.credentials) return { data: local, action: 'in-sync', reason: 'no-credentials' };

    let remote: StreakData | null;
    try {
      const pulled = await this.pull();
      remote = pulled.data;
    } catch (err) {
      if (err instanceof GistApiError && err.status === 404) {
        const { gistId } = await this.ensureGist(local);
        this.credentials = { ...this.credentials, gistId };
        return { data: local, action: 'created-gist', reason: 'created' };
      }
      throw err;
    }

    const resolution = resolveConflict(local, remote);

    if (resolution.source === 'remote' && resolution.data) {
      return { data: resolution.data, action: 'pulled', reason: resolution.reason };
    }
    if (resolution.source === 'local' && resolution.data) {
      await updateGist(this.requireCredentials().token, this.requireCredentials().gistId as string, resolution.data, this.fetchImpl);
      return { data: resolution.data, action: 'pushed', reason: resolution.reason };
    }
    if (resolution.source === 'none' && !remote) {
      // Gist exists but has no payload yet: seed it.
      await updateGist(this.requireCredentials().token, this.requireCredentials().gistId as string, local, this.fetchImpl);
      return { data: local, action: 'pushed', reason: 'local-only' };
    }
    return { data: resolution.data ?? local, action: 'in-sync', reason: resolution.reason };
  }
}

export { describeError };
export type { FetchLike };
