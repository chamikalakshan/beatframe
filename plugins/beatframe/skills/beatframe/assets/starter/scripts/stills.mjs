#!/usr/bin/env node
// Renders still frames with the song-clock overlay and tiles them into a contact sheet for review.
// Usage: npm run stills                          -> auto: each scene's start and middle, plus every hit
//        npm run stills -- --at "L3,hit:2,12.5"  -> specific labels or seconds
//        npm run stills -- --format 9:16|1:1|all --scale 0.5 --no-debug
// Output: stills/<format>/NNN.jpeg, stills/sheet-<format>.jpg and stills/index.md (what each tile shows)
import { bundle } from '@remotion/bundler';
import { openBrowser, renderStill, selectComposition } from '@remotion/renderer';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { resolveLabel } from '../src/beatframe/labels.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { values: o } = parseArgs({
  options: { at: { type: 'string' }, format: { type: 'string', default: '16:9' }, scale: { type: 'string', default: '0.5' }, 'no-debug': { type: 'boolean' }, max: { type: 'string', default: '24' } },
});
const formats = o.format === 'all' ? ['16:9', '9:16', '1:1'] : [o.format];

console.log('Bundling...');
const serveUrl = await bundle({ entryPoint: join(root, 'src/index.ts') });
const browser = await openBrowser('chrome');
const index = ['# Stills', ''];

for (const format of formats) {
  const inputProps = { format, debug: !o['no-debug'] };
  const composition = await selectComposition({ serveUrl, id: 'Video', inputProps, puppeteerInstance: browser });
  const props = { ...composition.props, ...inputProps };
  const timing = JSON.parse(readFileSync(join(root, 'public', props.timing), 'utf8'));
  const end = timing.duration - 0.05;

  let picks;
  if (o.at) picks = o.at.split(',').map(s => s.trim()).filter(Boolean).map(label => ({ label, t: resolveLabel(timing, label) }));
  else {
    picks = [];
    props.scenes.forEach((s, i) => {
      const a = resolveLabel(timing, s.from), b = resolveLabel(timing, s.to ?? props.scenes[i + 1]?.from ?? 'end');
      picks.push({ label: `scene ${i + 1} ${s.type} start`, t: a + Math.min(0.6, (b - a) * 0.3) });
      picks.push({ label: `scene ${i + 1} ${s.type} middle`, t: (a + b) / 2 });
    });
    timing.hits.forEach((h, i) => picks.push({ label: `hit:${i + 1}`, t: h.t + 0.1 }));
    picks.sort((a, b) => a.t - b.t);
    picks = picks.filter((p, i) => i === 0 || p.t - picks[i - 1].t > 0.3);
    const max = +o.max;
    if (picks.length > max) picks = Array.from({ length: max }, (_, k) => picks[Math.round(k * (picks.length - 1) / (max - 1))]);
  }

  const dir = join(root, 'stills', format.replace(':', 'x'));
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  index.push(`## ${format}`, '', '| Tile | Time | What |', '|---|---|---|');
  for (const [k, p] of picks.entries()) {
    const t = Math.max(0, Math.min(end, p.t)), frame = Math.min(composition.durationInFrames - 1, Math.round(t * composition.fps));
    await renderStill({ composition, serveUrl, frame, inputProps: props, output: join(dir, `${String(k + 1).padStart(3, '0')}.jpeg`), imageFormat: 'jpeg', jpegQuality: 85, scale: +o.scale, puppeteerInstance: browser });
    index.push(`| ${k + 1} | ${t.toFixed(2)} s | ${p.label} |`);
    process.stdout.write(`\r${format}: ${k + 1}/${picks.length} stills`);
  }
  console.log();

  const cols = format === '9:16' ? 6 : 4, rows = Math.ceil(picks.length / cols), height = format === '9:16' ? 480 : 270;
  const sheet = join(root, 'stills', `sheet-${format.replace(':', 'x')}.jpg`);
  const ff = spawnSync('ffmpeg', ['-y', '-v', 'error', '-framerate', '1', '-i', join(dir, '%03d.jpeg'), '-vf', `scale=-2:${height},tile=${cols}x${rows}:padding=6:margin=6:color=0x222222`, '-frames:v', '1', '-q:v', '3', sheet], { stdio: 'inherit' });
  console.log(ff.status === 0 ? `Contact sheet: ${sheet}` : 'ffmpeg could not build the contact sheet (stills are still in ' + dir + ')');
  index.push('');
}

await browser.close({ silent: true });
writeFileSync(join(root, 'stills', 'index.md'), index.join('\n') + '\n');
console.log(`Tile list: ${join(root, 'stills', 'index.md')}`);
