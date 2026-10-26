import { Audio } from '@remotion/media';
import React from 'react';
import { AbsoluteFill, staticFile } from 'remotion';
import { TimingProvider } from './beatframe';
import { SceneList } from './SceneList';
import type { VideoProps } from './schema';
import { FONT } from './theme';

export const Video: React.FC<VideoProps> = props => (
  <TimingProvider src={props.timing}>
    <AbsoluteFill style={{ background: props.background, color: props.foreground, fontFamily: FONT }}>
      <Audio src={staticFile(props.audio)} />
      <SceneList video={props} />
    </AbsoluteFill>
  </TimingProvider>
);
