/**
 * Progressive visual evolution system.
 *
 * Eight tiers, each one a full design language: palette, glassmorphic borders,
 * ambient particle behaviour and centrepiece relic geometry. Everything here is
 * pure data + pure functions so it can be unit tested and reused by the UI.
 */

import { DAY, HOUR } from './time';

export type TierId =
  | 'raw-ember'
  | 'first-spark'
  | 'iron-momentum'
  | 'forged-will'
  | 'ascendant'
  | 'obsidian-sovereign'
  | 'solar-paragon'
  | 'transcendent';

export type ParticleMode = 'dust' | 'spark' | 'aurora' | 'star' | 'nebula' | 'mote' | 'corona' | 'prism';

export interface TierPalette {
  /** Page background gradient stops. */
  bg: string;
  bgTo: string;
  /** Glass card fills. */
  surface: string;
  surfaceStrong: string;
  /** Borders. */
  line: string;
  lineStrong: string;
  /** Accents. */
  accent: string;
  accent2: string;
  accent3: string;
  /** Text. */
  text: string;
  muted: string;
  /** Ready-made glow shadows. */
  glow: string;
  glowSoft: string;
  /** Ambient radial halos (top-left, right, bottom). */
  halo: [string, string, string];
  /** Relic stroke + core gradient stops. */
  ring: string;
  core: [string, string];
}

export interface ParticleConfig {
  mode: ParticleMode;
  count: number;
  colors: string[];
  /** base upward/rotational speed multiplier */
  speed: number;
  size: [number, number];
  /** 0..1 alpha ceiling */
  alpha: number;
  /** draw faint constellation links between nearby particles */
  links: boolean;
}

export interface RelicConfig {
  /** number of concentric orbital rings */
  rings: number;
  /** astrolabe-style tick geometry */
  astrolabe: boolean;
  /** faceted crystal core */
  facets: number;
  /** solar corona flare */
  corona: boolean;
  /** constellation dots around the halo */
  constellation: boolean;
  /** prismatic refraction arcs */
  prism: boolean;
  /** pointer-reactive parallax strength 0..1 */
  parallax: number;
}

export interface Tier {
  id: TierId;
  index: number;
  minSeconds: number;
  name: { es: string; en: string };
  /** Short colour descriptor used in loss-aversion copy ("violet and rose gold"). */
  aura: { es: string; en: string };
  motto: { es: string; en: string };
  /** What the user loses if they break the streak at this tier (loss aversion). */
  atRisk: { es: string; en: string };
  palette: TierPalette;
  particles: ParticleConfig;
  relic: RelicConfig;
  /** Extra CSS class hook for tier specific flourishes. */
  className: string;
}

const tier = (t: Tier): Tier => Object.freeze(t);

