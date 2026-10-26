// new-project.mjs: copies the starter, analyzes the song and writes a scene list that follows it.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { synth, wav } from '../dev/synth-track.mjs';

const script = fileURLToPath(new URL('../plugins/beatframe/skills/beatframe/scripts/new-project.mjs', import.meta.url));
const dir = mkdtempSync(join(tmpdir(), "beatframe it's-"));
after(() => rmSync(dir, { recursive: true, force: true }));

test('creates a ready project with a song-shaped scene list (path with spaces and an apostrophe)', () => {
  const s = synth({ bpm: 120 });
  writeFileSync(join(dir, 'song.wav'), wav(s.samples, s.sr));
  writeFileSync(join(dir, 'l.srt'), '1\n00:00:08,300 --> 00:00:12,000\nHello\n\n2\n00:00:12,300 --> 00:00:16,000\nAgain\n');
  const proj = join(dir, 'my video');
  const r = spawnSync(process.execPath, [script, proj, '--audio', join(dir, 'song.wav'), '--lyrics', join(dir, 'l.srt'), '--title', 'Test Song'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);

  for (const f of ['package.json', 'public/song.wav', 'public/timing.json', 'timing-report.md', 'lyrics.srt', '.gitignore', 'src/beatframe/labels.ts', 'scripts/stills.mjs']) {
    assert.ok(existsSync(join(proj, f)), `missing ${f}`);
  }
  const root = readFileSync(join(proj, 'src/Root.tsx'), 'utf8');
  const literal = root.match(/defaultProps=\{(\{[\s\S]*?\n {4}\})\}/);
  assert.ok(literal, 'defaultProps literal not found');
  const props = JSON.parse(literal[1]);
  assert.equal(props.title, 'Test Song');
  assert.equal(props.audio, 'song.wav');
  const types = props.scenes.map(x => x.type);
  assert.equal(types[0], 'title');
  assert.ok(types.includes('drop'), `no drop scene: ${JSON.stringify(props.scenes)}`);
  assert.ok(types.includes('lyrics'));
  assert.equal(types.at(-1), 'outro');
});

test('refuses a folder that is not empty', () => {
  const r = spawnSync(process.execPath, [script, dir, '--audio', join(dir, 'song.wav')], { encoding: 'utf8' });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /not empty/);
});
