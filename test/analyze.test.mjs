// The basic analyzer against synthetic tracks with known beats, bars and drops.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { synth, wav } from '../dev/synth-track.mjs';
import { analyze } from '../plugins/beatframe/skills/beatframe/scripts/analyze.mjs';
import { estimateTempo } from '../plugins/beatframe/skills/beatframe/scripts/lib/dsp.mjs';

const dir = mkdtempSync(join(tmpdir(), 'beatframe-test-'));
after(() => rmSync(dir, { recursive: true, force: true }));

const nearest = (list, x) => list.reduce((best, v) => (Math.abs(v - x) < Math.abs(best - x) ? v : best), Infinity);

for (const [bpm, lead] of [[75, 1.1], [96, 0.7], [120, 0.3], [140, 0.05], [174, 0.2]]) {
  test(`${bpm} BPM: tempo, beats, bars and the drop`, async () => {
    const s = synth({ bpm, lead });
    const file = join(dir, `t${bpm}.wav`);
    writeFileSync(file, wav(s.samples, s.sr));
    const t = await analyze(file);

    assert.ok(Math.abs(t.tempo - bpm) / bpm < 0.01, `tempo ${t.tempo}, expected ${bpm}`);
    const onBeat = s.beats.filter(b => Math.abs(nearest(t.beats, b) - b) < 0.035).length;
    assert.ok(onBeat >= s.beats.length - 3, `${onBeat}/${s.beats.length} beats within 35 ms`);
    const bar = 4 * 60 / bpm;
    for (const d of t.downbeats) {
      const k = (d - lead) / bar;
      assert.ok(Math.abs(k - Math.round(k)) * bar < 0.06, `downbeat ${d} is not on a bar line`);
    }
    assert.ok(t.hits.some(h => Math.abs(h.t - s.drop) < 0.1), `no hit near the drop at ${s.drop}: ${JSON.stringify(t.hits)}`);
    assert.ok(t.hits.every(h => h.t > 1.5), 'the start of the song is not a hit');
    assert.equal(t.energy.values.length, Math.ceil(t.duration * 10));
  });
}

// Half-time grooves: the kick lands on every other beat, so the kick band alone points at half the tempo.
// Fixture: onset envelopes from a real 132 BPM song that the first release read as 66.
test('a half-time groove keeps its real tempo', () => {
  const f = JSON.parse(readFileSync(new URL('./fixtures/halftime-envelopes.json', import.meta.url), 'utf8'));
  const bpm = estimateTempo(Float32Array.from(f.full), Float32Array.from(f.low));
  assert.ok(Math.abs(bpm - 132) / 132 < 0.04, `tempo ${bpm.toFixed(1)}, expected about 132 (not 66)`);
});

test('lyrics are attached and the output shape is version 1', async () => {
  const s = synth({ bpm: 120 });
  const file = join(dir, 'lyr.wav'), srt = join(dir, 'lyr.srt');
  writeFileSync(file, wav(s.samples, s.sr));
  writeFileSync(srt, '1\n00:00:08,300 --> 00:00:12,000\nHello there\n\n2\n00:00:12,300 --> 00:00:16,000\nSecond line\n');
  const t = await analyze(file, { lyrics: srt });
  assert.equal(t.version, 1);
  assert.equal(t.quality, 'basic');
  assert.deepEqual(t.lyrics.lines.map(l => l.text), ['Hello there', 'Second line']);
  for (const k of ['beats', 'downbeats', 'onsets', 'kicks']) assert.ok(t[k].every((v, i, a) => i === 0 || v >= a[i - 1]), `${k} sorted`);
});

test('--first-bar overrides the downbeat guess', async () => {
  const s = synth({ bpm: 120 });
  const file = join(dir, 'fb.wav');
  writeFileSync(file, wav(s.samples, s.sr));
  const t = await analyze(file, { firstBar: 2 });
  assert.equal(t.downbeats[0], t.beats[1]);
});
