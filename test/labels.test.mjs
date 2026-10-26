// The label grammar shared by scenes, <At> and the scripts.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveLabel } from '../plugins/beatframe/skills/beatframe/assets/starter/src/beatframe/labels.ts';

const timing = {
  version: 1, generator: 'test', quality: 'basic', source: 'x', duration: 60, tempo: 120, meter: 4,
  beats: [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4], downbeats: [0.5, 2.5], onsets: [0.5, 0.75], kicks: [0.5, 2.5],
  hits: [{ t: 2.5, strength: 9 }, { t: 30, strength: 6 }],
  sections: [{ name: 'verse', start: 0, end: 10 }, { name: 'chorus', start: 10, end: 20 }, { name: 'chorus', start: 30, end: 40 }],
  markers: { kiss: 42.5 },
  lyrics: { source: 'l.srt', lines: [{ start: 5, end: 7, text: 'one' }, { start: 8, end: 9.5, text: 'two' }] },
  energy: { rate: 10, values: [] },
};
const at = l => resolveLabel(timing, l);

test('seconds, start and end', () => {
  assert.equal(at('12.5'), 12.5);
  assert.equal(at('12.5s'), 12.5);
  assert.equal(at(7), 7);
  assert.equal(at('start'), 0);
  assert.equal(at('end'), 60);
});

test('beats, bars, hits, onsets and kicks are 1-based', () => {
  assert.equal(at('beat:1'), 0.5);
  assert.equal(at('bar:2'), 2.5);
  assert.equal(at('bar:1.end'), 2.5);
  assert.equal(at('hit:2'), 30);
  assert.equal(at('onset:2'), 0.75);
  assert.equal(at('kick:2'), 2.5);
});

test('beats and bars past the list are extrapolated at the tempo', () => {
  assert.equal(at('beat:10'), 5);
  assert.equal(at('bar:4'), 6.5);
});

test('lyrics, sections and markers', () => {
  assert.equal(at('L2'), 8);
  assert.equal(at('l2'), 8);
  assert.equal(at('L1.end'), 7);
  assert.equal(at('section:chorus'), 10);
  assert.equal(at('section:chorus:2'), 30);
  assert.equal(at('section:chorus:2.end'), 40);
  assert.equal(at('section:1'), 0);
  assert.equal(at('m:kiss'), 42.5);
});

test('offsets chain and use the tempo', () => {
  assert.equal(at('L1+1bar'), 7);
  assert.equal(at('hit:1-0.5s'), 2);
  assert.equal(at('end-2bars'), 56);
  assert.equal(at('bar:2+2beats'), 3.5);
  assert.equal(at('L2 + 1beat - 0.25s'), 8.25);
});

test('bad labels explain themselves', () => {
  assert.throws(() => at('L9'), /only 2 lyric lines/);
  assert.throws(() => at('hit:5'), /only 2 hits/);
  assert.throws(() => at('section:bridge'), /have: verse, chorus/);
  assert.throws(() => at('m:nope'), /no marker/);
  assert.throws(() => at('bar:0'), /start at 1/);
  assert.throws(() => at('banana'), /unknown label/);
});
