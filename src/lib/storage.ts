/**
 * localStorage is the instant, offline-first cache. Everything here is
 * defensive: a corrupt blob must never brick the app, and a malformed import
 * must be rejected instead of silently wiping a real streak.
 */

import {
  createDefaultData,
  STREAK_DATA_VERSION,
  type HistoryEntry,
  type Language,
  type StreakData,
  type StreakPreferences,
  type SyncCredentials,
} from '../types/streak';

export const STORAGE_KEYS = {
  data: 'vault.data.v1',
  credentials: 'vault.credentials.v1',
  onboarded: 'vault.onboarded.v1',
  lastSync: 'vault.lastSync.v1',
} as const;

const memoryFallback = new Map<string, string>();
let warned = false;

function storageAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const probe = '__vault_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

function readRaw(key: string): string | null {
  try {
    if (storageAvailable()) return window.localStorage.getItem(key);
  } catch {
    /* fall through */
  }
  return memoryFallback.get(key) ?? null;
}

function writeRaw(key: string, value: string): void {
  memoryFallback.set(key, value);
  try {
    if (!storageAvailable()) {
      if (!warned) {
        warned = true;
        console.warn('[vault] localStorage unavailable — using in-memory fallback.');
      }
      return;
    }
    window.localStorage.setItem(key, value);
  } catch (err) {
    console.warn('[vault] could not persist to localStorage', err);
  }
}

function removeRaw(key: string): void {
  memoryFallback.delete(key);
  try {
    if (storageAvailable()) window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function coerceLanguage(value: unknown, fallback: Language): Language {
  return value === 'es' || value === 'en' ? value : fallback;
}

function sanitizePreferences(value: unknown, fallback: StreakPreferences): StreakPreferences {
  if (!isObject(value)) return fallback;
  return {
    language: coerceLanguage(value.language, fallback.language),
    discreetMode: typeof value.discreetMode === 'boolean' ? value.discreetMode : fallback.discreetMode,
    customTitle: typeof value.customTitle === 'string' ? value.customTitle.slice(0, 48) : fallback.customTitle,
  };
}

function sanitizeHistoryEntry(value: unknown): HistoryEntry | null {
  if (!isObject(value)) return null;
  const { id, startedAt, endedAt, durationSeconds, maxTierId, note } = value;
  if (typeof startedAt !== 'string' || Number.isNaN(Date.parse(startedAt))) return null;
  if (typeof endedAt !== 'string' || Number.isNaN(Date.parse(endedAt))) return null;
  return {
    id: typeof id === 'string' && id.length > 0 ? id : `run-${Date.parse(startedAt)}`,
    startedAt,
    endedAt,
    durationSeconds:
      typeof durationSeconds === 'number' && Number.isFinite(durationSeconds) && durationSeconds >= 0
        ? Math.floor(durationSeconds)
        : Math.max(0, Math.floor((Date.parse(endedAt) - Date.parse(startedAt)) / 1000)),
    maxTierId: typeof maxTierId === 'string' && maxTierId.length > 0 ? maxTierId : 'raw-ember',
    ...(typeof note === 'string' && note.trim().length > 0 ? { note: note.slice(0, 2000) } : {}),
  };
}

/**
 * Validate + normalise any unknown payload into StreakData.
 * Returns null when the payload is not recognisably streak data at all.
 */
export function sanitizeData(input: unknown, now: Date = new Date()): StreakData | null {
  if (!isObject(input)) return null;
  const defaults = createDefaultData(now);

  const hasAnySignal =
    'activeChallengeStart' in input ||
    'history' in input ||
    'urgesResisted' in input ||
    'personalPledge' in input ||
    'preferences' in input ||
    typeof input.version === 'number';
  if (!hasAnySignal) return null;

  const activeStart =
    typeof input.activeChallengeStart === 'string' && !Number.isNaN(Date.parse(input.activeChallengeStart))
      ? new Date(input.activeChallengeStart).toISOString()
      : null;

  const updatedAt =
    typeof input.updatedAt === 'string' && !Number.isNaN(Date.parse(input.updatedAt))
      ? new Date(input.updatedAt).toISOString()
      : defaults.updatedAt;

  const history = Array.isArray(input.history)
    ? (input.history.map(sanitizeHistoryEntry).filter(Boolean) as HistoryEntry[])
    : [];

  return {
    version: typeof input.version === 'number' && input.version > 0 ? input.version : STREAK_DATA_VERSION,
    updatedAt,
    activeChallengeStart: activeStart,
    urgesResisted:
      typeof input.urgesResisted === 'number' && Number.isFinite(input.urgesResisted) && input.urgesResisted >= 0
        ? Math.floor(input.urgesResisted)
        : 0,
    personalPledge: typeof input.personalPledge === 'string' ? input.personalPledge.slice(0, 2000) : '',
    history,
    preferences: sanitizePreferences(input.preferences, defaults.preferences),
  };
}

export function loadData(): StreakData | null {
  const raw = readRaw(STORAGE_KEYS.data);
  if (!raw) return null;
  try {
    return sanitizeData(JSON.parse(raw));
  } catch {
    console.warn('[vault] corrupt local data — ignoring.');
    return null;
  }
}

export function saveData(data: StreakData): void {
  writeRaw(STORAGE_KEYS.data, JSON.stringify(data));
}

export function loadCredentials(): SyncCredentials | null {
  const raw = readRaw(STORAGE_KEYS.credentials);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isObject(parsed) || typeof parsed.token !== 'string' || parsed.token.trim().length === 0) return null;
    return {
      token: parsed.token.trim(),
      gistId: typeof parsed.gistId === 'string' && parsed.gistId.length > 0 ? parsed.gistId : null,
    };
  } catch {
    return null;
  }
}

export function saveCredentials(credentials: SyncCredentials | null): void {
  if (!credentials) {
    removeRaw(STORAGE_KEYS.credentials);
    return;
  }
  writeRaw(
    STORAGE_KEYS.credentials,
    JSON.stringify({ token: credentials.token, gistId: credentials.gistId ?? null }),
  );
}

export function loadOnboarded(): boolean {
  return readRaw(STORAGE_KEYS.onboarded) === '1';
}

export function saveOnboarded(value: boolean): void {
  if (value) writeRaw(STORAGE_KEYS.onboarded, '1');
  else removeRaw(STORAGE_KEYS.onboarded);
}

export function loadLastSync(): string | null {
  const raw = readRaw(STORAGE_KEYS.lastSync);
  return raw && !Number.isNaN(Date.parse(raw)) ? raw : null;
}

export function saveLastSync(iso: string): void {
  writeRaw(STORAGE_KEYS.lastSync, iso);
}

export function clearAllLocal(): void {
  Object.values(STORAGE_KEYS).forEach(removeRaw);
  try {
    if (storageAvailable()) window.localStorage.clear();
  } catch {
    /* ignore */
  }
}

/** Pretty JSON string used by Export and by the Gist payload. */
export function serializeData(data: StreakData): string {
  return JSON.stringify(data, null, 2);
}

/** Parse an exported backup file. Throws a readable error on invalid content. */
export function parseImportedJson(text: string): StreakData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('invalid-json');
  }
  const data = sanitizeData(parsed);
  if (!data) throw new Error('invalid-shape');
  return data;
}

export function downloadBackup(data: StreakData): void {
  const blob = new Blob([serializeData(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `vault-backup-${stamp}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
