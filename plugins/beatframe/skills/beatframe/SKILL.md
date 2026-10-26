---
name: beatframe
description: Make audio-driven motion videos with Remotion (music videos, lyric videos, beat-synced animations) where every cut and effect is locked to the song's beats, bars, hits and lyric lines. Use when the user wants a video synced to a song or audio file, a lyric or karaoke video, beat-synced motion graphics, to analyze a song's tempo, beats or drops for video timing, or to edit an existing Beatframe project (a Remotion project with public/timing.json and src/beatframe/).
---

# Beatframe

You can't hear audio. Beatframe gives you ears: the analyzer turns the song into `public/timing.json` plus `timing-report.md` (tempo, beats, bars, hits, energy per bar, lyric lines), and scenes are placed with **labels** into that timing (`L5`, `hit:2`, `bar:9+2beats`) instead of guessed seconds.

Scripts live in this skill's `scripts/` folder; run them with the skill's base directory, e.g. `node <skill-dir>/scripts/doctor.mjs`.

## 1. Check the computer

```bash
node <skill-dir>/scripts/doctor.mjs
```
Needs Node >= 22.18, npm and ffmpeg. If something fails, tell the user the fix it prints and stop.

## 2. Create the project

```bash
node <skill-dir>/scripts/new-project.mjs <folder> --audio <song> [--lyrics lyrics.srt|.lrc] [--title "..."] [--subtitle "..."] [--format 16:9|9:16|1:1]
```
This copies the Remotion starter, puts the song in `public/`, analyzes it, and writes a first scene list into `src/Root.tsx` that already follows the song. Then **ask before** running `npm install` in the folder (about 300 MB); the first stills or render also downloads Chrome Headless Shell (about 170 MB), so mention that too.

Wrong tempo or bar 1? Re-run the analyzer: `node <skill-dir>/scripts/analyze.mjs public/song.mp3 --out public/timing.json --report timing-report.md [--bpm 128] [--first-bar 3] [--lyrics lyrics.srt]`.

## 3. Read the timing before planning

Read `timing-report.md` first, every time. It lists `hit:N` (drops, entrances), `LN` lyric lines with text, and an energy bar per bar of music. Plan the big moments on hits and loud bars, quiet scenes on quiet bars. `public/timing.json` has every beat if you need exact numbers.

## 4. Plan with the user (music and lyric videos)

1. Collect what the song is about: meaning of the lyrics, people or characters, style, format (16:9, 9:16, 1:1), anything to avoid. Ask only for what you can't infer.
2. Offer **3 different story or visual ideas** (2–3 lines each, each with a hook) and let the user pick.
3. Write a timed script: a table per song section with the label each moment lands on, what is on screen, the motion, and the gag or effect.

Taste rules (defaults; the user's wishes win):
- Something new every 5–10 seconds: a cut, a camera move, a gag or an effect, landing on a beat or bar line.
- Save the biggest visual change for the biggest hit.
- Few locations (3–5), reused; callbacks (an object or image that returns later) beat new material.
- Quiet sections get one strong, slow image rather than busy motion.

## 5. Build

- The scene list is `defaultProps.scenes` in `src/Root.tsx`: `{ type, from, to?, text? }`. Scenes run from `from` until `to` or the next scene. Keep `defaultProps` an inline object literal (Remotion Studio saves edits into it).
- New scene: a component in `src/scenes/`, added to `SCENE_TYPES` in `src/schema.ts` and to `SCENES` in `src/scenes/index.ts`.
- Use the library in `src/beatframe/` (copied into the project; change it freely). Read [references/api.md](references/api.md) before writing scenes.

Rules that keep renders correct:
- Place things with labels and `<At from="L3" to="L4">`, never hand-typed seconds or raw `<Sequence>` (it breaks the song clock).
- Animate only from the song clock (`useSongTime`, `useBeat`, `usePulse`, `useSceneTime`, `useCurrentFrame`). No CSS transitions or animations, no `Math.random()` (use `random(seed)` from remotion), no `Date`.
- Size everything in `useLayout().unit` and keep text inside `useLayout().safe`, so all three formats work.
- Lyrics in Sinhala, Tamil or Hindi: the font stack in `src/theme.ts` covers them; check stills to confirm.

## 6. Check your work

```bash
npm run stills                       # 16:9 contact sheet: each scene start and middle, plus every hit
npm run stills -- --format all       # all three formats
npm run stills -- --at "L3,hit:2,bar:12"
```
Then look at `stills/sheet-16x9.jpg` (Read the image) with `stills/index.md`, and go through [references/checking.md](references/checking.md). Fix and repeat before telling the user it is done.

## 7. Preview and render

- `npm run studio` opens Remotion Studio for the user: play with sound, scrub, switch `format`, edit text, colours and scene labels in the props panel, toggle `debug` for the song-clock overlay.
- `npm run render` (16:9), `npm run render -- --format all`, `--draft` for a quick half-size check, `--from 30 --to 45` for one part. Output goes to `out/`.
- Low-memory computers (8 GB): keep the default `--concurrency 2`.

## Reference

- [references/timing.md](references/timing.md): timing.json fields and the full label grammar
- [references/api.md](references/api.md): hooks, components and layout helpers
- [references/checking.md](references/checking.md): what to look for in the contact sheet
