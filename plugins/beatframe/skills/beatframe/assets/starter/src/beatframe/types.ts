// The shape of public/timing.json (version 1), written by the Beatframe analyzer.
// All times are in seconds from the start of the audio. Lists are sorted.

export type Hit = { t: number; strength: number };
export type Section = { name: string; start: number; end: number };
export type Word = { t: number; w: string };
export type LyricLine = { start: number; end: number; text: string; words?: Word[] };

export type Timing = {
  version: 1;
  generator: string;
  quality: 'basic' | 'full';
  source: string;
  duration: number;
  tempo: number;
  meter: number;
  beats: number[];
  downbeats: number[];
  onsets: number[];
  kicks: number[];
  hits: Hit[];
  sections: Section[];
  markers: Record<string, number>;
  lyrics: { source: string; lines: LyricLine[] } | null;
  energy: { rate: number; values: number[] };
};
