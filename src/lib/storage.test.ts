import { beforeEach, describe, expect, it } from 'vitest';
import { createDefaultData } from '../types/streak';
import { parseImportedJson, sanitizeData, saveCredentials, loadCredentials, saveData, loadData } from './storage';

describe('sanitizeData', () => {
  it('rejects payloads that are not streak data', () => {
    expect(sanitizeData(null)).toBeNull();
    expect(sanitizeData('hello')).toBeNull();
    expect(sanitizeData({ foo: 'bar' })).toBeNull();
    expect(sanitizeData([])).toBeNull();
  });

  it('normalises a valid payload', () => {
    const data = sanitizeData({
      version: 1,
      updatedAt: '2026-01-01T00:00:00.000Z',
      activeChallengeStart: '2026-01-01T00:00:00.000Z',
      urgesResisted: 4.7,
      personalPledge: 'because',
      history: [],
      preferences: { language: 'es', discreetMode: true, customTitle: 'Focus Vault' },
    });
    expect(data?.urgesResisted).toBe(4);
    expect(data?.preferences).toEqual({ language: 'es', discreetMode: true, customTitle: 'Focus Vault' });
  });

  it('drops invalid fields and falls back to defaults', () => {
    const data = sanitizeData({
      version: 'x',
      updatedAt: 'garbage',
      activeChallengeStart: 'garbage',
      urgesResisted: -3,
      history: [{ id: 'a', startedAt: 'bad', endedAt: 'bad' }, { startedAt: '2026-01-01T00:00:00.000Z', endedAt: '2026-01-02T00:00:00.000Z' }],
      preferences: { language: 'fr', discreetMode: 'yes' },
    });
    expect(data).not.toBeNull();
    expect(data?.activeChallengeStart).toBeNull();
    expect(data?.urgesResisted).toBe(0);
    expect(data?.history).toHaveLength(1);
    expect(data?.history[0].durationSeconds).toBe(86_400);
    expect(data?.preferences.language).toBe('en');
    expect(data?.preferences.discreetMode).toBe(false);
  });
});

describe('import / export', () => {
  it('parses a valid backup', () => {
    const data = createDefaultData(new Date('2026-05-05T00:00:00.000Z'));
    expect(parseImportedJson(JSON.stringify(data))).toMatchObject({ version: 1, urgesResisted: 0 });
  });

  it('rejects invalid JSON and invalid shapes with readable errors', () => {
    expect(() => parseImportedJson('{oops')).toThrow('invalid-json');
    expect(() => parseImportedJson('{"hello":1}')).toThrow('invalid-shape');
  });
});

describe('local cache round trip', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('persists and reloads data', () => {
    const data = createDefaultData(new Date('2026-05-05T00:00:00.000Z'));
    saveData({ ...data, urgesResisted: 12 });
    expect(loadData()?.urgesResisted).toBe(12);
  });

  it('persists credentials separately from the data blob', () => {
    saveCredentials({ token: 'tok', gistId: 'gid' });
    expect(loadCredentials()).toEqual({ token: 'tok', gistId: 'gid' });
    saveData(createDefaultData());
    expect(JSON.stringify(loadData())).not.toContain('tok');
  });

  it('ignores corrupt local blobs instead of crashing', () => {
    window.localStorage.setItem('vault.data.v1', '{not json');
    expect(loadData()).toBeNull();
  });
});
