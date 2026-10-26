// <At from="L5" to="L6"> places its children on the song timeline using labels.
// Use it instead of <Sequence>: it keeps the song clock (useSongTime, useBeat, usePulse) correct inside.
import React, { useContext } from 'react';
import { Sequence, useVideoConfig } from 'remotion';
import { resolveLabel } from './labels';
import { OffsetContext, useTiming } from './timing';

export type AtProps = {
  /** Where it starts: a label or seconds. */
  from: string | number;
  /** Where it ends: a label or seconds. Default: the end of the song. */
  to?: string | number;
  /** Name shown in the Studio timeline. */
  name?: string;
  /** Render without the full-screen AbsoluteFill wrapper. */
  layout?: 'absolute-fill' | 'none';
  children: React.ReactNode;
};

export const At: React.FC<AtProps> = ({ from, to = 'end', name, layout, children }) => {
  // Inside a Sequence, useVideoConfig().durationInFrames is the Sequence's length, so clamp to the song instead.
  const timing = useTiming(), { fps } = useVideoConfig(), parent = useContext(OffsetContext);
  const start = Math.max(0, Math.round(resolveLabel(timing, from) * fps));
  const end = Math.min(Math.ceil(timing.duration * fps), Math.round(resolveLabel(timing, to) * fps));
  if (end <= start) return null;
  return (
    <Sequence from={start - parent} durationInFrames={end - start} name={name ?? `${from} → ${to}`} layout={layout}>
      <OffsetContext.Provider value={start}>{children}</OffsetContext.Provider>
    </Sequence>
  );
};
