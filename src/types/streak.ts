/**
 * Canonical data model for the streak tracker.
 *
 * This exact shape is what gets persisted to `localStorage` and pushed to the
 * private GitHub Gist as `streak-data.json`, so treat it as a public contract:
 * additive changes are fine, breaking changes require bumping `version` and a
 * migration in `sanitizeData()` (see `src/lib/storage.ts`).
 */

export type Language = 'es' | 'en';

export interface StreakPreferences {
  language: Language;
  discreetMode: boolean;
  customTitle: string;
}

export interface HistoryEntry {
  id: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  maxTierId: string;
  note?: string;
}

export interface StreakData {
  version: number;
  updatedAt: string;
  activeChallengeStart: string | null;
  urgesResisted: number;
  personalPledge: string;
  history: HistoryEntry[];
  preferences: StreakPreferences;
}

/** Credentials live ONLY in localStorage — never in source code or the data blob. */
export interface SyncCredentials {
  token: string;
  gistId: string | null;
}

export type SyncStatus = 'local' | 'idle' | 'syncing' | 'synced' | 'error';

export const STREAK_DATA_VERSION = 1;

export const DEFAULT_TITLE = 'The Vault';

export function detectLanguage(): Language {
  if (typeof navigator !== 'undefined') {
    const lang = (navigator.languages?.[0] ?? navigator.language ?? '').toLowerCase();
    if (lang.startsWith('es')) return 'es';
  }
  return 'en';
}

export function createDefaultData(now: Date = new Date()): StreakData {
  return {
    version: STREAK_DATA_VERSION,
    updatedAt: now.toISOString(),
    activeChallengeStart: null,
    urgesResisted: 0,
    personalPledge: '',
    history: [],
    preferences: {
      language: detectLanguage(),
      discreetMode: false,
      customTitle: DEFAULT_TITLE,
    },
  };
}
