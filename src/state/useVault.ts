/**
 * The single source of truth for the app.
 *
 * Responsibilities:
 * - hydrate instantly from localStorage (offline-first),
 * - expose loss-aversion mutations (start / resist / archive-reset),
 * - orchestrate the Gist sync engine: pull on load & on focus, push after
 *   every mutation, with a live status for the indicator.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { readPairFromHash, stripPairHash } from '../lib/pairing';
import { clearAllLocal, loadCredentials, loadData, loadLastSync, loadOnboarded, saveCredentials, saveData, saveLastSync, saveOnboarded } from '../lib/storage';
import { elapsedSeconds, isoNow } from '../lib/time';
import { getTierForElapsed } from '../lib/tiers';
import { describeError, GistSyncEngine } from '../services/gistSync';
import {
  createDefaultData,
  type HistoryEntry,
  type StreakData,
  type StreakPreferences,
  type SyncCredentials,
  type SyncStatus,
} from '../types/streak';
import type { TKey } from '../i18n/translations';

export interface ToastMessage {
  id: number;
  key: TKey;
  vars?: Record<string, string | number>;
}

export interface VaultStore {
  data: StreakData;
  credentials: SyncCredentials | null;
  syncStatus: SyncStatus;
  syncError: string | null;
  lastSync: string | null;
  onboarded: boolean;
  needsOnboarding: boolean;
  hydrated: boolean;
  toast: ToastMessage | null;
  notify: (key: TKey, vars?: Record<string, string | number>) => void;
  dismissToast: () => void;
  startChallenge: () => void;
  resistUrge: () => void;
  resetChallenge: (note?: string, restart?: boolean) => void;
  clearHistory: () => void;
  updatePreferences: (patch: Partial<StreakPreferences>) => void;
  setPledge: (pledge: string) => void;
  completeOnboarding: (opts: { pledge: string; title: string; discreet: boolean; start: boolean }) => void;
  importData: (data: StreakData) => void;
  connectCloud: (credentials: SyncCredentials) => Promise<boolean>;
  disconnectCloud: () => void;
  syncNow: () => Promise<boolean>;
  wipeLocal: () => void;
}

type SyncReason = 'init' | 'mutation' | 'focus' | 'manual';

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Monotonic timestamp so a device with a slow clock can never be overwritten. */
function nextUpdatedAt(previous: string): string {
  const prev = Date.parse(previous);
  const now = Date.now();
  return new Date(Number.isNaN(prev) ? now : Math.max(now, prev + 1000)).toISOString();
}

