// A short Markdown summary of timing.json, written for Claude (which can't hear the song).

const mmss = t => { const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s.toFixed(1).padStart(4, '0')}`; };
const BLOCKS = '▁▂▃▄▅▆▇█';

export function timingReport(t) {
  const beat = 60 / t.tempo, bar = beat * t.meter;
  const pickup = t.downbeats.length ? t.beats.findIndex(b => b >= t.downbeats[0] - 1e-6) : 0;
  const L = [`# Timing report: ${t.source}`, ''];
  L.push(t.quality === 'basic'
    ? '- Analyzer: **basic** (Node). Beats, bars, hits and energy are measured; sections are not (add them by hand or use full mode).'
    : `- Analyzer: **${t.quality}**.`);
  L.push(`- Duration: ${mmss(t.duration)} (${t.duration} s)`);
  L.push(`- Tempo: ${t.tempo} BPM in ${t.meter}/4. One beat = ${beat.toFixed(3)} s, one bar = ${bar.toFixed(3)} s`);
  L.push(`- Beats: ${t.beats.length} (\`beat:1\` = ${t.beats[0] ?? '-'} s). Bars: ${t.downbeats.length} (\`bar:1\` = ${t.downbeats[0] ?? '-'} s${pickup > 0 ? `, ${pickup} pickup beat(s) before it` : ''})`);
  L.push(`- Onsets: ${t.onsets.length}, kick-like hits: ${t.kicks.length}`);

  L.push('', '## Hits (big loudness rises: drops, choruses, entrances)');
  if (t.hits.length) {
    L.push('| Label | Time | Rise |', '|---|---|---|');
    t.hits.forEach((h, i) => L.push(`| \`hit:${i + 1}\` | ${mmss(h.t)} (${h.t} s) | +${h.strength} dB |`));
  } else L.push('- None found: the loudness stays fairly even.');

  if (t.sections?.length) {
    L.push('', '## Sections', '| Label | Start | End |', '|---|---|---|');
    const seen = {};
    for (const s of t.sections) {
      seen[s.name] = (seen[s.name] ?? 0) + 1;
      L.push(`| \`section:${s.name}${seen[s.name] > 1 ? ':' + seen[s.name] : ''}\` | ${mmss(s.start)} | ${mmss(s.end)} |`);
    }
  }

  if (t.lyrics?.lines?.length) {
    L.push('', `## Lyrics (from ${t.lyrics.source})`, '| Label | Time | Text |', '|---|---|---|');
    t.lyrics.lines.forEach((l, i) => L.push(`| \`L${i + 1}\` | ${mmss(l.start)}–${mmss(l.end)} | ${l.text.replace(/\|/g, '\\|')} |`));
  }

  L.push('', '## Energy by bar (▁ quiet … █ loud)');
  const e = t.energy, bars = t.downbeats.map((d, i) => {
    const end = t.downbeats[i + 1] ?? Math.min(t.duration, d + bar);
    const vals = e.values.slice(Math.floor(d * e.rate), Math.max(Math.floor(d * e.rate) + 1, Math.floor(end * e.rate)));
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  });
  for (let i = 0; i < bars.length; i += 16) {
    const row = bars.slice(i, i + 16).map(v => BLOCKS[Math.min(7, Math.floor(v * 8))]).join('');
    L.push(`- bars ${String(i + 1).padStart(3)}–${String(Math.min(bars.length, i + 16)).padEnd(3)} from ${mmss(t.downbeats[i])}: \`${row}\``);
  }

  L.push('', '## Labels', 'Use these in scenes instead of seconds: `start`, `end`, `beat:N`, `bar:N`, `hit:N`, `LN`, `LN.end`, `section:NAME`, `m:NAME`, plus offsets like `+2beats`, `-1bar`, `+0.5s`. Full timing data: `public/timing.json`.');
  return L.join('\n') + '\n';
}
