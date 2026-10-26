import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Burst, Confetti, Flash, useLayout, usePop, usePulse, useShake } from '../beatframe';
import type { SceneProps } from '../schema';

// For hits and drops: a flash, a fast sunburst, confetti, shaking type that slams in.
export const DropScene: React.FC<SceneProps> = ({ scene, video }) => {
  const L = useLayout(), slam = usePop(0, 9), kick = usePulse('kick', 12), shake = useShake('kick', 1.2, 14);
  return (
    <AbsoluteFill>
      <Burst colors={[video.accent, video.accent2]} rays={12} spin={0.25} />
      <Confetti colors={[video.foreground, video.background, video.accent2]} seed={`drop-${scene.from}`} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', transform: shake }}>
        <div style={{
          fontSize: L.unit * L.pick({ wide: 20, vertical: 18, square: 18 }), fontWeight: 900, fontStyle: 'italic', color: video.background,
          textAlign: 'center', lineHeight: 0.9, maxWidth: L.safe.width, textWrap: 'balance',
          transform: `scale(${(2.2 - 1.2 * slam) * (1 + 0.06 * kick)}) rotate(-4deg)`, opacity: Math.min(1, slam * 2),
          textShadow: `${L.unit * 0.8}px ${L.unit * 0.8}px 0 ${video.foreground}`,
        }}>
          {scene.text ?? 'DROP'}
        </div>
      </AbsoluteFill>
      <Flash kind="hit" color={video.foreground} />
    </AbsoluteFill>
  );
};
