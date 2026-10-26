// The video's editable settings. Remotion Studio shows these as a form and can save edits back to Root.tsx.
import { zColor } from '@remotion/zod-types';
import { z } from 'zod';

// Every scene type in src/scenes/index.ts. Add new ones in both places.
export const SCENE_TYPES = ['title', 'pulse', 'drop', 'lyrics', 'outro'] as const;

export const sceneSchema = z.object({
  type: z.enum(SCENE_TYPES),
  from: z.string().describe('Where it starts: a label like L5, hit:2, bar:9+2beats, or seconds'),
  to: z.string().optional().describe('Where it ends (default: where the next scene starts)'),
  text: z.string().optional(),
});

export const videoSchema = z.object({
  format: z.enum(['16:9', '9:16', '1:1']),
  title: z.string(),
  subtitle: z.string(),
  audio: z.string().describe('File in public/'),
  timing: z.string().describe('timing.json in public/'),
  background: zColor(),
  foreground: zColor(),
  accent: zColor(),
  accent2: zColor(),
  debug: z.boolean().describe('Show the song clock overlay'),
  scenes: z.array(sceneSchema),
});

export type VideoProps = z.infer<typeof videoSchema>;
export type SceneEntry = z.infer<typeof sceneSchema>;
export type SceneProps = { scene: SceneEntry; video: VideoProps };
