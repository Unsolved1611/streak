/**
 * Ambient HTML5 canvas background. The behaviour (mode, density, palette,
 * speed) is driven entirely by the active tier, so every 24h – 30d milestone
 * physically changes the atmosphere behind the app.
 */

import { useEffect, useRef } from 'react';
import type { ParticleConfig, ParticleMode } from '../lib/tiers';

interface ParticleFieldProps {
  config: ParticleConfig;
  tierId: string;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
  color: string;
  phase: number;
  twinkle: number;
}

interface Blob {
  orbit: number;
  angle: number;
  speed: number;
  radius: number;
  color: string;
  alpha: number;
  squash: number;
}

const linkModes: ParticleMode[] = ['aurora', 'star', 'nebula', 'prism'];

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

export default function ParticleField({ config, tierId, className = '' }: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = prefersReducedMotion();
    let width = 0;
    let height = 0;
    let raf = 0;
    let particles: Particle[] = [];
    let blobs: Blob[] = [];
    let last = performance.now();
    let elapsed = 0;

    const dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);

    const seed = () => {
      const density = Math.min(1, (width * height) / (420 * 780));
      const count = Math.max(6, Math.round(config.count * Math.min(1.15, Math.max(0.45, density))));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: rand(-0.25, 0.25),
        vy: rand(-0.4, 0.4),
        r: rand(config.size[0], config.size[1]),
        alpha: rand(0.25, 1) * config.alpha,
        color: config.colors[Math.floor(Math.random() * config.colors.length)],
        phase: Math.random() * Math.PI * 2,
        twinkle: rand(0.6, 2.2),
      }));

      const blobCount = config.mode === 'nebula' ? 5 : config.mode === 'corona' ? 3 : config.mode === 'prism' ? 4 : 0;
      blobs = Array.from({ length: blobCount }, (_, i) => ({
        orbit: rand(0.1, 0.4) * Math.min(width, height),
        angle: (i / Math.max(1, blobCount)) * Math.PI * 2,
        speed: rand(0.05, 0.16) * (i % 2 === 0 ? 1 : -1),
        radius: rand(0.16, 0.36) * Math.min(width, height),
        color: config.colors[i % config.colors.length],
        alpha: config.mode === 'corona' ? 0.16 : 0.1,
        squash: rand(0.55, 1),
      }));
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const stepParticle = (p: Particle, dt: number) => {
      const t = elapsed;
      const s = config.speed * 60 * dt;
      switch (config.mode) {
        case 'dust':
          p.x += Math.sin(t * 0.25 + p.phase) * 0.06 * s;
          p.y += Math.cos(t * 0.2 + p.phase) * 0.05 * s;
          break;
        case 'spark':
        case 'mote':
        case 'prism':
          p.y -= (0.35 + p.r * 0.16) * s;
          p.x += Math.sin(t * 0.6 + p.phase) * 0.22 * s;
          break;
        case 'aurora':
          p.x += (0.18 + p.r * 0.05) * s;
          p.y += Math.sin(t * 0.45 + p.phase) * 0.3 * s;
          break;
        case 'star':
          p.x += Math.cos(t * 0.1 + p.phase) * 0.03 * s;
          p.y += Math.sin(t * 0.08 + p.phase) * 0.03 * s;
          break;
        case 'nebula': {
          const cx = width / 2;
          const cy = height / 2;
          const dx = p.x - cx;
          const dy = p.y - cy;
          const angle = Math.atan2(dy, dx) + 0.0016 * s;
          const dist = Math.hypot(dx, dy);
          p.x = cx + Math.cos(angle) * dist;
          p.y = cy + Math.sin(angle) * dist;
          break;
        }
        case 'corona': {
          const cx = width / 2;
          const cy = height * 0.42;
          const dx = p.x - cx;
          const dy = p.y - cy;
          const dist = Math.hypot(dx, dy) || 1;
          p.x += (dx / dist) * 0.25 * s;
          p.y += (dy / dist) * 0.25 * s - 0.1 * s;
          break;
        }
        default:
          break;
      }

      if (p.x < -20) p.x = width + 20;
      if (p.x > width + 20) p.x = -20;
      if (p.y < -30) {
        p.y = height + 20;
        p.x = Math.random() * width;
      }
      if (p.y > height + 30) {
        p.y = -20;
        p.x = Math.random() * width;
      }
    };

    const draw = (dt: number) => {
      ctx.clearRect(0, 0, width, height);
      const px = (pointerRef.current.x - 0.5) * 14;
      const py = (pointerRef.current.y - 0.5) * 14;

      ctx.globalCompositeOperation = 'lighter';

      for (const blob of blobs) {
        const cx = width / 2 + Math.cos(blob.angle + elapsed * blob.speed) * blob.orbit + px;
        const cy = height * 0.42 + Math.sin(blob.angle + elapsed * blob.speed) * blob.orbit * blob.squash + py;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, blob.radius);
        grad.addColorStop(0, blob.color);
        grad.addColorStop(1, 'transparent');
        ctx.globalAlpha = blob.alpha;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, blob.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const p of particles) {
        stepParticle(p, dt);
        const pulse =
          config.mode === 'star' || config.mode === 'dust'
            ? 0.55 + 0.45 * Math.sin(elapsed * p.twinkle + p.phase * 2)
            : 0.75 + 0.25 * Math.sin(elapsed * 1.2 + p.phase);
        const x = p.x + px * (0.4 + p.r * 0.1);
        const y = p.y + py * (0.4 + p.r * 0.1);

        if (p.r > 1.4) {
          const glow = ctx.createRadialGradient(x, y, 0, x, y, p.r * 5);
          glow.addColorStop(0, p.color);
          glow.addColorStop(1, 'transparent');
          ctx.globalAlpha = Math.min(1, p.alpha * pulse * 0.7);
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(x, y, p.r * 5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.globalAlpha = Math.min(1, p.alpha * pulse);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(x, y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (config.links && linkModes.includes(config.mode)) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineWidth = 0.6;
        for (let i = 0; i < particles.length; i += 1) {
          for (let j = i + 1; j < particles.length; j += 1) {
            const a = particles[i];
            const b = particles[j];
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const dist2 = dx * dx + dy * dy;
            if (dist2 < 90 * 90) {
              const alpha = (1 - Math.sqrt(dist2) / 90) * 0.12;
              ctx.globalAlpha = alpha;
              ctx.strokeStyle = a.color;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
        }
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    };

    const loop = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      elapsed += dt;
      draw(dt);
      raf = window.requestAnimationFrame(loop);
    };

    resize();
    if (reduced) {
      draw(0);
    } else {
      raf = window.requestAnimationFrame(loop);
    }

    const handleResize = () => resize();
    const handlePointer = (event: PointerEvent) => {
      pointerRef.current = {
        x: event.clientX / Math.max(1, window.innerWidth),
        y: event.clientY / Math.max(1, window.innerHeight),
      };
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('pointermove', handlePointer, { passive: true });

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointer);
    };
  }, [config, tierId]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-0 h-full w-full ${className}`}
      style={{ transition: 'opacity 900ms ease' }}
    />
  );
}
