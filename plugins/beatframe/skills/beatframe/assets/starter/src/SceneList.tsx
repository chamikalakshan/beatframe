// Plays the scene list from the props: each scene runs from its `from` label until its `to` label,
// or until the next scene starts.
import React from 'react';
import { At, DebugHud } from './beatframe';
import { SCENES } from './scenes';
import type { VideoProps } from './schema';

export const SceneList: React.FC<{ video: VideoProps }> = ({ video }) => (
  <>
    {video.scenes.map((scene, i) => {
      const Scene = SCENES[scene.type], to = scene.to ?? video.scenes[i + 1]?.from ?? 'end';
      const name = `${i + 1}. ${scene.type}  ${scene.from} → ${to}`;
      return (
        <At key={i} from={scene.from} to={to} name={name}>
          <Scene scene={scene} video={video} />
          {video.debug && <DebugHud scene={name} />}
        </At>
      );
    })}
  </>
);
