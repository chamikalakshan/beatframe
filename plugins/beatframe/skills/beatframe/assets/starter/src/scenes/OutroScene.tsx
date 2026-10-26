import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { useLayout, usePop } from '../beatframe';
import type { SceneProps } from '../schema';

// Closing card that echoes the title, drifts back and fades out by the end of the scene.
export const OutroScene: React.FC<SceneProps> = ({ scene, video }) => {
  const L = useLayout(), pop = usePop(), sub = usePop(0.4), frame = useCurrentFrame(), { durationInFrames } = useVideoConfig();
  const out = interpolate(frame, [0, durationInFrames], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: video.background, justifyContent: 'center', alignItems: 'center', opacity: 1 - out ** 3 }}>
      <div style={{
        fontSize: L.unit * L.pick({ wide: 9, vertical: 10, square: 9 }), fontWeight: 900, color: video.foreground, textAlign: 'center',
        maxWidth: L.safe.width, textWrap: 'balance', opacity: pop, transform: `scale(${1 - 0.12 * out})`,
      }}>
        {scene.text ?? video.title}
      </div>
      {video.subtitle && (
        <div style={{ marginTop: L.unit * 3, fontSize: L.unit * 3.2, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: video.accent, opacity: sub }}>
          {video.subtitle}
        </div>
      )}
    </AbsoluteFill>
  );
};
