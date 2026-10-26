// Reads timed lyrics from SRT or LRC files into [{ start, end, text, words? }] (seconds).
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';

const round = t => Math.round(t * 1000) / 1000;

export function loadLyrics(file, duration) {
  const text = readFileSync(file, 'utf8').replace(/^﻿/, '');
  const ext = extname(file).toLowerCase();
  if (ext === '.srt') return parseSrt(text);
  if (ext === '.lrc') return parseLrc(text, duration);
  throw new Error(`Lyrics must be .srt or .lrc with timings (got ${ext || 'no extension'}). Untimed text can be timed with tap-to-mark (coming in a later version) or by writing an SRT.`);
}

export function parseSrt(text) {
  const sec = s => { const [h, m, r] = s.trim().split(':'); return +h * 3600 + +m * 60 + parseFloat(r.replace(',', '.')); };
  const lines = text.split(/\r?\n/), out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/(\d+:\d+:\d+[,.]\d+)\s*-->\s*(\d+:\d+:\d+[,.]\d+)/);
    if (!m) continue;
    const body = [];
    for (let j = i + 1; j < lines.length && lines[j].trim() && !lines[j].includes('-->'); j++) {
      if (/^\d+$/.test(lines[j].trim()) && lines[j + 1]?.includes('-->')) break;
      body.push(lines[j].trim());
    }
    const s = body.join(' ').replace(/<[^>]+>/g, '').trim();
    if (s) out.push({ start: round(sec(m[1])), end: round(sec(m[2])), text: s });
  }
  return out.sort((a, b) => a.start - b.start);
}

// LRC: "[mm:ss.xx]text", several time tags per line allowed; enhanced "<mm:ss.xx>word" tags become word timings.
export function parseLrc(text, duration) {
  const tag = /\[(\d+):(\d+(?:\.\d+)?)\]/g, word = /<(\d+):(\d+(?:\.\d+)?)>\s*([^<]*)/g;
  const out = [];
  for (const raw of text.split(/\r?\n/)) {
    const times = [...raw.matchAll(tag)].map(m => +m[1] * 60 + +m[2]);
    if (!times.length) continue;
    let body = raw.replace(tag, '').trim();
    const words = [...body.matchAll(word)].map(m => ({ t: round(+m[1] * 60 + +m[2]), w: m[3].trim() })).filter(w => w.w);
    body = body.replace(/<\d+:\d+(?:\.\d+)?>/g, '').replace(/\s+/g, ' ').trim();
    if (!body) continue;
    for (const t of times) out.push({ start: round(t), text: body, ...(words.length ? { words } : {}) });
  }
  out.sort((a, b) => a.start - b.start);
  out.forEach((l, i) => { l.end = round(out[i + 1]?.start ?? duration ?? l.start + 4); });
  return out.map(({ start, end, text, words }) => ({ start, end, text, ...(words ? { words } : {}) }));
}
