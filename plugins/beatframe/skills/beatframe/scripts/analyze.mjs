#!/usr/bin/env node
// Basic-mode analyzer: a song in, timing.json and a short report for Claude out.
// Usage: node analyze.mjs <audio> [--out timing.json] [--report timing-report.md]
//        [--lyrics lyrics.srt|.lrc] [--meter 4] [--bpm 128] [--bpm-min 60] [--bpm-max 200]
//        [--first-bar N]   (beat number where bar 1 starts, when the downbeat guess is wrong)
import { writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { decode } from './lib/audio.mjs';
import { SR, FPS, features, onsetEnvelope, normalizeStd, estimateTempo, trackBeats, trimSilentBeats, downbeatPhase, pickPeaks, findHits, energyCurve } from './lib/dsp.mjs';
import { loadLyrics } from './lib/lyrics.mjs';
import { timingReport } from './lib/report.mjs';

export const GENERATOR = 'beatframe-analyze/0.1.1';
const r3 = x => Math.round(x * 1000) / 1000;

export async function analyze(file, { lyrics, meter = 4, bpm, bpmMin = 60, bpmMax = 200, firstBar } = {}) {
  const y = await decode(file, SR);
  if (y.length < SR) throw new Error(`${file} is shorter than one second.`);
  const duration = y.length / SR;
  const { flux, low, db } = features(y);
  const env = onsetEnvelope(flux), lowN = normalizeStd(low), lowEnv = onsetEnvelope(low);
  // Beats prefer kick-band onsets over hi-hats.
  const beatEnv = env.map((v, i) => v + lowEnv[i]);
  const first = bpm ?? estimateTempo(env, lowEnv, { min: bpmMin, max: bpmMax });
  let beatFrames = trimSilentBeats(trackBeats(beatEnv, first), db);
  // Second pass at the tempo the beats actually settled on (corrects a slightly-off first estimate).
  const settled = typicalTempo(beatFrames, first);
  if (!bpm && Math.abs(settled / first - 1) > 0.002) beatFrames = trimSilentBeats(trackBeats(beatEnv, settled), db);
  const beats = beatFrames.map(f => r3(f / FPS));
  const phase = firstBar ? firstBar - 1 : downbeatPhase(beatFrames, lowN, meter);
  const tempo = Math.round(typicalTempo(beatFrames, first) * 10) / 10;
  return {
    version: 1,
    generator: GENERATOR,
    quality: 'basic',
    source: basename(file),
    duration: r3(duration),
    tempo,
    meter,
    beats,
    downbeats: beats.filter((_, i) => i >= phase && (i - phase) % meter === 0),
    onsets: pickPeaks(env, { delta: 0.5 }).map(f => r3(f / FPS)),
    kicks: pickPeaks(lowN, { delta: 1, wait: 6 }).map(f => r3(f / FPS)),
    hits: findHits(db, beats, duration).map(h => ({ t: r3(h.t), strength: Math.round(h.strength * 10) / 10 })),
    sections: [],
    markers: {},
    lyrics: lyrics ? { source: basename(lyrics), lines: loadLyrics(lyrics, r3(duration)) } : null,
    energy: { rate: 10, values: energyCurve(db, r3(duration), 10) },
  };
}

// Mean tempo over the beat gaps within 6% of the expected period. Ignores the odd skipped,
// doubled or rubato beat, which would skew a simple span / count average.
function typicalTempo(frames, bpm) {
  const p = 60 * FPS / bpm, gaps = frames.slice(1).map((f, i) => f - frames[i]).filter(g => Math.abs(g / p - 1) <= 0.06);
  return gaps.length >= 4 ? 60 * FPS * gaps.length / gaps.reduce((a, b) => a + b, 0) : bpm;
}

// One top-level key per line keeps the file readable and diffable without exploding long arrays.
export function formatTiming(t) {
  return '{\n' + Object.entries(t).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n') + '\n}\n';
}

async function main() {
  const { values: o, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      out: { type: 'string', default: 'timing.json' },
      report: { type: 'string' },
      lyrics: { type: 'string' },
      meter: { type: 'string', default: '4' },
      bpm: { type: 'string' },
      'bpm-min': { type: 'string', default: '60' },
      'bpm-max': { type: 'string', default: '200' },
      'first-bar': { type: 'string' },
    },
  });
  if (!positionals[0]) {
    console.error('Usage: node analyze.mjs <audio> [--out timing.json] [--report timing-report.md] [--lyrics file.srt|.lrc] [--meter 4] [--bpm N] [--first-bar N]');
    process.exit(1);
  }
  const t = await analyze(positionals[0], {
    lyrics: o.lyrics, meter: +o.meter, bpm: o.bpm ? +o.bpm : undefined, bpmMin: +o['bpm-min'], bpmMax: +o['bpm-max'],
    firstBar: o['first-bar'] ? +o['first-bar'] : undefined,
  });
  writeFileSync(o.out, formatTiming(t));
  const report = o.report ?? o.out.replace(/\.json$/, '') + '-report.md';
  writeFileSync(report, timingReport(t));
  console.log(`${t.source}: ${t.duration} s, ${t.tempo} BPM, ${t.beats.length} beats, ${t.downbeats.length} bars, ${t.hits.length} hits${t.lyrics ? `, ${t.lyrics.lines.length} lyric lines` : ''}`);
  console.log(`Wrote ${o.out} and ${report}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(e => { console.error(e.message); process.exit(1); });
}
