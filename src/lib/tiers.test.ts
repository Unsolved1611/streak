import { describe, expect, it } from 'vitest';
import { DAY, HOUR } from './time';
import {
  TIERS,
  getNextTier,
  getTierById,
  getTierForElapsed,
  getTierProgress,
  getUnlockedTiers,
  isTierUnlocked,
  tierCssVars,
  tierThresholdLabel,
} from './tiers';

describe('tier progression thresholds', () => {
  it('exposes exactly 8 tiers in ascending order', () => {
    expect(TIERS).toHaveLength(8);
    const mins = TIERS.map((t) => t.minSeconds);
    expect(mins).toEqual([...mins].sort((a, b) => a - b));
    expect(mins[0]).toBe(0);
  });

  it.each([
    [0, 'raw-ember'],
    [HOUR, 'raw-ember'],
    [DAY - 1, 'raw-ember'],
    [DAY, 'first-spark'],
    [3 * DAY - 1, 'first-spark'],
    [3 * DAY, 'iron-momentum'],
    [7 * DAY, 'forged-will'],
    [14 * DAY, 'ascendant'],
    [30 * DAY, 'obsidian-sovereign'],
    [60 * DAY, 'solar-paragon'],
    [90 * DAY, 'transcendent'],
    [365 * DAY, 'transcendent'],
  ])('elapsed %i s -> %s', (seconds, id) => {
    expect(getTierForElapsed(seconds).id).toBe(id);
  });

  it('treats invalid / negative elapsed as the first tier', () => {
    expect(getTierForElapsed(-10).id).toBe('raw-ember');
    expect(getTierForElapsed(Number.NaN).id).toBe('raw-ember');
  });

  it('flags unlock state per tier', () => {
    expect(isTierUnlocked('raw-ember', 0)).toBe(true);
    expect(isTierUnlocked('first-spark', DAY - 1)).toBe(false);
    expect(isTierUnlocked('first-spark', DAY)).toBe(true);
    expect(getUnlockedTiers(3 * DAY).map((t) => t.id)).toEqual(['raw-ember', 'first-spark', 'iron-momentum']);
  });
});

describe('getTierProgress', () => {
  it('reports 0 progress at the tier floor', () => {
    const p = getTierProgress(DAY);
    expect(p.current.id).toBe('first-spark');
    expect(p.next?.id).toBe('iron-momentum');
    expect(p.progress).toBeCloseTo(0, 5);
    expect(p.secondsToNext).toBe(2 * DAY);
  });

  it('reports halfway progress between thresholds', () => {
    const p = getTierProgress(DAY + DAY);
    expect(p.progress).toBeCloseTo(0.5, 5);
    expect(p.secondsToNext).toBe(DAY);
  });

  it('caps the final tier at 100% with no next tier', () => {
    const p = getTierProgress(120 * DAY);
    expect(p.next).toBeNull();
    expect(p.isMax).toBe(true);
    expect(p.progress).toBe(1);
    expect(p.secondsToNext).toBe(0);
  });

  it('never exceeds bounds', () => {
    const p = getTierProgress(3 * DAY - 1);
    expect(p.progress).toBeGreaterThanOrEqual(0);
    expect(p.progress).toBeLessThanOrEqual(1);
  });
});

describe('tier helpers', () => {
  it('looks up by id and next tier', () => {
    const forged = getTierById('forged-will');
    expect(forged?.index).toBe(3);
    expect(getNextTier(forged!)?.id).toBe('ascendant');
    expect(getNextTier(TIERS[7])).toBeNull();
    expect(getTierById('nope')).toBeUndefined();
  });

  it('labels thresholds naturally', () => {
    expect(TIERS.map(tierThresholdLabel)).toEqual(['0h', '1d', '3d', '7d', '14d', '30d', '60d', '90d']);
  });

  it('emits a complete CSS variable contract', () => {
    const vars = tierCssVars(TIERS[4]);
    expect(vars['--tier-accent']).toBe(TIERS[4].palette.accent);
    expect(vars['--tier-bg']).toBe(TIERS[4].palette.bg);
    expect(Object.keys(vars).length).toBeGreaterThanOrEqual(18);
  });

  it('gives every tier a distinct palette and a bilingual name', () => {
    const accents = new Set(TIERS.map((t) => t.palette.accent));
    expect(accents.size).toBe(8);
    for (const tier of TIERS) {
      expect(tier.name.es.length).toBeGreaterThan(0);
      expect(tier.name.en.length).toBeGreaterThan(0);
      expect(tier.aura.es.length).toBeGreaterThan(0);
    }
  });
});
