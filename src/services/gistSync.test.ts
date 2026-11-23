import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultData, type StreakData } from '../types/streak';
import {
  GIST_FILE_NAME,
  GistApiError,
  GistSyncEngine,
  createGist,
  getGist,
  isEmptyStreakData,
  readGistData,
  resolveConflict,
  updateGist,
} from './gistSync';

function makeData(updatedAt: string, overrides: Partial<StreakData> = {}): StreakData {
  return {
    ...createDefaultData(new Date('2026-01-01T00:00:00.000Z')),
    updatedAt,
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function gistWith(data: StreakData, id = 'gist-123'): Response {
  return jsonResponse({
    id,
    public: false,
    updated_at: data.updatedAt,
    files: { [GIST_FILE_NAME]: { filename: GIST_FILE_NAME, content: JSON.stringify(data) } },
  });
}

const LOCAL = makeData('2026-02-01T10:00:00.000Z', { urgesResisted: 3, personalPledge: 'local pledge' });
const REMOTE = makeData('2026-02-01T12:00:00.000Z', { urgesResisted: 9, personalPledge: 'remote pledge' });

describe('resolveConflict (last-write-wins by updatedAt)', () => {
  it('keeps local when the local timestamp is newer', () => {
    const result = resolveConflict(REMOTE, LOCAL);
    expect(result.source).toBe('local');
    expect(result.reason).toBe('local-newer');
    expect(result.data?.updatedAt).toBe(REMOTE.updatedAt);
  });

  it('adopts remote when the remote timestamp is newer', () => {
    const result = resolveConflict(LOCAL, REMOTE);
    expect(result.source).toBe('remote');
    expect(result.reason).toBe('remote-newer');
    expect(result.data?.urgesResisted).toBe(9);
    expect(result.data?.personalPledge).toBe('remote pledge');
  });

  it('handles a missing side explicitly', () => {
    expect(resolveConflict(null, REMOTE)).toMatchObject({ source: 'remote', reason: 'remote-only' });
    expect(resolveConflict(LOCAL, null)).toMatchObject({ source: 'local', reason: 'local-only' });
    expect(resolveConflict(null, null)).toMatchObject({ source: 'none', data: null });
  });

  it('treats an identical payload on both sides as in sync', () => {
    const clone: StreakData = JSON.parse(JSON.stringify(LOCAL)) as StreakData;
    const result = resolveConflict(LOCAL, clone);
    expect(result.source).toBe('none');
    expect(result.reason).toBe('in-sync');
  });

  it('breaks timestamp ties toward remote so devices converge', () => {
    const sameStamp = makeData(LOCAL.updatedAt, { urgesResisted: 42 });
    const result = resolveConflict(LOCAL, sameStamp);
    expect(result.source).toBe('remote');
    expect(result.reason).toBe('tie-remote');
    expect(result.data?.urgesResisted).toBe(42);
  });

  it('prefers the valid side when a timestamp is corrupt', () => {
    const corrupt = { ...LOCAL, updatedAt: 'not-a-date' };
    const result = resolveConflict(corrupt, REMOTE);
    expect(result.source).toBe('remote');
  });

  it('never lets a blank fresh install clobber a real remote streak', () => {
    const blank = makeData('2026-06-01T00:00:00.000Z'); // newest timestamp, zero content
    const result = resolveConflict(blank, REMOTE);
    expect(result.source).toBe('remote');
    expect(result.reason).toBe('remote-seeded');
  });

  it('never lets an empty gist wipe real local progress', () => {
    const blank = makeData('2026-06-01T00:00:00.000Z');
    const result = resolveConflict(LOCAL, blank);
    expect(result.source).toBe('local');
    expect(result.reason).toBe('local-seeded');
  });

  it('detects blank payloads', () => {
    expect(isEmptyStreakData(makeData('2026-01-01T00:00:00.000Z'))).toBe(true);
    expect(isEmptyStreakData(LOCAL)).toBe(false);
    expect(isEmptyStreakData({ ...makeData('2026-01-01T00:00:00.000Z'), personalPledge: 'x' })).toBe(false);
    expect(isEmptyStreakData(null)).toBe(true);
  });

  it('compares timestamps chronologically, not lexicographically by accident', () => {
    const older = makeData('2026-02-01T09:00:00.000Z');
    const newer = makeData('2026-02-01T10:00:00.000Z');
    expect(resolveConflict(older, newer).source).toBe('remote');
    expect(resolveConflict(newer, older).source).toBe('local');
  });
});

describe('GitHub REST calls (CORS-safe)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('GETs with cache: no-store so streak data is never stale', async () => {
    const fetchMock = vi.fn(async () => gistWith(LOCAL));
    await getGist('token-abc', 'gist-1', fetchMock as unknown as typeof fetch);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/gists/gist-1');
    expect(init.cache).toBe('no-store');
    expect(init.method).toBe('GET');
  });

  it("PATCHes with an UPPERCASE method to avoid preflight failures", async () => {
    const fetchMock = vi.fn(async () => gistWith(LOCAL));
    await updateGist('token-abc', 'gist-1', LOCAL, fetchMock as unknown as typeof fetch);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/gists/gist-1');
    expect(init.method).toBe('PATCH');
    expect(init.method).not.toBe('patch');
    expect(String(init.method)).toBe('PATCH');
    const body = JSON.parse(String(init.body)) as { files: Record<string, { content: string }> };
    expect(Object.keys(body.files)).toEqual([GIST_FILE_NAME]);
    expect(JSON.parse(body.files[GIST_FILE_NAME].content).urgesResisted).toBe(LOCAL.urgesResisted);
  });

  it('creates PRIVATE gists only', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ id: 'new-gist', public: false }));
    await createGist('token-abc', LOCAL, fetchMock as unknown as typeof fetch);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url.endsWith('/gists')).toBe(true);
    expect(init.method).toBe('POST');
    const body = JSON.parse(String(init.body)) as { public: boolean; files: Record<string, unknown> };
    expect(body.public).toBe(false);
    expect(body.files).toHaveProperty(GIST_FILE_NAME);
  });

  it('never sends the token in the body or URL', async () => {
    const fetchMock = vi.fn(async () => gistWith(LOCAL));
    await updateGist('secret-token', 'gist-1', LOCAL, fetchMock as unknown as typeof fetch);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).not.toContain('secret-token');
    expect(String(init.body)).not.toContain('secret-token');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer secret-token');
  });

  it('surfaces API failures as typed errors', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ message: 'Bad credentials' }, 401));
    await expect(getGist('bad', 'gist-1', fetchMock as unknown as typeof fetch)).rejects.toBeInstanceOf(GistApiError);
  });
});

