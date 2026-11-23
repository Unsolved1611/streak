import { describe, expect, it } from 'vitest';
import { PAIR_KEY, buildPairUrl, decodePairPayload, encodePairPayload, readPairFromHash, stripPairHash } from './pairing';

const CREDS = { token: 'github_pat_abc123', gistId: 'abc456' };

describe('pairing payload', () => {
  it('round-trips credentials through base64', () => {
    const encoded = encodePairPayload(CREDS);
    expect(decodePairPayload(encoded)).toEqual(CREDS);
    expect(encoded).not.toContain('github_pat_abc123');
  });

  it('builds the documented hash URL shape', () => {
    const url = buildPairUrl('https://user.github.io', '/vault/', CREDS);
    expect(url.startsWith('https://user.github.io/vault/#pair=')).toBe(true);
    expect(readPairFromHash(new URL(url).hash)).toEqual(CREDS);
  });

  it('rejects malformed payloads without throwing', () => {
    expect(decodePairPayload('!!!')).toBeNull();
    expect(readPairFromHash('#pair=')).toBeNull();
    expect(readPairFromHash('#other=1')).toBeNull();
    expect(readPairFromHash('')).toBeNull();
    const noToken = encodePairPayload({ token: '', gistId: null });
    expect(decodePairPayload(noToken)).toBeNull();
  });

  it('treats a missing gistId as null (fresh gist on the new device)', () => {
    expect(decodePairPayload(encodePairPayload({ token: 'tok', gistId: null }))).toEqual({ token: 'tok', gistId: null });
  });
});

describe('stripPairHash', () => {
  it('removes the hash and keeps path + query', () => {
    let replacedWith: string | null = null;
    const win = {
      location: { hash: '#pair=abc', pathname: '/vault/', search: '?x=1' },
      history: {
        replaceState: (_state: unknown, _title: string, url?: string | URL | null) => {
          replacedWith = typeof url === 'string' ? url : null;
        },
      },
    } as unknown as Pick<Window, 'location' | 'history'>;

    expect(stripPairHash(win)).toBe(true);
    expect(replacedWith).toBe('/vault/?x=1');
  });

  it('does nothing when there is no pairing hash', () => {
    const win = {
      location: { hash: '#section', pathname: '/', search: '' },
      history: { replaceState: () => undefined },
    } as unknown as Pick<Window, 'location' | 'history'>;
    expect(stripPairHash(win)).toBe(false);
  });
});

describe('sanity', () => {
  it('exports the documented key', () => {
    expect(PAIR_KEY).toBe('pair');
  });
});
