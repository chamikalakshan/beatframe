// Loads timing.json and gives scenes the song's clock: beats, pulses, energy, lyrics and labels.
// Every hook works in song time (seconds from the start of the audio), also inside <At> and <Sequence>.
import React, { createContext, useContext, useEffect, useState } from 'react';
import { staticFile, useCurrentFrame, useDelayRender, useVideoConfig } from 'remotion';
import { resolveLabel } from './labels';
import type { LyricLine, Timing } from './types';

const TimingContext = createContext<Timing | null>(null);
// Song-time frame where the nearest enclosing <At> starts (Remotion's useCurrentFrame is relative to it).
export const OffsetContext = createContext(0);

export const TimingProvider: React.FC<{ src: string; children: React.ReactNode }> = ({ src, children }) => {
  const [timing, setTiming] = useState<Timing | null>(null);
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender(`Loading ${src}`));
  useEffect(() => {
    fetch(staticFile(src))
      .then(r => { if (!r.ok) throw new Error(`Could not load public/${src} (${r.status}). Run the Beatframe analyzer first.`); return r.json(); })
      .then((t: Timing) => { setTiming(t); continueRender(handle); })
      .catch(e => cancelRender(e));
  }, [src, handle, continueRender, cancelRender]);
  return timing ? <TimingContext.Provider value={timing}>{children}</TimingContext.Provider> : null;
};

export function useTiming(): Timing {
  const t = useContext(TimingContext);
  if (!t) throw new Error('useTiming() must be used inside <TimingProvider>.');
  return t;
}

/** Seconds since the start of the song (not since the start of the current scene). */
export function useSongTime(): number {
  const frame = useCurrentFrame(), offset = useContext(OffsetContext), { fps } = useVideoConfig();
  return (frame + offset) / fps;
}

/** Seconds since the start of the current <At> scene. */
export function useSceneTime(): number {
  return useCurrentFrame() / useVideoConfig().fps;
}

/** Converts a label ("L5", "hit:2", "bar:9+2beats") to song seconds. */
export function useLabel(): (label: string | number) => number {
  const t = useTiming();
  return label => resolveLabel(t, label);
}

/** Index of the last value <= x in a sorted list, or -1. */
export function lastIndexAtOrBefore(list: number[], x: number): number {
  let lo = 0, hi = list.length - 1, ans = -1;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (list[mid] <= x) { ans = mid; lo = mid + 1; } else hi = mid - 1; }
  return ans;
}

export type BeatInfo = {
  /** 1-based beat number, 0 before the first beat. */
  beat: number;
  /** 1-based bar number, 0 before bar 1 (pickup beats). */
  bar: number;
  /** Position in the bar, 1..meter (0 before bar 1). */
  beatInBar: number;
  /** 0..1 progress through the current beat. */
  phase: number;
  /** 0..1 progress through the current bar. */
  barPhase: number;
  /** Seconds per beat. */
  beatLength: number;
};

export function useBeat(): BeatInfo {
  const t = useTiming(), now = useSongTime();
  const beatLength = 60 / t.tempo, i = lastIndexAtOrBefore(t.beats, now), b = lastIndexAtOrBefore(t.downbeats, now);
  const next = (list: number[], k: number, step: number) => list[k + 1] ?? list[k] + step;
  const phase = i < 0 ? 0 : Math.min(1, (now - t.beats[i]) / (next(t.beats, i, beatLength) - t.beats[i]));
  const barPhase = b < 0 ? 0 : Math.min(1, (now - t.downbeats[b]) / (next(t.downbeats, b, beatLength * t.meter) - t.downbeats[b]));
  const beatInBar = b < 0 ? 0 : lastIndexAtOrBefore(t.beats, now) - lastIndexAtOrBefore(t.beats, t.downbeats[b] + 1e-6) + 1;
  return { beat: i + 1, bar: b + 1, beatInBar, phase, barPhase, beatLength };
}

export type PulseKind = 'beat' | 'bar' | 'kick' | 'onset' | 'hit' | 'lyric';

/** 1 right on an event, decaying towards 0 afterwards: exp(-decay * seconds since the last event). */
export function usePulse(kind: PulseKind = 'beat', decay = 8): number {
  const t = useTiming(), now = useSongTime();
  const list = kind === 'beat' ? t.beats : kind === 'bar' ? t.downbeats : kind === 'kick' ? t.kicks
    : kind === 'onset' ? t.onsets : kind === 'hit' ? t.hits.map(h => h.t) : (t.lyrics?.lines ?? []).map(l => l.start);
  const i = lastIndexAtOrBefore(list, now);
  return i < 0 ? 0 : Math.exp(-decay * (now - list[i]));
}

/** Loudness 0..1 at the current moment, smoothly interpolated. */
export function useEnergy(): number {
  const { energy } = useTiming(), now = useSongTime();
  const x = now * energy.rate, i = Math.floor(x), f = x - i, v = energy.values;
  if (!v.length) return 0;
  const a = v[Math.max(0, Math.min(v.length - 1, i))], b = v[Math.max(0, Math.min(v.length - 1, i + 1))];
  return a + (b - a) * f;
}

export type LyricState = LyricLine & { index: number; label: string; progress: number };

/** The lyric line being sung now (with 1-based index and 0..1 progress), or null between lines. */
export function useLyric(): LyricState | null {
  const t = useTiming(), now = useSongTime(), lines = t.lyrics?.lines ?? [];
  const i = lastIndexAtOrBefore(lines.map(l => l.start), now);
  if (i < 0 || now > lines[i].end) return null;
  const l = lines[i];
  return { ...l, index: i + 1, label: `L${i + 1}`, progress: Math.min(1, (now - l.start) / Math.max(0.001, l.end - l.start)) };
}