export const TIERS: readonly Tier[] = Object.freeze([
  tier({
    id: 'raw-ember',
    index: 0,
    minSeconds: 0,
    name: { es: 'Brasa Cruda', en: 'Raw Ember' },
    aura: { es: 'gris pizarra', en: 'slate grey' },
    motto: { es: 'Todo comienzo es frío y frágil.', en: 'Every beginning is cold and fragile.' },
    atRisk: {
      es: 'La brasa cruda: apenas un anillo tenue en la oscuridad.',
      en: 'The raw ember: barely a thin ring in the dark.',
    },
    palette: {
      bg: '#0a0b10',
      bgTo: '#06070b',
      surface: 'rgba(18, 20, 28, 0.72)',
      surfaceStrong: 'rgba(24, 26, 36, 0.86)',
      line: 'rgba(148, 155, 175, 0.14)',
      lineStrong: 'rgba(148, 155, 175, 0.26)',
      accent: '#9aa0b2',
      accent2: '#b06a3f',
      accent3: '#6d7385',
      text: '#d8dae3',
      muted: '#7e8394',
      glow: '0 0 0 1px rgba(148,155,175,0.10), 0 18px 50px -24px rgba(0,0,0,0.9)',
      glowSoft: '0 0 24px -8px rgba(176,106,63,0.25)',
      halo: ['rgba(120,128,150,0.10)', 'rgba(176,106,63,0.05)', 'rgba(0,0,0,0)'],
      ring: '#8b8f9e',
      core: ['#c9cbd6', '#4a4d5a'],
    },
    particles: { mode: 'dust', count: 14, colors: ['#5f6474', '#8a5f42'], speed: 0.12, size: [0.6, 1.5], alpha: 0.35, links: false },
    relic: { rings: 1, astrolabe: false, facets: 4, corona: false, constellation: false, prism: false, parallax: 0.15 },
    className: 'tier-raw',
  }),
  tier({
    id: 'first-spark',
    index: 1,
    minSeconds: 1 * DAY,
    name: { es: 'Primera Chispa', en: 'First Spark' },
    aura: { es: 'ámbar e índigo', en: 'amber and indigo' },
    motto: { es: 'Algo dentro de ti acaba de encenderse.', en: 'Something inside you just caught fire.' },
    atRisk: {
      es: 'La primera chispa: el calor apenas perceptible que lograste encender.',
      en: 'The first spark: the barely-there warmth you managed to light.',
    },
    palette: {
      bg: '#0b0a14',
      bgTo: '#07060e',
      surface: 'rgba(22, 20, 34, 0.72)',
      surfaceStrong: 'rgba(30, 27, 46, 0.88)',
      line: 'rgba(186, 160, 220, 0.16)',
      lineStrong: 'rgba(214, 176, 120, 0.34)',
      accent: '#e0a35d',
      accent2: '#7b74f0',
      accent3: '#b98cf0',
      text: '#e6e2f2',
      muted: '#8f8aa6',
      glow: '0 0 0 1px rgba(224,163,93,0.10), 0 18px 60px -22px rgba(70,50,140,0.55)',
      glowSoft: '0 0 30px -6px rgba(224,163,93,0.30)',
      halo: ['rgba(123,116,240,0.16)', 'rgba(224,163,93,0.10)', 'rgba(0,0,0,0)'],
      ring: '#e0a35d',
      core: ['#ffe0b8', '#8a5a3a'],
    },
    particles: { mode: 'spark', count: 26, colors: ['#e0a35d', '#8f86ff', '#c9a1ff'], speed: 0.35, size: [1, 2.4], alpha: 0.55, links: false },
    relic: { rings: 2, astrolabe: false, facets: 6, corona: false, constellation: false, prism: false, parallax: 0.25 },
    className: 'tier-spark',
  }),
  tier({
    id: 'iron-momentum',
    index: 2,
    minSeconds: 3 * DAY,
    name: { es: 'Impulso de Hierro', en: 'Iron Momentum' },
    aura: { es: 'zafiro y cian', en: 'sapphire and cyan' },
    motto: { es: 'El impulso ya no es suerte: es metal.', en: 'Momentum is no longer luck. It is metal.' },
    atRisk: {
      es: 'El impulso de hierro: la aurora azul que ya empezaba a girar a tu favor.',
      en: 'Iron momentum: the blue aurora that had started turning in your favour.',
    },
    palette: {
      bg: '#060d1a',
      bgTo: '#040711',
      surface: 'rgba(13, 26, 45, 0.72)',
      surfaceStrong: 'rgba(17, 34, 58, 0.88)',
      line: 'rgba(110, 190, 255, 0.18)',
      lineStrong: 'rgba(70, 224, 255, 0.38)',
      accent: '#4fd6ff',
      accent2: '#3b7cf6',
      accent3: '#8be9ff',
      text: '#dcecff',
      muted: '#7f97b5',
      glow: '0 0 0 1px rgba(79,214,255,0.12), 0 20px 60px -22px rgba(20,80,220,0.55)',
      glowSoft: '0 0 34px -6px rgba(79,214,255,0.35)',
      halo: ['rgba(59,124,246,0.22)', 'rgba(79,214,255,0.12)', 'rgba(0,0,0,0)'],
      ring: '#5cd8ff',
      core: ['#c6f6ff', '#1b5fa8'],
    },
    particles: { mode: 'aurora', count: 40, colors: ['#4fd6ff', '#3b7cf6', '#9fe8ff'], speed: 0.45, size: [0.8, 2.2], alpha: 0.5, links: true },
    relic: { rings: 2, astrolabe: false, facets: 8, corona: false, constellation: false, prism: false, parallax: 0.35 },
    className: 'tier-iron',
  }),
  tier({
    id: 'forged-will',
    index: 3,
    minSeconds: 7 * DAY,
    name: { es: 'Voluntad Forjada', en: 'Forged Will' },
    aura: { es: 'esmeralda y plata', en: 'emerald and silver' },
    motto: { es: 'Esto ya no se rompe: se templa.', en: 'This no longer breaks. It tempers.' },
    atRisk: {
      es: 'La voluntad forjada: el astrolabio esmeralda y plata que giraba por ti.',
      en: 'Forged will: the emerald-and-silver astrolabe that was turning for you.',
    },
    palette: {
      bg: '#04120f',
      bgTo: '#030b0a',
      surface: 'rgba(10, 32, 28, 0.72)',
      surfaceStrong: 'rgba(13, 42, 37, 0.88)',
      line: 'rgba(120, 235, 200, 0.18)',
      lineStrong: 'rgba(160, 240, 210, 0.40)',
      accent: '#46e8b0',
      accent2: '#cfd8e3',
      accent3: '#9ff5d8',
      text: '#dffaf1',
      muted: '#79a99a',
      glow: '0 0 0 1px rgba(70,232,176,0.14), 0 22px 64px -22px rgba(10,140,110,0.55)',
      glowSoft: '0 0 36px -6px rgba(70,232,176,0.35)',
      halo: ['rgba(70,232,176,0.18)', 'rgba(207,216,227,0.10)', 'rgba(0,0,0,0)'],
      ring: '#5df0bd',
      core: ['#e8fff7', '#12856b'],
    },
    particles: { mode: 'star', count: 60, colors: ['#46e8b0', '#cfd8e3', '#9ff5d8'], speed: 0.22, size: [0.6, 1.9], alpha: 0.6, links: true },
    relic: { rings: 3, astrolabe: true, facets: 10, corona: false, constellation: false, prism: false, parallax: 0.4 },
    className: 'tier-forged',
  }),
  tier({
    id: 'ascendant',
    index: 4,
    minSeconds: 14 * DAY,
    name: { es: 'Ascendente', en: 'Ascendant' },
    aura: { es: 'violeta y oro rosa', en: 'violet and rose gold' },
    motto: { es: 'La versión anterior de ti ya no alcanza.', en: 'The old version of you no longer reaches this height.' },
    atRisk: {
      es: 'El estado Ascendente: tu aura violeta y oro rosa, y la nebulosa que se movía con tu mano.',
      en: 'Ascendant: your violet and rose-gold aura, and the nebula that moved with your hand.',
    },
    palette: {
      bg: '#0d0618',
      bgTo: '#08040f',
      surface: 'rgba(30, 14, 48, 0.72)',
      surfaceStrong: 'rgba(40, 20, 62, 0.88)',
      line: 'rgba(200, 150, 255, 0.20)',
      lineStrong: 'rgba(255, 179, 167, 0.42)',
      accent: '#c08bff',
      accent2: '#ffb3a7',
      accent3: '#e6c9ff',
      text: '#f2e8ff',
      muted: '#a08bb8',
      glow: '0 0 0 1px rgba(192,139,255,0.16), 0 24px 70px -22px rgba(120,50,200,0.55)',
      glowSoft: '0 0 40px -6px rgba(255,179,167,0.35)',
      halo: ['rgba(192,139,255,0.24)', 'rgba(255,179,167,0.14)', 'rgba(0,0,0,0)'],
      ring: '#c99bff',
      core: ['#ffe6df', '#7a3fb0'],
    },
    particles: { mode: 'nebula', count: 70, colors: ['#c08bff', '#ffb3a7', '#f0d9ff', '#ffd7a3'], speed: 0.3, size: [1, 3.4], alpha: 0.55, links: true },
    relic: { rings: 3, astrolabe: true, facets: 12, corona: false, constellation: true, prism: false, parallax: 0.6 },
    className: 'tier-ascendant',
  }),
  tier({
    id: 'obsidian-sovereign',
    index: 5,
    minSeconds: 30 * DAY,
    name: { es: 'Soberano de Obsidiana', en: 'Obsidian Sovereign' },
    aura: { es: 'obsidiana y oro líquido', en: 'obsidian and liquid gold' },
    motto: { es: 'Donde otros ceden, tú gobiernas.', en: 'Where others yield, you rule.' },
    atRisk: {
      es: 'El rango Soberano: oro líquido sobre obsidiana y el cristal dorado que late en el centro.',
      en: 'Sovereign rank: liquid gold over obsidian and the golden crystal pulsing at the core.',
    },
    palette: {
      bg: '#0b0805',
      bgTo: '#050403',
      surface: 'rgba(28, 21, 12, 0.74)',
      surfaceStrong: 'rgba(38, 28, 15, 0.9)',
      line: 'rgba(255, 210, 130, 0.22)',
      lineStrong: 'rgba(255, 210, 130, 0.50)',
      accent: '#ffd166',
      accent2: '#f5a93c',
      accent3: '#fff0c2',
      text: '#fdf3e0',
      muted: '#b09a76',
      glow: '0 0 0 1px rgba(255,209,102,0.20), 0 26px 76px -22px rgba(150,100,20,0.6)',
      glowSoft: '0 0 44px -6px rgba(255,209,102,0.42)',
      halo: ['rgba(255,209,102,0.24)', 'rgba(120,80,20,0.20)', 'rgba(0,0,0,0)'],
      ring: '#ffd166',
      core: ['#fffbe8', '#a86a12'],
    },
    particles: { mode: 'mote', count: 80, colors: ['#ffd166', '#fff0c2', '#f5a93c'], speed: 0.28, size: [1, 3], alpha: 0.6, links: false },
    relic: { rings: 4, astrolabe: true, facets: 14, corona: false, constellation: true, prism: false, parallax: 0.65 },
    className: 'tier-sovereign',
  }),
  tier({
    id: 'solar-paragon',
    index: 6,
    minSeconds: 60 * DAY,
    name: { es: 'Parangón Solar', en: 'Solar Paragon' },
    aura: { es: 'oro celestial y marfil', en: 'celestial gold and ivory' },
    motto: { es: 'Ya no te iluminan: iluminas.', en: 'You are no longer lit. You light.' },
    atRisk: {
      es: 'El Parangón Solar: la corona solar, el escudo de prestigio y 60+ días de luz propia.',
      en: 'Solar Paragon: the solar corona, the prestige crest and 60+ days of light of your own.',
    },
    palette: {
      bg: '#100c04',
      bgTo: '#080601',
      surface: 'rgba(40, 32, 12, 0.74)',
      surfaceStrong: 'rgba(52, 42, 16, 0.9)',
      line: 'rgba(255, 226, 150, 0.26)',
      lineStrong: 'rgba(255, 236, 190, 0.55)',
      accent: '#ffd76e',
      accent2: '#a8ecff',
      accent3: '#fff7d9',
      text: '#fff8e6',
      muted: '#c0ab7e',
      glow: '0 0 0 1px rgba(255,215,110,0.26), 0 30px 90px -24px rgba(200,150,30,0.6)',
      glowSoft: '0 0 54px -4px rgba(255,215,110,0.5)',
      halo: ['rgba(255,215,110,0.30)', 'rgba(168,236,255,0.14)', 'rgba(255,180,60,0.08)'],
      ring: '#ffe08a',
      core: ['#ffffff', '#e0a020'],
    },
    particles: { mode: 'corona', count: 90, colors: ['#ffd76e', '#fff7d9', '#a8ecff'], speed: 0.4, size: [0.8, 2.8], alpha: 0.65, links: false },
    relic: { rings: 4, astrolabe: true, facets: 16, corona: true, constellation: true, prism: false, parallax: 0.7 },
    className: 'tier-paragon',
  }),
  tier({
    id: 'transcendent',
    index: 7,
    minSeconds: 90 * DAY,
    name: { es: 'Trascendente', en: 'Transcendent' },
    aura: { es: 'aurora prismática', en: 'prismatic aurora' },
    motto: { es: 'Esto ya es leyenda. Y las leyendas no se apagan.', en: 'This is legend now. And legends do not go out.' },
    atRisk: {
      es: 'El estado Trascendente: la aurora prismática, la constelación completa y 90+ días de leyenda.',
      en: 'Transcendent: the prismatic aurora, the full constellation and 90+ days of legend.',
    },
    palette: {
      bg: '#05070f',
      bgTo: '#02030a',
      surface: 'rgba(16, 22, 40, 0.72)',
      surfaceStrong: 'rgba(22, 30, 52, 0.88)',
      line: 'rgba(255, 255, 255, 0.26)',
      lineStrong: 'rgba(255, 236, 180, 0.60)',
      accent: '#ffe9a8',
      accent2: '#8cf6ff',
      accent3: '#e2b3ff',
      text: '#ffffff',
      muted: '#a9b6d0',
      glow: '0 0 0 1px rgba(255,255,255,0.22), 0 32px 100px -24px rgba(120,160,255,0.55)',
      glowSoft: '0 0 64px -2px rgba(255,233,168,0.55)',
      halo: ['rgba(140,246,255,0.24)', 'rgba(226,179,255,0.20)', 'rgba(255,233,168,0.16)'],
      ring: '#ffffff',
      core: ['#ffffff', '#7f8dff'],
    },
    particles: { mode: 'prism', count: 120, colors: ['#8cf6ff', '#e2b3ff', '#ffe9a8', '#ffffff', '#9dffc4'], speed: 0.5, size: [0.8, 3.2], alpha: 0.7, links: true },
    relic: { rings: 5, astrolabe: true, facets: 18, corona: true, constellation: true, prism: true, parallax: 0.85 },
    className: 'tier-transcendent',
  }),
]);

