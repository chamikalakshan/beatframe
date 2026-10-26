// SRT and LRC parsing, including the messy files people actually have.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseLrc, parseSrt } from '../plugins/beatframe/skills/beatframe/scripts/lib/lyrics.mjs';

test('SRT: multi-line cues, tags, CRLF, missing blank lines', () => {
  const srt = '﻿1\r\n00:00:01,000 --> 00:00:02,500\r\n<i>First</i>\r\nline\r\n\r\n2\r\n00:00:03,000 --> 00:00:04,000\r\nSecond\r\n3\r\n00:00:05.000 --> 00:00:06.000\r\nThird\r\n';
  assert.deepEqual(parseSrt(srt.replace(/^﻿/, '')), [
    { start: 1, end: 2.5, text: 'First line' },
    { start: 3, end: 4, text: 'Second' },
    { start: 5, end: 6, text: 'Third' },
  ]);
});

test('SRT: Sinhala text survives', () => {
  const lines = parseSrt('1\n00:00:16,000 --> 00:00:23,000\nකාලයක් පුරා හිතෙහි ඇවිලේනා\n');
  assert.equal(lines[0].text, 'කාලයක් පුරා හිතෙහි ඇවිලේනා');
});

test('LRC: metadata skipped, repeated tags, end = next start', () => {
  const lrc = '[ar:Someone]\n[00:01.00][00:20.00]Chorus line\n[00:05.50]Verse line\n';
  assert.deepEqual(parseLrc(lrc, 30), [
    { start: 1, end: 5.5, text: 'Chorus line' },
    { start: 5.5, end: 20, text: 'Verse line' },
    { start: 20, end: 30, text: 'Chorus line' },
  ]);
});

test('LRC: enhanced word timings', () => {
  const [line] = parseLrc('[00:01.00]<00:01.00>Hello <00:01.60>world\n', 10);
  assert.equal(line.text, 'Hello world');
  assert.deepEqual(line.words, [{ t: 1, w: 'Hello' }, { t: 1.6, w: 'world' }]);
});