export function useVault(): VaultStore {
  const [data, setData] = useState<StreakData>(() => loadData() ?? createDefaultData());
  const [credentials, setCredentials] = useState<SyncCredentials | null>(() => loadCredentials());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => (loadCredentials() ? 'idle' : 'local'));
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(() => loadLastSync());
  const [onboarded, setOnboarded] = useState<boolean>(() => loadOnboarded());
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const dataRef = useRef<StreakData>(data);
  const credentialsRef = useRef<SyncCredentials | null>(credentials);
  const engineRef = useRef<GistSyncEngine | null>(null);
  const syncingRef = useRef(false);
  const pendingRef = useRef(false);
  const pushTimerRef = useRef<number | null>(null);
  const lastAttemptRef = useRef(0);
  const syncRef = useRef<(reason: SyncReason) => Promise<boolean>>(async () => false);

  const notify = useCallback((key: TKey, vars?: Record<string, string | number>) => {
    setToast({ id: Date.now() + Math.random(), key, vars });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  const engine = useCallback((): GistSyncEngine => {
    if (!engineRef.current) engineRef.current = new GistSyncEngine(credentialsRef.current);
    engineRef.current.setCredentials(credentialsRef.current);
    return engineRef.current;
  }, []);

  /** Pull + resolve + push-if-needed. Prevents overlapping runs. */
  const performSync = useCallback(
    async (reason: SyncReason): Promise<boolean> => {
      const creds = credentialsRef.current;
      if (!creds?.token) {
        setSyncStatus('local');
        return false;
      }
      if (syncingRef.current) {
        pendingRef.current = true;
        return false;
      }
      if (reason !== 'manual' && typeof navigator !== 'undefined' && navigator.onLine === false) {
        setSyncStatus('local');
        return false;
      }

      syncingRef.current = true;
      setSyncStatus('syncing');
      try {
        const result = await engine().synchronize(dataRef.current);

        if (result.action === 'pulled' && result.data) {
          dataRef.current = result.data;
          setData(result.data);
          saveData(result.data);
        }

        const gistId = engine().gistId;
        if (gistId && gistId !== credentialsRef.current?.gistId) {
          const next: SyncCredentials = { token: credentialsRef.current!.token, gistId };
          credentialsRef.current = next;
          saveCredentials(next);
          setCredentials(next);
          if (result.action === 'created-gist') notify('toast.gistCreated');
        }

        const stamp = isoNow();
        saveLastSync(stamp);
        setLastSync(stamp);
        setSyncError(null);
        setSyncStatus('synced');
        return true;
      } catch (err) {
        setSyncStatus('error');
        setSyncError(describeError(err));
        return false;
      } finally {
        syncingRef.current = false;
        if (pendingRef.current) {
          pendingRef.current = false;
          window.setTimeout(() => void syncRef.current('mutation'), 120);
        }
      }
    },
    [engine, notify],
  );

  useEffect(() => {
    syncRef.current = performSync;
  }, [performSync]);

  const schedulePush = useCallback(() => {
    if (!credentialsRef.current) {
      setSyncStatus('local');
      return;
    }
    if (pushTimerRef.current) window.clearTimeout(pushTimerRef.current);
    pushTimerRef.current = window.setTimeout(() => {
      pushTimerRef.current = null;
      void syncRef.current('mutation');
    }, 900);
  }, []);

  const commit = useCallback(
    (updater: (prev: StreakData) => StreakData, opts: { push?: boolean } = {}) => {
      const previous = dataRef.current;
      const next = updater(previous);
      const stamped: StreakData = { ...next, updatedAt: nextUpdatedAt(previous.updatedAt) };
      dataRef.current = stamped;
      setData(stamped);
      saveData(stamped);
      if (opts.push !== false) schedulePush();
    },
    [schedulePush],
  );

  // --- boot: pairing hash + first sync ---------------------------------------
  useEffect(() => {
    let cancelled = false;

    const pair = typeof window !== 'undefined' ? readPairFromHash(window.location.hash) : null;
    if (pair) {
      stripPairHash();
      credentialsRef.current = pair;
      saveCredentials(pair);
      setCredentials(pair);
      notify('toast.paired');
    } else if (typeof window !== 'undefined') {
      stripPairHash();
    }

    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setHydrated(true);
      const active = credentialsRef.current;
      if (active?.token) void syncRef.current('init');
    }, pair ? 400 : 150);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [notify]);

  // --- pull on focus / visibility / reconnect --------------------------------
  useEffect(() => {
    const maybeSync = () => {
      if (!credentialsRef.current?.token) return;
      if (document.visibilityState === 'hidden') return;
      const since = Date.now() - lastAttemptRef.current;
      if (since < 2500) return;
      lastAttemptRef.current = Date.now();
      void syncRef.current('focus');
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') maybeSync();
    };

    window.addEventListener('focus', maybeSync);
    window.addEventListener('online', maybeSync);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', maybeSync);
      window.removeEventListener('online', maybeSync);
      document.removeEventListener('visibilitychange', onVisibility);
      if (pushTimerRef.current) window.clearTimeout(pushTimerRef.current);
    };
  }, []);

  const startChallenge = useCallback(() => {
    commit((prev) => ({ ...prev, activeChallengeStart: isoNow() }));
  }, [commit]);

  const resistUrge = useCallback(() => {
    commit((prev) => ({ ...prev, urgesResisted: prev.urgesResisted + 1 }));
  }, [commit]);

  const resetChallenge = useCallback(
    (note?: string, restart = true) => {
      const endedAt = isoNow();
      commit((prev) => {
        if (!prev.activeChallengeStart) return prev;
        const durationSeconds = elapsedSeconds(prev.activeChallengeStart, Date.now());
        const entry: HistoryEntry = {
          id: makeId(),
          startedAt: prev.activeChallengeStart,
          endedAt,
          durationSeconds,
          maxTierId: getTierForElapsed(durationSeconds).id,
          ...(note && note.trim() ? { note: note.trim().slice(0, 2000) } : {}),
        };
        return {
          ...prev,
          activeChallengeStart: restart ? endedAt : null,
          history: [entry, ...prev.history],
        };
      });
    },
    [commit],
  );

  const clearHistory = useCallback(() => {
    commit((prev) => ({ ...prev, history: [] }));
  }, [commit]);

  const updatePreferences = useCallback(
    (patch: Partial<StreakPreferences>) => {
      commit((prev) => ({ ...prev, preferences: { ...prev.preferences, ...patch } }));
    },
    [commit],
  );

  const setPledge = useCallback(
    (pledge: string) => {
      commit((prev) => ({ ...prev, personalPledge: pledge.slice(0, 2000) }));
    },
    [commit],
  );

  const completeOnboarding = useCallback(
    (opts: { pledge: string; title: string; discreet: boolean; start: boolean }) => {
      commit((prev) => ({
        ...prev,
        personalPledge: opts.pledge.slice(0, 2000),
        activeChallengeStart: opts.start ? prev.activeChallengeStart ?? isoNow() : prev.activeChallengeStart,
        preferences: {
          ...prev.preferences,
          customTitle: opts.title.trim().slice(0, 48) || prev.preferences.customTitle,
          discreetMode: opts.discreet,
        },
      }));
      saveOnboarded(true);
      setOnboarded(true);
    },
    [commit],
  );

  const importData = useCallback(
    (incoming: StreakData) => {
      const next: StreakData = { ...incoming, updatedAt: nextUpdatedAt(dataRef.current.updatedAt) };
      dataRef.current = next;
      setData(next);
      saveData(next);
      saveOnboarded(true);
      setOnboarded(true);
      schedulePush();
      notify('toast.imported');
    },
    [notify, schedulePush],
  );

  const connectCloud = useCallback(
    async (nextCredentials: SyncCredentials): Promise<boolean> => {
      const clean: SyncCredentials = {
        token: nextCredentials.token.trim(),
        gistId: nextCredentials.gistId?.trim() || null,
      };
      if (!clean.token) return false;

      credentialsRef.current = clean;
      saveCredentials(clean);
      setCredentials(clean);
      engineRef.current = null;
      setSyncStatus('syncing');
      const ok = await performSync('manual');
      if (ok) notify('toast.connected');
      return ok;
    },
    [notify, performSync],
  );

  const disconnectCloud = useCallback(() => {
    credentialsRef.current = null;
    engineRef.current = null;
    saveCredentials(null);
    setCredentials(null);
    setSyncStatus('local');
    setSyncError(null);
    notify('toast.disconnected');
  }, [notify]);

  const syncNow = useCallback(async () => performSync('manual'), [performSync]);

  const wipeLocal = useCallback(() => {
    clearAllLocal();
    const fresh = createDefaultData();
    dataRef.current = fresh;
    setData(fresh);
    setOnboarded(false);
    credentialsRef.current = null;
    engineRef.current = null;
    setCredentials(null);
    setSyncStatus('local');
    setSyncError(null);
    setLastSync(null);
    notify('toast.wiped');
  }, [notify]);

  const needsOnboarding = useMemo(
    () => !onboarded && !data.activeChallengeStart && data.history.length === 0,
    [onboarded, data.activeChallengeStart, data.history.length],
  );

  return {
    data,
    credentials,
    syncStatus,
    syncError,
    lastSync,
    onboarded,
    needsOnboarding,
    hydrated,
    toast,
    notify,
    dismissToast,
    startChallenge,
    resistUrge,
    resetChallenge,
    clearHistory,
    updatePreferences,
    setPledge,
    completeOnboarding,
    importData,
    connectCloud,
    disconnectCloud,
    syncNow,
    wipeLocal,
  };
}
