import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Flash, mix, Rings, useBeat, useEnergy, useLayout, usePop, usePulse, useShake, useTiming } from '../beatframe';
import type { SceneProps } from '../schema';

// Rings on every beat, text that kicks with the low end, and a bar counter: the timing made visible.
export const PulseScene: React.FC<SceneProps> = ({ scene, video }) => {
  const L = useLayout(), { meter } = useTiming(), b = useBeat(), e = useEnergy(), kick = usePulse('kick', 10), pop = usePop();
  const shake = useShake('bar', 0.6, 10);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 50%, ${mix(video.background, video.accent, 0.1 + 0.35 * e)} 0%, ${video.background} 70%)` }}>
      <Rings kind="beat" color={mix(video.accent, video.background, 0.45)} count={4} width={0.7} speed={L.pick({ wide: 55, vertical: 45, square: 45 })} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', transform: shake }}>
        <div style={{
          fontSize: L.unit * L.pick({ wide: 11, vertical: 12, square: 11 }), fontWeight: 900, color: video.foreground, textAlign: 'center',
          maxWidth: L.safe.width, lineHeight: 1, transform: `scale(${pop * (1 + 0.07 * kick)})`, textWrap: 'balance',
        }}>
          {scene.text ?? video.title}
        </div>
      </AbsoluteFill>
      <div style={{ position: 'absolute', left: 0, right: 0, top: L.safe.bottom - L.unit * 6, display: 'flex', justifyContent: 'center', gap: L.unit * 2 }}>
        {Array.from({ length: meter }, (_, k) => (
          <div key={k} style={{
            width: L.unit * 3, height: L.unit * 3, borderRadius: L.unit * 0.6,
            background: k + 1 === b.beatInBar ? video.accent : mix(video.foreground, video.background, 0.75),
            transform: `scale(${k + 1 === b.beatInBar ? 1.25 : 1})`,
          }} />
        ))}
      </div>
      <Flash kind="hit" color={video.accent} strength={0.6} />
    </AbsoluteFill>
  );
};