describe('readGistData', () => {
  it('parses the streak file', async () => {
    const gist = await gistWith(REMOTE).json();
    const data = await readGistData(gist);
    expect(data?.personalPledge).toBe('remote pledge');
  });

  it('returns null when the file is missing or corrupt', async () => {
    expect(await readGistData({ id: 'x', files: {} })).toBeNull();
    expect(
      await readGistData({ id: 'x', files: { [GIST_FILE_NAME]: { filename: GIST_FILE_NAME, content: '{oops' } } }),
    ).toBeNull();
  });

  it('follows raw_url for truncated files', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(REMOTE), { status: 200 }));
    const data = await readGistData(
      { id: 'x', files: { [GIST_FILE_NAME]: { truncated: true, raw_url: 'https://raw.example/x' } } },
      fetchMock as unknown as typeof fetch,
    );
    expect(data?.urgesResisted).toBe(9);
    expect((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].cache).toBe('no-store');
  });
});

describe('GistSyncEngine', () => {
  it('pulls remote when remote is newer', async () => {
    const fetchMock = vi.fn(async () => gistWith(REMOTE));
    const engine = new GistSyncEngine({ token: 't', gistId: 'gist-1' }, fetchMock as unknown as typeof fetch);

    const outcome = await engine.synchronize(LOCAL);
    expect(outcome.action).toBe('pulled');
    expect(outcome.data?.updatedAt).toBe(REMOTE.updatedAt);
    // only the GET should have happened
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('pushes local when local is newer', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) =>
      init?.method === 'PATCH' ? gistWith(LOCAL) : gistWith(REMOTE),
    );
    const engine = new GistSyncEngine({ token: 't', gistId: 'gist-1' }, fetchMock as unknown as typeof fetch);

    const outcome = await engine.synchronize(makeData('2026-03-01T00:00:00.000Z', { personalPledge: 'newest' }));
    expect(outcome.action).toBe('pushed');
    const patchCalls = fetchMock.mock.calls.filter(([, init]) => init?.method === 'PATCH');
    expect(patchCalls).toHaveLength(1);
  });

  it('stays in sync when both sides match', async () => {
    const fetchMock = vi.fn(async () => gistWith(LOCAL));
    const engine = new GistSyncEngine({ token: 't', gistId: 'gist-1' }, fetchMock as unknown as typeof fetch);
    const outcome = await engine.synchronize(JSON.parse(JSON.stringify(LOCAL)) as StreakData);
    expect(outcome.action).toBe('in-sync');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('creates a private gist when none is configured, then reports its id', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ id: 'brand-new', public: false }));
    const engine = new GistSyncEngine({ token: 't', gistId: null }, fetchMock as unknown as typeof fetch);

    const outcome = await engine.synchronize(LOCAL);
    expect(outcome.action).toBe('created-gist');
    expect(engine.gistId).toBe('brand-new');
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body)).public).toBe(false);
  });

  it('recovers from a deleted gist by creating a fresh one', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) =>
      init?.method === 'POST' ? jsonResponse({ id: 'replacement' }) : jsonResponse({ message: 'Not Found' }, 404),
    );
    const engine = new GistSyncEngine({ token: 't', gistId: 'deleted' }, fetchMock as unknown as typeof fetch);

    const outcome = await engine.synchronize(LOCAL);
    expect(outcome.action).toBe('created-gist');
    expect(engine.gistId).toBe('replacement');
  });

  it('reports no-credentials without touching the network', async () => {
    const fetchMock = vi.fn();
    const engine = new GistSyncEngine(null, fetchMock as unknown as typeof fetch);
    const outcome = await engine.synchronize(LOCAL);
    expect(outcome.action).toBe('in-sync');
    expect(outcome.reason).toBe('no-credentials');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
