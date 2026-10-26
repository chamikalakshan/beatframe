import React from 'react';
import { AbsoluteFill, interpolate } from 'remotion';
import { Burst, mix, useLayout, usePop, usePulse } from '../beatframe';
import type { SceneProps } from '../schema';

// Big title over a slowly turning sunburst; pops in, then breathes on every beat.
export const TitleScene: React.FC<SceneProps> = ({ scene, video }) => {
  const L = useLayout(), pop = usePop(), sub = usePop(0.35), beat = usePulse('beat', 7);
  return (
    <AbsoluteFill>
      <Burst colors={[video.background, mix(video.background, video.accent, 0.12)]} spin={0.02} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: `${L.safe.top}px ${L.safe.left}px ${L.height - L.safe.bottom}px` }}>
        <div style={{
          fontSize: L.unit * L.pick({ wide: 13, vertical: 14, square: 13 }), fontWeight: 900, lineHeight: 0.95, textAlign: 'center',
          color: video.foreground, letterSpacing: '-0.02em', transform: `scale(${pop * (1 + 0.035 * beat)})`, textWrap: 'balance',
        }}>
          {scene.text ?? video.title}
        </div>
        {video.subtitle && (
          <div style={{
            marginTop: L.unit * 4, fontSize: L.unit * 3.6, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase',
            color: video.accent, opacity: sub, transform: `translateY(${interpolate(sub, [0, 1], [L.unit * 3, 0])}px)`,
          }}>
            {video.subtitle}
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
