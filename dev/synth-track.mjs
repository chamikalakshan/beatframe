#!/usr/bin/env node
// Synthesizes a short drum-and-chords track with known beats, bars and a drop.
// Used by the tests and for the demo video; the output is generated here, so it is CC0.
// Usage: node dev/synth-track.mjs out.wav|out.mp3 [--bpm 120] [--lead 0.3]
import { writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CHORDS = [[220, 261.63, 329.63], [174.61, 220, 261.63], [196, 261.63, 329.63], [196, 246.94, 293.66]];

// Bars: 1-4 intro (hats + pads), 5-12 full beat (the drop is bar 5), 13-14 breakdown, 15-16 outro with a fade.
export function synth({ bpm = 120, lead = 0.3, sr = 44100 } = {}) {
  const beat = 60 / bpm, bar = 4 * beat, bars = 16, duration = lead + bars * bar + 0.5;
  const y = new Float32Array(Math.ceil(duration * sr));
  let seed = 1, last = 0;
  const noise = () => { seed = (seed * 16807) % 2147483647; return seed / 1073741823.5 - 1; };
  const hiss = () => { const n = noise(), d = n - last; last = n; return d / 2; }; // high-passed, like real cymbals
  for (let i = 0; i < y.length; i++) {
    const t = i / sr - lead;
    if (t < 0) continue;
    const barIdx = Math.floor(t / bar), inBar = t - barIdx * bar, beatIdx = Math.floor(inBar / beat), tb = inBar - beatIdx * beat;
    if (barIdx >= bars) continue;
    const main = barIdx >= 4 && barIdx < 12, outro = barIdx >= 14;
    let s = 0;
    const th = tb % (beat / 2), offbeat = tb >= beat / 2;
    if (barIdx < 15) s += hiss() * Math.exp(-th * 60) * (offbeat ? 0.2 : 0.14);
    const chord = CHORDS[barIdx % 4];
    const padEnv = (1 - Math.exp(-inBar * 20)) * Math.exp(-inBar * 0.3) * (main ? 1 : 0.8);
    for (const f of chord) s += Math.sin(2 * Math.PI * f * t) * 0.045 * padEnv;
    if (main || outro) {
      const phase = 2 * Math.PI * (50 * tb + (120 / 35) * (1 - Math.exp(-35 * tb)));
      s += Math.sin(phase) * Math.exp(-tb * 9) * (beatIdx === 0 ? 1 : 0.7);
    }
    if (main) {
      if (beatIdx === 1 || beatIdx === 3) s += hiss() * Math.exp(-tb * 18) * 0.5 + Math.sin(2 * Math.PI * 180 * tb) * Math.exp(-tb * 20) * 0.2;
      s += Math.sin(2 * Math.PI * chord[0] / 4 * t) * 0.3 * Math.exp(-tb * 3);
    }
    if (barIdx === 15) s *= 1 - inBar / bar;
    y[i] = s;
  }
  let peak = 0;
  for (const v of y) peak = Math.max(peak, Math.abs(v));
  for (let i = 0; i < y.length; i++) y[i] *= 0.9 / peak;
  const beats = Array.from({ length: bars * 4 }, (_, k) => lead + k * beat);
  return { samples: y, sr, duration, bpm, beats, downbeats: beats.filter((_, k) => k % 4 === 0), drop: lead + 4 * bar };
}

export function wav(samples, sr) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + samples.length * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  return buf;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values: o, positionals } = parseArgs({ allowPositionals: true, options: { bpm: { type: 'string', default: '120' }, lead: { type: 'string', default: '0.3' } } });
  const out = positionals[0] ?? 'demo-track.wav';
  const s = synth({ bpm: +o.bpm, lead: +o.lead });
  const wavPath = out.endsWith('.wav') ? out : out + '.tmp.wav';
  writeFileSync(wavPath, wav(s.samples, s.sr));
  if (wavPath !== out) {
    const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', wavPath, '-b:a', '192k', out], { stdio: 'inherit' });
    spawnSync('rm', [wavPath]);
    if (r.status !== 0) process.exit(1);
  }
  console.log(`${out}: ${s.duration.toFixed(2)} s at ${s.bpm} BPM, drop at ${s.drop} s`);
}
