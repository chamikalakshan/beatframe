// Turns timing labels into seconds, so scenes say "L5" or "hit:2+1bar" instead of 83.4.
//
//   label  := base offset*
//   base   := 12.5 | 12.5s | start | end
//           | beat:N | bar:N | hit:N | onset:N | kick:N         (1-based)
//           | LN (lyric line N) | section:NAME | section:NAME:K | section:N | m:NAME (marker)
//           | LN.end | bar:N.end | beat:N.end | section:... .end
//   offset := +2beats | -1bar | +0.5s | +1beat | -2bars
//
// Beat and bar offsets use the song tempo. Plain TypeScript with no imports, so Node scripts can load it too.
import type { Timing } from './types.ts';

const NUM = String.raw`\d+(?:\.\d+)?`;
const OFFSET = new RegExp(String.raw`([+-])\s*(${NUM})\s*(s|beats?|bars?)\s*$`);

export function resolveLabel(timing: Timing, label: string | number): number {
  if (typeof label === 'number') return label;
  let rest = label.trim(), total = 0;
  for (let m = rest.match(OFFSET); m && m.index! > 0; m = rest.match(OFFSET)) {
    const sign = m[1] === '-' ? -1 : 1, n = parseFloat(m[2]), unit = m[3];
    const beat = 60 / timing.tempo;
    total += sign * n * (unit === 's' ? 1 : unit.startsWith('beat') ? beat : beat * timing.meter);
    rest = rest.slice(0, m.index).trim();
  }
  return base(timing, rest, label) + total;
}

function base(t: Timing, s: string, whole: string): number {
  const fail = (why: string): never => { throw new Error(`Timing label "${whole}": ${why}`); };
  if (new RegExp(`^${NUM}s?$`).test(s)) return parseFloat(s);
  if (s === 'start') return 0;
  if (s === 'end') return t.duration;

  const isEnd = s.endsWith('.end');
  if (isEnd) s = s.slice(0, -4);

  let m = s.match(/^L(\d+)$/i);
  if (m) {
    const lines = t.lyrics?.lines ?? [];
    const line = lines[+m[1] - 1] ?? fail(lines.length ? `there are only ${lines.length} lyric lines (L1-L${lines.length})` : 'this project has no lyrics');
    return isEnd ? line.end : line.start;
  }

  m = s.match(/^(beat|bar|hit|onset|kick):(\d+)$/);
  if (m) {
    const kind = m[1], i = +m[2] - 1;
    if (i < 0) fail('numbers start at 1');
    if (kind === 'hit' || kind === 'onset' || kind === 'kick') {
      if (isEnd) fail(`${kind} has no end`);
      const list = kind === 'hit' ? t.hits.map(h => h.t) : kind === 'onset' ? t.onsets : t.kicks;
      return list[i] ?? fail(`there are only ${list.length} ${kind}s`);
    }
    const list = kind === 'beat' ? t.beats : t.downbeats;
    const step = (60 / t.tempo) * (kind === 'beat' ? 1 : t.meter);
    const at = (k: number) => (k < list.length ? list[k] : list.length ? list[list.length - 1] + (k - list.length + 1) * step : k * step);
    return isEnd ? at(i + 1) : at(i);
  }

  m = s.match(/^section:([^:]+)(?::(\d+))?$/);
  if (m) {
    const name = m[1], k = m[2] ? +m[2] : 1;
    const sec = /^\d+$/.test(name) && !m[2]
      ? t.sections[+name - 1]
      : t.sections.filter(x => x.name === name)[k - 1];
    if (!sec) fail(t.sections.length ? `no such section (have: ${[...new Set(t.sections.map(x => x.name))].join(', ')})` : 'timing.json has no sections');
    return isEnd ? sec!.end : sec!.start;
  }

  m = s.match(/^m:(.+)$/);
  if (m) {
    if (isEnd) fail('markers have no end');
    const v = t.markers?.[m[1]];
    return v ?? fail(`no marker "${m[1]}" in timing.json`);
  }

  return fail('unknown label. Use seconds, start, end, beat:N, bar:N, hit:N, LN, section:NAME or m:NAME, plus offsets like +2beats');
}

export const labelToFrame = (timing: Timing, label: string | number, fps: number) => Math.round(resolveLabel(timing, label) * fps);
