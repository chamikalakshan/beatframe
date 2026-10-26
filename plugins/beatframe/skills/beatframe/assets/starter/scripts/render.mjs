#!/usr/bin/env node
// Renders the video to MP4 in one or more formats.
// Usage: npm run render                               -> out/<title>-16x9.mp4
//        npm run render -- --format all              -> 16:9, 9:16 and 1:1
//        npm run render -- --draft                   -> half size, lower quality, for quick checks
//        npm run render -- --concurrency 2           -> fewer parallel frames (less memory; default 2)
//        npm run render -- --from 30 --to 45         -> only part of the song (seconds), for quick checks
import { bundle } from '@remotion/bundler';
import { openBrowser, renderMedia, selectComposition } from '@remotion/renderer';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { values: o } = parseArgs({
  options: {
    format: { type: 'string', default: '16:9' }, draft: { type: 'boolean' }, concurrency: { type: 'string', default: '2' },
    from: { type: 'string' }, to: { type: 'string' }, out: { type: 'string', default: 'out' },
  },
});
const formats = o.format === 'all' ? ['16:9', '9:16', '1:1'] : [o.format];

console.log('Bundling...');
const serveUrl = await bundle({ entryPoint: join(root, 'src/index.ts') });
const browser = await openBrowser('chrome');
mkdirSync(join(root, o.out), { recursive: true });

for (const format of formats) {
  const inputProps = { format };
  const composition = await selectComposition({ serveUrl, id: 'Video', inputProps, puppeteerInstance: browser });
  const props = { ...composition.props, ...inputProps };
  const slug = String(props.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'video';
  const range = o.from || o.to
    ? [Math.round(+(o.from ?? 0) * composition.fps), Math.min(composition.durationInFrames - 1, Math.round(+(o.to ?? Infinity) * composition.fps))]
    : null;
  const file = join(root, o.out, `${slug}-${format.replace(':', 'x')}${o.draft ? '-draft' : ''}.mp4`);
  let last = -1;
  await renderMedia({
    composition, serveUrl, codec: 'h264', outputLocation: file, inputProps: props, puppeteerInstance: browser,
    concurrency: +o.concurrency, scale: o.draft ? 0.5 : 1, crf: o.draft ? 28 : 18, frameRange: range,
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 100);
      if (pct !== last && pct % 5 === 0) { last = pct; process.stdout.write(`\r${format}: ${pct}%`); }
    },
  });
  console.log(`\r${format}: done -> ${file}`);
}
await browser.close({ silent: true });