export const TIER_COUNT = TIERS.length;

/** Highest tier whose threshold has been reached. Clock skew / negative => first tier. */
export function getTierForElapsed(seconds: number): Tier {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  let match = TIERS[0];
  for (const candidate of TIERS) {
    if (safe >= candidate.minSeconds) match = candidate;
    else break;
  }
  return match;
}

export function getTierById(id: string | undefined | null): Tier | undefined {
  return TIERS.find((t) => t.id === id);
}

export function getNextTier(current: Tier): Tier | null {
  return TIERS[current.index + 1] ?? null;
}

export interface TierProgress {
  current: Tier;
  next: Tier | null;
  /** 0..1 progress from the current tier floor to the next tier threshold. */
  progress: number;
  secondsIntoCurrent: number;
  secondsToNext: number;
  /** Overall progress across the full 90-day ladder, 0..1. */
  overallProgress: number;
  isMax: boolean;
}

export function getTierProgress(elapsed: number): TierProgress {
  const safe = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
  const current = getTierForElapsed(safe);
  const next = getNextTier(current);
  const maxSeconds = TIERS[TIERS.length - 1].minSeconds + 30 * DAY;

  if (!next) {
    return {
      current,
      next: null,
      progress: 1,
      secondsIntoCurrent: safe - current.minSeconds,
      secondsToNext: 0,
      overallProgress: Math.min(1, safe / maxSeconds),
      isMax: true,
    };
  }

  const span = next.minSeconds - current.minSeconds;
  const secondsIntoCurrent = safe - current.minSeconds;
  return {
    current,
    next,
    progress: span <= 0 ? 1 : Math.min(1, Math.max(0, secondsIntoCurrent / span)),
    secondsIntoCurrent,
    secondsToNext: Math.max(0, next.minSeconds - safe),
    overallProgress: Math.min(1, safe / maxSeconds),
    isMax: false,
  };
}

