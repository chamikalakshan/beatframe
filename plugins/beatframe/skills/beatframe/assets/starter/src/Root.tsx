// One composition; `format` picks 16:9, 9:16 or 1:1 and the length comes from timing.json.
// Keep defaultProps an inline object literal: Remotion Studio saves edits from its props panel back into it.
import React from 'react';
import { CalculateMetadataFunction, Composition, staticFile } from 'remotion';
import { FORMATS, type Timing } from './beatframe';
import { videoSchema, type VideoProps } from './schema';
import { Video } from './Video';

export const FPS = 30;

const calculateMetadata: CalculateMetadataFunction<VideoProps> = async ({ props }) => {
  const res = await fetch(staticFile(props.timing));
  if (!res.ok) throw new Error(`public/${props.timing} not found. Run the Beatframe analyzer first.`);
  const timing: Timing = await res.json();
  return { durationInFrames: Math.max(1, Math.ceil(timing.duration * FPS)), ...FORMATS[props.format] };
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Video"
    component={Video}
    schema={videoSchema}
    calculateMetadata={calculateMetadata}
    fps={FPS}
    width={1920}
    height={1080}
    durationInFrames={FPS * 10}
    defaultProps={{
      format: '16:9',
      title: 'Beatframe',
      subtitle: 'audio-driven motion',
      audio: 'song.mp3',
      timing: 'timing.json',
      background: '#15131f',
      foreground: '#ffffff',
      accent: '#ffd23f',
      accent2: '#ff4f8b',
      debug: false,
      scenes: [
        { type: 'title', from: 'start' },
        { type: 'pulse', from: 'bar:3' },
        { type: 'outro', from: 'end-2bars' },
      ],
    }}
  />
);
