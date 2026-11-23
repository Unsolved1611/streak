/**
 * Aura Relic — the animated centerpiece.
 *
 * Layered SVG (halos, orbital rings, astrolabe ticks, progress arc, faceted
 * crystal, corona, constellation, prism arcs) plus a canvas of orbiting motes.
 * Geometry, colour and depth are all read from the active tier, so the emblem
 * genuinely becomes a different object as the streak grows.
 */

import { useEffect, useId, useRef, useState } from 'react';
import type { Tier } from '../lib/tiers';

interface AuraRelicProps {
  tier: Tier;
  /** 0..1 progress toward the next tier; omit to hide the progress arc. */
  progress?: number;
  /** Rendered px size; the emblem scales fluidly between 140 and 360. */
  className?: string;
  /** Enables pointer parallax + tap pulse. */
  interactive?: boolean;
  /** Dim / desaturate for locked vault previews. */
  muted?: boolean;
  reduced?: boolean;
}

const CENTER = 160;

function polar(cx: number, cy: number, radius: number, angle: number) {
  return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
}

function polygonPoints(radius: number, sides: number, rotation = 0): string {
  return Array.from({ length: sides }, (_, i) => {
    const { x, y } = polar(CENTER, CENTER, radius, rotation + (i / sides) * Math.PI * 2);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
}

export default function AuraRelic({
  tier,
  progress,
  className = '',
  interactive = true,
  muted = false,
  reduced = false,
}: AuraRelicProps) {
  const uid = useId().replace(/[:]/g, '');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pulsing, setPulsing] = useState(false);
  const pointerRef = useRef({ x: 0, y: 0 });

  const { palette, relic } = tier;
  const ringCount = muted ? 1 : relic.rings;
  const p = typeof progress === 'number' ? Math.min(1, Math.max(0, progress)) : null;
  const arcRadius = 106;
  const circumference = 2 * Math.PI * arcRadius;

  // Orbiting motes on canvas -------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion =
      reduced || (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    const moteCount = muted ? 0 : Math.min(28, 8 + tier.index * 3);
    const colors = tier.particles.colors;
    let raf = 0;
    let started = 0;
    let size = 0;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      size = Math.max(120, Math.min(rect.width, rect.height));
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.floor(size * dpr);
      canvas.height = Math.floor(size * dpr);
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const drawMotes = (time: number) => {
      ctx.clearRect(0, 0, size, size);
      const c = size / 2;
      const scale = size / 320;
      const px = pointerRef.current.x * 5 * scale;
      const py = pointerRef.current.y * 5 * scale;

      for (let i = 0; i < moteCount; i += 1) {
        const seed = i * 2.399;
        const radius = (86 + ((i * 37) % 58)) * scale;
        const speed = 0.12 + ((i * 13) % 9) * 0.018;
        const angle = seed + time * speed * (i % 3 === 0 ? -1 : 1);
        const x = c + Math.cos(angle) * radius + px;
        const y = c + Math.sin(angle) * radius * 0.98 + py;
        const dot = (0.8 + ((i * 7) % 5) * 0.32) * scale;
        const alpha = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(time * 1.5 + i));

        ctx.globalAlpha = alpha;
        ctx.fillStyle = colors[i % colors.length];
        ctx.beginPath();
        ctx.arc(x, y, dot, 0, Math.PI * 2);
        ctx.fill();

        if (dot > 1.2 * scale) {
          const glow = ctx.createRadialGradient(x, y, 0, x, y, dot * 6);
          glow.addColorStop(0, colors[i % colors.length]);
          glow.addColorStop(1, 'transparent');
          ctx.globalAlpha = alpha * 0.35;
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(x, y, dot * 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    };

    const loop = (ts: number) => {
      if (!started) started = ts;
      drawMotes((ts - started) / 1000);
      raf = window.requestAnimationFrame(loop);
    };

    resize();
    if (reduceMotion) drawMotes(0);
    else raf = window.requestAnimationFrame(loop);

    const onResize = () => {
      resize();
      if (reduceMotion) drawMotes(0);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [tier, muted, reduced]);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    pointerRef.current = { x: nx, y: ny };
    event.currentTarget.style.setProperty('--mx', nx.toFixed(3));
    event.currentTarget.style.setProperty('--my', ny.toFixed(3));
  };

  const handlePointerLeave = () => {
    pointerRef.current = { x: 0, y: 0 };
    containerRef.current?.style.setProperty('--mx', '0');
    containerRef.current?.style.setProperty('--my', '0');
  };

  const handleTap = () => {
    if (!interactive) return;
    setPulsing(true);
    window.setTimeout(() => setPulsing(false), 740);
  };

  const depth = (factor: number) =>
    interactive
      ? { transform: `translate3d(calc(var(--mx, 0) * ${(relic.parallax * factor * 8).toFixed(2)}px), calc(var(--my, 0) * ${(relic.parallax * factor * 8).toFixed(2)}px), 0)` }
      : undefined;

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={handleTap}
      className={`relative aspect-square w-full select-none ${interactive ? 'cursor-pointer' : ''} ${pulsing ? 'relic-tap-pulse' : ''} ${className}`}
      style={{ filter: muted ? 'saturate(0.15) brightness(0.6)' : undefined, transition: 'filter 600ms ease' }}
      role={interactive ? 'button' : 'img'}
      aria-label={`${tier.name.en} relic`}
      tabIndex={interactive ? 0 : -1}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleTap();
      }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-full opacity-70 blur-2xl"
        style={{
          background: `radial-gradient(circle at 50% 45%, ${palette.halo[0]} 0%, transparent 62%), radial-gradient(circle at 62% 60%, ${palette.halo[1]} 0%, transparent 58%)`,
          transition: 'background 1s ease',
        }}
      />
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-10" />

      <svg viewBox="0 0 320 320" className="relative z-0 h-full w-full overflow-visible" aria-hidden="true">
        <defs>
          <radialGradient id={`halo-${uid}`} cx="50%" cy="46%" r="52%">
            <stop offset="0%" stopColor={palette.ring} stopOpacity="0.22" />
            <stop offset="60%" stopColor={palette.accent2} stopOpacity="0.08" />
            <stop offset="100%" stopColor={palette.accent2} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`core-${uid}`} cx="42%" cy="34%" r="70%">
            <stop offset="0%" stopColor={palette.core[0]} />
            <stop offset="55%" stopColor={palette.ring} stopOpacity="0.85" />
            <stop offset="100%" stopColor={palette.core[1]} stopOpacity="0.55" />
          </radialGradient>
          <linearGradient id={`stroke-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={palette.accent} />
            <stop offset="55%" stopColor={palette.ring} />
            <stop offset="100%" stopColor={palette.accent2} />
          </linearGradient>
          <linearGradient id={`arc-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={palette.core[0]} />
            <stop offset="50%" stopColor={palette.accent} />
            <stop offset="100%" stopColor={palette.accent2} />
          </linearGradient>
          <filter id={`soft-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>

        {/* aura */}
        <circle cx={CENTER} cy={CENTER} r="152" fill={`url(#halo-${uid})`} className={reduced ? undefined : 'halo-breathe'} />

        {/* constellation halo */}
        {relic.constellation && (
          <g style={depth(1.4)} opacity="0.8">
            {Array.from({ length: 22 }, (_, i) => {
              const angle = (i / 22) * Math.PI * 2;
              const radius = 132 + ((i * 29) % 22);
              const { x, y } = polar(CENTER, CENTER, radius, angle);
              return <circle key={`c-${i}`} cx={x} cy={y} r={i % 5 === 0 ? 1.9 : 1.05} fill={palette.accent} opacity={0.35 + (i % 4) * 0.12} />;
            })}
            <circle cx={CENTER} cy={CENTER} r="134" fill="none" stroke={palette.accent} strokeOpacity="0.14" strokeWidth="0.6" strokeDasharray="1 7" />
          </g>
        )}

        {/* corona rays */}
        {relic.corona && (
          <g className={reduced ? undefined : 'halo-breathe'} opacity="0.55" style={depth(0.8)}>
            {Array.from({ length: 48 }, (_, i) => {
              const angle = (i / 48) * Math.PI * 2;
              const inner = 112;
              const outer = 112 + (i % 3 === 0 ? 30 : i % 2 === 0 ? 20 : 12);
              const a = polar(CENTER, CENTER, inner, angle);
              const b = polar(CENTER, CENTER, outer, angle);
              return (
                <line
                  key={`ray-${i}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={i % 2 === 0 ? palette.accent : palette.accent2}
                  strokeOpacity={i % 4 === 0 ? 0.55 : 0.28}
                  strokeWidth={i % 4 === 0 ? 1.6 : 0.8}
                  strokeLinecap="round"
                />
              );
            })}
          </g>
        )}

        {/* astrolabe ticks */}
        {relic.astrolabe && (
          <g
            style={depth(1.1)}
            className={reduced ? undefined : 'animate-spin-slower'}
          >
            {Array.from({ length: 36 }, (_, i) => {
              const angle = (i / 36) * Math.PI * 2;
              const inner = i % 3 === 0 ? 122 : 128;
              const a = polar(CENTER, CENTER, inner, angle);
              const b = polar(CENTER, CENTER, 134, angle);
              return (
                <line
                  key={`tick-${i}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={palette.ring}
                  strokeOpacity={i % 3 === 0 ? 0.5 : 0.22}
                  strokeWidth={i % 3 === 0 ? 1.4 : 0.7}
                />
              );
            })}
          </g>
        )}

        {/* orbital rings */}
        <g style={depth(0.7)}>
          {Array.from({ length: ringCount }, (_, i) => {
            const radius = 118 - i * 13;
            return (
              <circle
                key={`ring-${i}`}
                cx={CENTER}
                cy={CENTER}
                r={radius}
                fill="none"
                stroke={`url(#stroke-${uid})`}
                strokeOpacity={Math.max(0.16, 0.6 - i * 0.1)}
                strokeWidth={i === 0 ? 1.8 : 1.1}
                strokeDasharray={i % 2 === 0 ? '2 6' : '34 12 4 12'}
                strokeLinecap="round"
                className={reduced ? undefined : i % 2 === 0 ? 'ring-dash' : 'animate-spin-reverse'}
                style={i % 2 === 0 ? undefined : { transformOrigin: '160px 160px', animationDuration: `${38 + i * 12}s` }}
              />
            );
          })}
        </g>

        {/* progress arc to next tier */}
        {p !== null && (
          <g>
            <circle cx={CENTER} cy={CENTER} r={arcRadius} fill="none" stroke={palette.line} strokeOpacity="0.5" strokeWidth="3" />
            <circle
              cx={CENTER}
              cy={CENTER}
              r={arcRadius}
              fill="none"
              stroke={`url(#arc-${uid})`}
              strokeWidth="3.4"
              strokeLinecap="round"
              strokeDasharray={`${(circumference * p).toFixed(2)} ${circumference.toFixed(2)}`}
              transform={`rotate(-90 ${CENTER} ${CENTER})`}
              style={{ transition: 'stroke-dasharray 900ms ease', filter: `drop-shadow(0 0 6px ${palette.accent})` }}
            />
            {p > 0.02 && (
              <circle
                cx={polar(CENTER, CENTER, arcRadius, -Math.PI / 2 + p * Math.PI * 2).x}
                cy={polar(CENTER, CENTER, arcRadius, -Math.PI / 2 + p * Math.PI * 2).y}
                r="4.6"
                fill={palette.core[0]}
                filter={`url(#soft-${uid})`}
                opacity="0.9"
              />
            )}
          </g>
        )}

        {/* prism refraction arcs */}
        {relic.prism && (
          <g style={depth(0.5)} className={reduced ? undefined : 'animate-spin-slow'} opacity="0.7">
            {[118, 126, 134].map((radius, i) => (
              <circle
                key={`prism-${i}`}
                cx={CENTER}
                cy={CENTER}
                r={radius}
                fill="none"
                stroke={[palette.accent2, palette.accent3, palette.accent][i]}
                strokeOpacity="0.4"
                strokeWidth="1"
                strokeDasharray={`${20 + i * 8} ${60 - i * 6}`}
                strokeLinecap="round"
              />
            ))}
          </g>
        )}

        {/* crystal core */}
        <g style={depth(0.3)}>
          <circle cx={CENTER} cy={CENTER} r="66" fill="none" stroke={palette.ring} strokeOpacity="0.18" strokeWidth="0.8" />
          <circle cx={CENTER} cy={CENTER} r="52" fill={palette.ring} opacity="0.12" filter={`url(#soft-${uid})`} />
          <polygon
            points={polygonPoints(48, relic.facets, -Math.PI / 2)}
            fill={`url(#core-${uid})`}
            stroke={palette.accent}
            strokeOpacity="0.75"
            strokeWidth="1.2"
            style={{ transition: 'fill 900ms ease, stroke 900ms ease' }}
          />
          <polygon
            points={polygonPoints(30, Math.max(3, Math.round(relic.facets / 2)), -Math.PI / 2)}
            fill="none"
            stroke={palette.core[0]}
            strokeOpacity="0.65"
            strokeWidth="0.9"
          />
          <polygon points={polygonPoints(15, 4, -Math.PI / 2)} fill={palette.core[0]} opacity="0.92" />
          <circle cx={CENTER} cy={CENTER} r="4" fill="#ffffff" opacity="0.95" />
          {relic.facets >= 14 && (
            <circle cx={CENTER} cy={CENTER} r="70" fill="none" stroke={palette.accent2} strokeOpacity="0.3" strokeWidth="0.7" strokeDasharray="1 5" />
          )}
        </g>
      </svg>
    </div>
  );
}
