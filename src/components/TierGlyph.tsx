import type { Tier } from '../lib/tiers';

interface TierGlyphProps {
  tier: Tier;
  size?: number;
  locked?: boolean;
  className?: string;
}

function hexPoints(radius: number, sides: number, cx = 32, cy = 32): string {
  return Array.from({ length: sides }, (_, i) => {
    const angle = -Math.PI / 2 + (i / sides) * Math.PI * 2;
    return `${(cx + Math.cos(angle) * radius).toFixed(2)},${(cy + Math.sin(angle) * radius).toFixed(2)}`;
  }).join(' ');
}

/** Cheap static emblem used in lists (no canvas, no RAF). */
export default function TierGlyph({ tier, size = 56, locked = false, className = '' }: TierGlyphProps) {
  const { palette } = tier;
  const sides = Math.max(3, Math.round(tier.relic.facets / 2));

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
      className={className}
      style={{ filter: locked ? 'blur(3px) saturate(0.2) brightness(0.55)' : `drop-shadow(0 0 8px ${palette.accent}44)` }}
    >
      {tier.relic.constellation &&
        Array.from({ length: 10 }, (_, i) => {
          const angle = (i / 10) * Math.PI * 2;
          return (
            <circle
              key={i}
              cx={32 + Math.cos(angle) * 28}
              cy={32 + Math.sin(angle) * 28}
              r={i % 3 === 0 ? 1.4 : 0.8}
              fill={palette.accent}
              opacity={0.5}
            />
          );
        })}
      <circle cx="32" cy="32" r="26" fill="none" stroke={palette.ring} strokeOpacity="0.3" strokeWidth="1" />
      <circle
        cx="32"
        cy="32"
        r="21"
        fill="none"
        stroke={palette.accent2}
        strokeOpacity="0.55"
        strokeWidth="1.4"
        strokeDasharray={tier.relic.astrolabe ? '3 4' : undefined}
      />
      {tier.relic.rings > 2 && <circle cx="32" cy="32" r="16" fill="none" stroke={palette.accent} strokeOpacity="0.35" strokeWidth="0.8" strokeDasharray="12 6" />}
      <circle cx="32" cy="32" r="13" fill={palette.core[1]} opacity="0.35" />
      <polygon points={hexPoints(9.5, sides)} fill={palette.core[1]} stroke={palette.accent} strokeWidth="1.1" opacity="0.95" />
      <circle cx="32" cy="32" r="2.6" fill="#fff" />
    </svg>
  );
}
