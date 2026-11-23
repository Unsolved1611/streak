/**
 * One-scan mobile pairing.
 *
 * The QR code encodes `${origin}${pathname}#pair=<base64 {token,gistId}>`.
 * The hash is never sent to a server and is stripped from the URL immediately
 * after it is read, so the credential does not linger in history or screenshots.
 */

import type { SyncCredentials } from '../types/streak';

export const PAIR_KEY = 'pair';

function toBase64(value: string): string {
  if (typeof btoa === 'function') {
    return btoa(unescape(encodeURIComponent(value)));
  }
  // Node/test fallback.
  return Buffer.from(value, 'utf-8').toString('base64');
}

function fromBase64(value: string): string {
  if (typeof atob === 'function') {
    return decodeURIComponent(escape(atob(value)));
  }
  return Buffer.from(value, 'base64').toString('utf-8');
}

export function encodePairPayload(credentials: SyncCredentials): string {
  return toBase64(JSON.stringify({ token: credentials.token, gistId: credentials.gistId ?? null }));
}

export function decodePairPayload(payload: string): SyncCredentials | null {
  try {
    const decoded = decodeURIComponent(payload.trim());
    const parsed: unknown = JSON.parse(fromBase64(decoded));
    if (typeof parsed !== 'object' || parsed === null) return null;
    const record = parsed as Record<string, unknown>;
    if (typeof record.token !== 'string' || record.token.trim().length === 0) return null;
    return {
      token: record.token.trim(),
      gistId: typeof record.gistId === 'string' && record.gistId.length > 0 ? record.gistId : null,
    };
  } catch {
    return null;
  }
}

/** Builds the full pairing URL to encode into the QR code. */
export function buildPairUrl(origin: string, pathname: string, credentials: SyncCredentials): string {
  return `${origin}${pathname}#${PAIR_KEY}=${encodePairPayload(credentials)}`;
}

/** Extract credentials from a `#pair=...` hash, or null when absent/invalid. */
export function readPairFromHash(hash: string): SyncCredentials | null {
  if (!hash) return null;
  const clean = hash.startsWith('#') ? hash.slice(1) : hash;
  const prefix = `${PAIR_KEY}=`;
  if (!clean.startsWith(prefix)) return null;
  const payload = clean.slice(prefix.length);
  if (!payload) return null;
  return decodePairPayload(payload);
}

/**
 * Removes the pairing hash from the address bar without adding a history entry.
 * Safe to call when there is nothing to strip.
 */
export function stripPairHash(win: Pick<Window, 'location' | 'history'> = window): boolean {
  try {
    const { hash, pathname, search } = win.location;
    if (!hash || !hash.includes(`${PAIR_KEY}=`)) return false;
    win.history.replaceState(null, '', pathname + search);
    return true;
  } catch {
    return false;
  }
}