/** Tiers fully unlocked by an elapsed duration. */
export function getUnlockedTiers(elapsed: number): Tier[] {
  const safe = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
  return TIERS.filter((t) => safe >= t.minSeconds);
}

export function isTierUnlocked(tierId: TierId, elapsed: number): boolean {
  const t = getTierById(tierId);
  if (!t) return false;
  return elapsed >= t.minSeconds;
}

/** CSS custom properties injected by the theme layer. */
export function tierCssVars(t: Tier): Record<string, string> {
  return {
    '--tier-bg': t.palette.bg,
    '--tier-bg-to': t.palette.bgTo,
    '--tier-surface': t.palette.surface,
    '--tier-surface-strong': t.palette.surfaceStrong,
    '--tier-line': t.palette.line,
    '--tier-line-strong': t.palette.lineStrong,
    '--tier-accent': t.palette.accent,
    '--tier-accent-2': t.palette.accent2,
    '--tier-accent-3': t.palette.accent3,
    '--tier-text': t.palette.text,
    '--tier-muted': t.palette.muted,
    '--tier-glow': t.palette.glow,
    '--tier-glow-soft': t.palette.glowSoft,
    '--tier-halo-1': t.palette.halo[0],
    '--tier-halo-2': t.palette.halo[1],
    '--tier-halo-3': t.palette.halo[2],
    '--tier-ring': t.palette.ring,
    '--tier-core-1': t.palette.core[0],
    '--tier-core-2': t.palette.core[1],
  };
}

/** Short threshold label for the vault roadmap: `24h`, `3d`, `90d`. */
export function tierThresholdLabel(t: Tier): string {
  if (t.minSeconds === 0) return '0h';
  if (t.minSeconds % DAY === 0) return `${t.minSeconds / DAY}d`;
  if (t.minSeconds % HOUR === 0) return `${t.minSeconds / HOUR}h`;
  return `${Math.round(t.minSeconds / HOUR)}h`;
}

/** Tier reached by a historical run, robust to legacy/invalid ids. */
export function tierFromHistoryId(id: string): Tier {
  return getTierById(id) ?? TIERS[0];
}
