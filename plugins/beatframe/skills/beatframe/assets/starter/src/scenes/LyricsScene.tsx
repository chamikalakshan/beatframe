import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Flash, mix, Rings, useEnergy, useLayout, useLyric, usePulse, useTiming } from '../beatframe';
import type { SceneProps } from '../schema';

// The current lyric line, filling with colour as it is sung, and the next line waiting below.
export const LyricsScene: React.FC<SceneProps> = ({ video }) => {
  const L = useLayout(), t = useTiming(), line = useLyric(), e = useEnergy(), enter = usePulse('lyric', 9);
  const next = line ? t.lyrics?.lines[line.index] : undefined;
  const fill = `${(line?.progress ?? 0) * 100}%`;
  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${video.background} 0%, ${mix(video.background, video.accent2, 0.15 + 0.3 * e)} 100%)` }}>
      <Rings kind="bar" color={mix(video.accent, video.background, 0.5)} count={3} speed={30} width={0.6} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: `0 ${L.safe.left}px`, gap: L.unit * 4 }}>
        {line && (
          <div style={{
            fontSize: L.unit * L.pick({ wide: 9.5, vertical: 9, square: 8.5 }), fontWeight: 800, lineHeight: 1.25, textAlign: 'center', textWrap: 'balance',
            maxWidth: L.safe.width, transform: `translateY(${enter * L.unit * 2}px) scale(${1 + 0.04 * enter})`,
            backgroundImage: `linear-gradient(90deg, ${video.accent} ${fill}, ${video.foreground} ${fill})`,
            WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
          }}>
            {line.text}
          </div>
        )}
        {next && (
          <div style={{ fontSize: L.unit * L.pick({ wide: 5, vertical: 5, square: 4.6 }), fontWeight: 600, textAlign: 'center', color: video.foreground, opacity: 0.35, maxWidth: L.safe.width }}>
            {next.text}
          </div>
        )}
      </AbsoluteFill>
      <Flash kind="hit" color={video.accent} strength={0.5} />
    </AbsoluteFill>
  );
};
