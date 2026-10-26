// Beat-reactive building blocks. Everything is driven by the song clock, never by CSS animations or Math.random,
// so every frame renders the same in Studio, in stills and in the final video.
import React from 'react';
import { AbsoluteFill, random, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { useLayout } from './layout';
import { lastIndexAtOrBefore, PulseKind, usePulse, useSceneTime, useSongTime, useTiming } from './timing';

/** Mixes two colours (#rgb, #rrggbb or rgb()/rgba()); t = 0 gives a, t = 1 gives b. */
export function mix(a: string, b: string, t: number): string {
  const pa = parseColor(a), pb = parseColor(b);
  if (!pa || !pb) return t < 0.5 ? a : b;
  const c = pa.map((v, i) => v + (pb[i] - v) * Math.max(0, Math.min(1, t)));
  return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${c[3].toFixed(3)})`;
}

function parseColor(s: string): number[] | null {
  s = s.trim();
  let m = s.match(/^#([0-9a-f]{3,8})$/i);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map(x => x + x).join('');
    const n = parseInt(h.slice(0, 6), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1];
  }
  m = s.match(/^rgba?\(([^)]+)\)$/i);
  if (m) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
    return [p[0], p[1], p[2], p[3] ?? 1];
  }
  return null;
}

/** Springs from 0 to 1 at the start of the current scene (plus `delay` seconds). */
export function usePop(delay = 0, damping = 12): number {
  const frame = useCurrentFrame(), { fps } = useVideoConfig();
  return spring({ frame: frame - Math.round(delay * fps), fps, config: { damping } });
}

/** A CSS translate that jolts on each event of `kind` and settles. `amount` is in layout units (1% of the short side). */
export function useShake(kind: PulseKind = 'kick', amount = 1, decay = 12): string {
  const p = usePulse(kind, decay), L = useLayout(), t = useTiming(), now = useSongTime();
  const list = kind === 'beat' ? t.beats : kind === 'bar' ? t.downbeats : kind === 'kick' ? t.kicks : kind === 'onset' ? t.onsets : t.hits.map(h => h.t);
  const i = lastIndexAtOrBefore(list, now);
  const x = (random(`shake-x-${kind}-${i}`) - 0.5) * 2 * amount * L.unit * p, y = (random(`shake-y-${kind}-${i}`) - 0.5) * 2 * amount * L.unit * p;
  return `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
}

/** Full-frame sunburst. `spin` is in turns per second. */
export const Burst: React.FC<{ colors: [string, string]; rays?: number; spin?: number; cx?: number; cy?: number }> = ({ colors, rays = 16, spin = 0.03, cx, cy }) => {
  const L = useLayout(), t = useSongTime(), r = Math.hypot(L.width, L.height);
  const x = cx ?? L.cx, y = cy ?? L.cy, wedges = [];
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * 2 * Math.PI, b = a + Math.PI / rays;
    wedges.push(<path key={i} d={`M0 0L${Math.cos(a) * r} ${Math.sin(a) * r}L${Math.cos(b) * r} ${Math.sin(b) * r}Z`} fill={colors[1]} />);
  }
  return (
    <AbsoluteFill style={{ background: colors[0] }}>
      <svg width={L.width} height={L.height}>
        <g transform={`translate(${x} ${y}) rotate(${(t * spin * 360) % 360})`}>{wedges}</g>
      </svg>
    </AbsoluteFill>
  );
};

/** A full-screen flash on each event of `kind` (a hit by default). */
export const Flash: React.FC<{ kind?: PulseKind; color?: string; strength?: number; decay?: number }> = ({ kind = 'hit', color = '#fff', strength = 0.85, decay = 6 }) => {
  const p = usePulse(kind, decay);
  return p > 0.01 ? <AbsoluteFill style={{ background: color, opacity: p * strength, pointerEvents: 'none' }} /> : null;
};

/** Rings that grow out of a point on each event of `kind`. */
export const Rings: React.FC<{ kind?: PulseKind; color: string; count?: number; speed?: number; width?: number; cx?: number; cy?: number }> = ({ kind = 'beat', color, count = 4, speed = 60, width = 1.2, cx, cy }) => {
  const t = useTiming(), now = useSongTime(), L = useLayout();
  const list = kind === 'beat' ? t.beats : kind === 'bar' ? t.downbeats : kind === 'kick' ? t.kicks : kind === 'onset' ? t.onsets : t.hits.map(h => h.t);
  const i = lastIndexAtOrBefore(list, now), rings = [];
  for (let k = Math.max(0, i - count + 1); k <= i; k++) {
    const age = now - list[k], r = age * speed * L.unit, o = Math.max(0, 1 - age / (count * 0.5));
    rings.push(<circle key={k} cx={cx ?? L.cx} cy={cy ?? L.cy} r={r} fill="none" stroke={color} strokeWidth={width * L.unit} opacity={o} />);
  }
  return <AbsoluteFill><svg width={L.width} height={L.height}>{rings}</svg></AbsoluteFill>;
};

/** Falling confetti, starting when the current scene starts. Deterministic for a given `seed`. */
export const Confetti: React.FC<{ colors: string[]; count?: number; seed?: string; speed?: number }> = ({ colors, count = 70, seed = 'confetti', speed = 35 }) => {
  const L = useLayout(), t = useSceneTime(), bits = [];
  for (let i = 0; i < count; i++) {
    const r = (k: string) => random(`${seed}-${i}-${k}`);
    const size = (0.8 + r('s') * 1.6) * L.unit, x = r('x') * L.width + Math.sin(t * 2 + r('p') * 6) * 3 * L.unit;
    const y = -size * 2 + (t * (0.6 + r('v')) * speed * L.unit) - r('d') * L.height * 0.6;
    if (y < -size * 2 || y > L.height + size) continue;
    bits.push(<rect key={i} x={x} y={y} width={size} height={size * 0.6} fill={colors[i % colors.length]} transform={`rotate(${(t * 200 * (r('r') - 0.5)) % 360} ${x} ${y})`} />);
  }
  return <AbsoluteFill><svg width={L.width} height={L.height}>{bits}</svg></AbsoluteFill>;
};
