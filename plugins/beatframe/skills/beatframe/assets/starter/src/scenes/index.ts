// Scene registry: the `type` in each scene entry picks a component here. Keep in sync with SCENE_TYPES in schema.ts.
import type React from 'react';
import type { SceneProps, SCENE_TYPES } from '../schema';
import { DropScene } from './DropScene';
import { LyricsScene } from './LyricsScene';
import { OutroScene } from './OutroScene';
import { PulseScene } from './PulseScene';
import { TitleScene } from './TitleScene';

export const SCENES: Record<(typeof SCENE_TYPES)[number], React.FC<SceneProps>> = {
  title: TitleScene,
  pulse: PulseScene,
  drop: DropScene,
  lyrics: LyricsScene,
  outro: OutroScene,
};
