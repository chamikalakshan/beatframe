# Beatframe design

Beatframe makes audio-driven motion video with [Remotion](https://www.remotion.dev) and Claude Code. Claude cannot hear, so Beatframe gives it ears: a song becomes a `timing.json` file (beats, bars, hits, lyric lines, energy), and every scene, cut and effect is placed with labels into that timing (`L5`, `hit:2`, `bar:12+2beats`) instead of hand-typed seconds.

It ships as a Claude Code plugin containing one skill (`beatframe`). The skill holds the workflow and taste rules, the analyzer scripts, and a Remotion starter project whose library code is copied into each video project so Claude can change it per video.

## Decisions

| Topic | Decision |
|---|---|
| Distribution | Claude Code plugin from this repo (`claude plugin marketplace add`), one skill with reference docs |
| Rendering and preview | Remotion: Studio for preview, scrubbing and props editing; Remotion renderer for output. No custom editor or renderer. |
| Library code | Copied into each project (`src/beatframe/`), like shadcn/ui, not an npm package (may come later) |
| Timing | One versioned `timing.json` per project; scenes refer to it through labels |
| Analyzer | Two modes, same output: basic (Node + ffmpeg, default) and full (Python + librosa through `uv`, milestone 2) |
| Formats | 16:9 (1920x1080), 9:16 (1080x1920), 1:1 (1080x1080), from one set of scenes using `useLayout()` |
| v1 scope | Music videos, lyric videos and explainers (voiceover word timing) |
| License | MIT. Remotion has its own license: free for individuals, non-profits and companies with up to 3 employees. |

## Repo layout

```
.claude-plugin/marketplace.json        this repo is a plugin marketplace
plugins/beatframe/
  .claude-plugin/plugin.json
  skills/beatframe/
    SKILL.md                           workflow, taste rules, commands
    references/                        loaded only when needed
    scripts/                           analyzer, new-project, doctor (run from the skill folder)
    assets/starter/                    Remotion project copied into each new video
dev/                                   repo-only tools (synthetic test track)
test/                                  node --test suites
```

## timing.json (version 1)

Times are seconds. Lists are sorted. See `references/timing.md` in the skill for the full field list and the label grammar.

## Label grammar

```
label  := base offset*
base   := <seconds>[s] | start | end
        | beat:N | bar:N | hit:N | onset:N | kick:N      (1-based)
        | LN | section:NAME[:K] | section:N | m:NAME
        | any of LN, bar:N, beat:N, section:... followed by .end
offset := (+|-) <number> (s | beat | beats | bar | bars)
```

Beat and bar offsets use the song tempo.

## Milestones

1. **Foundation** (this release): `timing.json` v1, basic analyzer with SRT/LRC lyric import, label resolver, Remotion starter (3 formats, Zod props editable in Studio, hooks `useTiming` `useSongTime` `useBeat` `usePulse` `useEnergy` `useLyric`, components `<At>` `<Burst>` `<Flash>` `<Rings>` `<Confetti>` `<DebugHud>`, `useLayout`, a scene list in props with 5 starter scenes), stills and contact sheet script, render script, skill and docs, demo project from a synthetic CC0 track.
2. **Music and lyrics**: full Python analyzer (sections, drum separation, key, chords, Whisper lyrics), `<Karaoke>` with word timing, tap-to-mark page, effects library, music video and lyric video templates.
3. **Explainers**: voiceover word timing (`V3`, `word:"battery"`), explainer components and template, optional local TTS.
4. **Review loop**: `/beatframe` commands, automatic frame review against a checklist.
5. **Release**: docs site or README demo GIF, CC0 examples, CI, tagged release.
