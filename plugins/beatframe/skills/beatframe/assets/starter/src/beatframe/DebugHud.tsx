// A small overlay with the song clock, for checking timing in Studio and in contact sheets.
import React from 'react';
import { useLayout } from './layout';
import { useBeat, useEnergy, useLyric, useSongTime } from './timing';

const clock = (t: number) => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`;

export const DebugHud: React.FC<{ scene?: string }> = ({ scene }) => {
  const t = useSongTime(), b = useBeat(), lyric = useLyric(), e = useEnergy(), L = useLayout();
  const lines = [
    `${clock(t)}  beat ${b.beat}  bar ${b.bar}.${b.beatInBar}`,
    `energy ${'█'.repeat(Math.round(e * 10)).padEnd(10, '·')}  ${lyric ? lyric.label : '-'}`,
    ...(scene ? [scene] : []),
  ];
  return (
    <div style={{
      position: 'absolute', left: L.unit * 2, top: L.unit * 2, padding: `${L.unit * 0.8}px ${L.unit * 1.2}px`,
      font: `${L.unit * 2.2}px ui-monospace, Menlo, Consolas, monospace`, lineHeight: 1.35, whiteSpace: 'pre',
      color: '#fff', background: 'rgba(0,0,0,.7)', borderRadius: L.unit, zIndex: 1000,
    }}>
      {lines.join('\n')}
    </div>
  );
};
