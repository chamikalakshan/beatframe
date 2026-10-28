#!/usr/bin/env node
// Creates a Beatframe video project: copies the Remotion starter, adds the song, analyzes it,
// and writes a first scene list that already follows the song (title, bars, hits, lyrics, outro).
// Usage: node new-project.mjs <dir> --audio song.mp3 [--lyrics lyrics.srt|.lrc] [--title "..."] [--subtitle "..."]
//        [--format 16:9|9:16|1:1] [--bpm N] [--first-bar N]
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { analyze, formatTiming } from './analyze.mjs';
import { timingReport } from './lib/report.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const STARTER = join(here, '..', 'assets', 'starter');

const { values: o, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    audio: { type: 'string' }, lyrics: { type: 'string' }, title: { type: 'string' }, subtitle: { type: 'string', default: '' },
    format: { type: 'string', default: '16:9' }, bpm: { type: 'string' }, 'first-bar': { type: 'string' },
  },
});
const dir = positionals[0] && resolve(positionals[0]);
if (!dir || !o.audio) {
  console.error('Usage: node new-project.mjs <dir> --audio song.mp3 [--lyrics lyrics.srt] [--title "..."] [--subtitle "..."] [--format 16:9|9:16|1:1]');
  process.exit(1);
}
if (!existsSync(o.audio)) fail(`Audio file not found: ${o.audio}`);
if (o.lyrics && !existsSync(o.lyrics)) fail(`Lyrics file not found: ${o.lyrics}`);
if (!['16:9', '9:16', '1:1'].includes(o.format)) fail('--format must be 16:9, 9:16 or 1:1');
if (existsSync(dir) && readdirSync(dir).some(f => f !== '.DS_Store')) fail(`${dir} already exists and is not empty. Pick a new folder.`);

cpSync(STARTER, dir, { recursive: true, filter: src => !/[/\\](node_modules|out|stills)([/\\]|$)/.test(src) });
renameSync(join(dir, 'gitignore'), join(dir, '.gitignore'));
// The starter's public/ starts empty, and git does not keep empty folders, so installs from GitHub lack it.
mkdirSync(join(dir, 'public'), { recursive: true });
const audioName = 'song' + extname(o.audio).toLowerCase();
copyFileSync(o.audio, join(dir, 'public', audioName));
let lyricsCopy;
if (o.lyrics) { lyricsCopy = join(dir, 'lyrics' + extname(o.lyrics).toLowerCase()); copyFileSync(o.lyrics, lyricsCopy); }

console.log('Analyzing the song...');
const timing = await analyze(join(dir, 'public', audioName), {
  lyrics: lyricsCopy, bpm: o.bpm ? +o.bpm : undefined, firstBar: o['first-bar'] ? +o['first-bar'] : undefined,
});
timing.source = basename(o.audio);
writeFileSync(join(dir, 'public', 'timing.json'), formatTiming(timing));
writeFileSync(join(dir, 'timing-report.md'), timingReport(timing));

const { resolveLabel } = await import(pathToFileURL(join(dir, 'src', 'beatframe', 'labels.ts')).href);
const title = o.title ?? basename(o.audio, extname(o.audio)).replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
const defaults = {
  format: o.format, title, subtitle: o.subtitle, audio: audioName, timing: 'timing.json',
  background: '#15131f', foreground: '#ffffff', accent: '#ffd23f', accent2: '#ff4f8b', debug: false,
  scenes: firstScenes(timing, label => resolveLabel(timing, label)),
};
const rootFile = join(dir, 'src', 'Root.tsx');
const literal = JSON.stringify(defaults, null, 2).replace(/\n/g, '\n    ');
writeFileSync(rootFile, readFileSync(rootFile, 'utf8').replace(/defaultProps=\{\{[\s\S]*?\n {4}\}\}/, `defaultProps={${literal}}`));

console.log(`
Created ${dir}
  ${timing.tempo} BPM, ${timing.beats.length} beats, ${timing.downbeats.length} bars, ${timing.hits.length} hits${timing.lyrics ? `, ${timing.lyrics.lines.length} lyric lines` : ''}
  First scene list: ${defaults.scenes.map(s => `${s.type}@${s.from}`).join(', ')}
Next:
  cd "${dir}" && npm install     (about 300 MB, once per project)
  npm run studio                 (preview and edit in the browser)
  npm run stills                 (contact sheet for review)
  npm run render -- --format all`);

// A first cut that follows the song: title, then lyrics (or pulsing bars), a drop on each hit, an outro.
function firstScenes(t, at) {
  const bar = (60 / t.tempo) * t.meter, end = t.duration;
  const firstBarAfter = s => { const k = t.downbeats.findIndex(d => d >= s); return k >= 0 ? `bar:${k + 1}` : String(s); };
  const lines = t.lyrics?.lines ?? [];
  const out = [{ type: 'title', from: 'start', t: 0 }];
  const baseType = lines.length ? 'lyrics' : 'pulse';
  const baseFrom = lines.length ? 'L1' : firstBarAfter(Math.min(4, end / 4));
  if (lines.length && at('L1') > 10) out.push({ type: 'pulse', from: firstBarAfter(Math.min(5, at('L1') / 2)) });
  out.push({ type: baseType, from: baseFrom });
  const outroFrom = end > 20 ? 'end-2bars' : null;
  const outroAt = outroFrom ? at(outroFrom) : end;
  const dropBars = bar < 1.5 ? 2 : 1, dropLen = `+${dropBars}bar${dropBars > 1 ? 's' : ''}`;
  // After the last lyric line, go back to pulsing bars if there is a long instrumental tail.
  const tail = lines.length ? `L${lines.length}.end+1beat` : null;
  if (tail && outroAt - at(tail) > 2 * bar) out.push({ type: 'pulse', from: tail });
  t.hits.forEach((h, i) => {
    if (h.t < at(baseFrom) - 1 || h.t + dropBars * bar > outroAt - 1) return;
    // A hit right where the main part starts: open with the drop, then the main part.
    if (Math.abs(h.t - at(baseFrom)) < 1) out.splice(out.findIndex(s => s.from === baseFrom), 1);
    const resume = tail && h.t > at(tail) ? 'pulse' : baseType;
    out.push({ type: 'drop', from: `hit:${i + 1}` });
    out.push({ type: resume, from: `hit:${i + 1}${dropLen}` });
  });
  if (outroFrom) out.push({ type: 'outro', from: outroFrom });
  const timed = out.map(s => ({ ...s, t: at(s.from) })).sort((a, b) => a.t - b.t);
  // Drop entries that start too close to the next one (overlapping hits, very short gaps).
  return timed.filter((s, i) => i === timed.length - 1 || timed[i + 1].t - s.t >= 0.5).map(({ type, from }) => ({ type, from }));
}

function fail(msg) { console.error(msg); process.exit(1); }
