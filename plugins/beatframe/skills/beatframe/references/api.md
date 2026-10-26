# Beatframe library (src/beatframe/)

Import from `../beatframe` inside `src/scenes/`. The files are copied into each project, so change or extend them when a video needs it.

## Song clock hooks

All hooks use song time (seconds from the start of the audio), also inside `<At>`.

| Hook | Returns |
|---|---|
| `useTiming()` | The whole `timing.json` |
| `useSongTime()` | Seconds since the start of the song |
| `useSceneTime()` | Seconds since the current `<At>` scene started |
| `useLabel()` | `label => seconds` resolver |
| `useBeat()` | `{ beat, bar, beatInBar, phase, barPhase, beatLength }`: numbers are 1-based (0 before the first one); phases are 0..1 |
| `usePulse(kind, decay = 8)` | 1 on each event, decaying to 0: `exp(-decay * secondsSince)`. Kinds: `beat`, `bar`, `kick`, `onset`, `hit`, `lyric` |
| `useEnergy()` | Loudness 0..1 right now |
| `useLyric()` | Current line `{ text, start, end, words?, index, label, progress }` or `null` between lines |

Patterns:
```tsx
const beat = usePulse('beat', 7);           // scale(1 + 0.05 * beat): breathes on every beat
const kick = usePulse('kick', 12);          // sharper punch on kicks
const { beatInBar, barPhase } = useBeat();  // alternate poses per beat, sweep across a bar
const e = useEnergy();                      // brighter colours, faster motion when loud
```

## Placing things in time

```tsx
<At from="L3" to="L4">...</At>             // children see useCurrentFrame() from 0 at L3
<At from="hit:2" to="hit:2+1bar" name="drop flash">...</At>
<At from="bar:9" layout="none">...</At>    // no full-screen wrapper
```
`<At>` replaces `<Sequence>`; it nests, and keeps the song clock correct. `to` defaults to the end of the song.

## Layout (all formats)

`useLayout()` returns `{ width, height, format, isWide, isVertical, isSquare, unit, cx, cy, safe, pick }`.
- `unit` is 1% of the shorter side: `fontSize: L.unit * 8`.
- `safe` is the area clear of platform UI (`top`, `left`, `right`, `bottom`, `width`, `height`); 9:16 keeps extra room top and bottom.
- `L.pick({ wide: 13, vertical: 14, square: 12 })` picks a value per format.
- `FORMATS` maps `'16:9' | '9:16' | '1:1'` to pixel sizes.

## Effects

| Component or hook | Use |
|---|---|
| `<Burst colors={[a, b]} rays={16} spin={0.03} />` | Full-frame sunburst, `spin` in turns per second |
| `<Flash kind="hit" color="#fff" strength={0.85} decay={6} />` | Full-screen flash on each event |
| `<Rings kind="beat" color count={4} speed={60} width={1.2} />` | Rings growing out of a point on each event |
| `<Confetti colors={[...]} count={70} seed="x" />` | Falling confetti from the scene start |
| `usePop(delay = 0, damping = 12)` | Spring 0 → 1 from the scene start |
| `useShake(kind = 'kick', amount = 1, decay = 12)` | CSS translate that jolts on each event |
| `mix(a, b, t)` | Mix two colours |
| `<DebugHud scene="..." />` | Song-clock overlay (shown automatically when the `debug` prop is on) |

Remotion's own tools work too: `interpolate`, `spring`, `Img` + `staticFile` for images in `public/`, `random(seed)`.

## Scenes and props

- `src/schema.ts`: the Zod schema behind the Studio props panel. `SCENE_TYPES` lists scene types.
- `src/scenes/index.ts`: maps each type to a component with props `{ scene, video }`: `scene` is the entry (`type`, `from`, `to`, `text`), `video` holds title, colours, format.
- `src/SceneList.tsx`: plays the scene list.
- To give one scene type its own settings, add optional fields to `sceneSchema` (they appear in Studio).

Starter scenes: `title` (title over a sunburst), `pulse` (rings, kicking text, bar counter), `drop` (flash, fast burst, confetti, slammed text), `lyrics` (current line filling as sung, next line below), `outro` (closing card fading out).
