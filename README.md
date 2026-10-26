# Beatframe

**Audio-driven motion video for [Remotion](https://www.remotion.dev) and [Claude Code](https://claude.com/claude-code).**

Claude can't hear your song. Beatframe gives it ears: it turns the audio into a timing map (beats, bars, drops, lyric lines, loudness) and lets every scene, cut and effect lock onto it with labels like `L5`, `hit:2` or `bar:9+2beats`, so the video lands on the music instead of on guessed seconds.

> Status: **0.1, milestone 1 of 5.** Music videos and beat-synced animation work today with the basic analyzer. Full analysis (sections, Whisper lyrics), karaoke, tap-to-mark and explainers are next; see [DESIGN.md](DESIGN.md).

## Install

In Claude Code:

```
/plugin marketplace add chamikalakshan/beatframe
/plugin install beatframe@beatframe
```

Or from a terminal: `claude plugin marketplace add chamikalakshan/beatframe` then `claude plugin install beatframe@beatframe`.

**Needs:** Node.js 22.18 or newer, npm and ffmpeg. Each video project installs Remotion (about 300 MB), and the first render downloads Chrome Headless Shell (about 170 MB).

## Use

Just ask Claude:

- "Make a music video for `song.mp3`. It's a love song about ..."
- "Make a lyric video for `song.mp3` with `lyrics.srt`, vertical for Reels."
- "What's the tempo of this track and where are the drops?"

Claude checks your setup, creates the project, reads the timing report, offers three story ideas, builds the scenes, renders a contact sheet to check its own work, and renders the final MP4 in 16:9, 9:16 or 1:1.

You can preview and tweak everything in Remotion Studio (`npm run studio`): play it with sound, scrub, switch format, and edit titles, colours and scene timing in the props panel.

## How it works

```
song.mp3 ──analyzer──▶ public/timing.json + timing-report.md
                                  │
            scene list: { type: 'drop', from: 'hit:1', to: 'hit:1+1bar' }
                                  │
           Remotion scenes with useBeat(), usePulse('kick'), useLyric() …
                                  │
            npm run stills ──▶ contact sheet Claude reviews ──▶ npm run render
```

**Labels** (full grammar in [timing.md](plugins/beatframe/skills/beatframe/references/timing.md)):

| Label | Means |
|---|---|
| `beat:12`, `bar:9`, `hit:2` | The 12th beat, start of bar 9, second big hit |
| `L5`, `L5.end` | Lyric line 5 starts, ends |
| `section:chorus:2` | Second chorus (when sections are known) |
| `end-2bars`, `L3+1beat`, `hit:1-0.25s` | Offsets in bars, beats or seconds |

**The analyzer** (basic mode) is plain Node + ffmpeg, no Python needed: spectral-flux onsets, autocorrelation tempo with a kick-band octave check, dynamic-programming beat tracking, downbeats from low-end attacks, loudness hits, and SRT/LRC lyrics. It analyzes a 4-minute song in about a second.

**The Remotion library** is copied into each project (`src/beatframe/`), so Claude can change anything per video: hooks for the song clock, `<At from="L3">` instead of `<Sequence>`, layout helpers for three formats, and effects (sunburst, flash, rings, confetti, shake, pop).

## Repo layout

```
.claude-plugin/marketplace.json     this repo is a plugin marketplace
plugins/beatframe/skills/beatframe/
  SKILL.md                          the workflow Claude follows
  references/                       timing format, API, review checklist
  scripts/                          analyze, new-project, doctor
  assets/starter/                   Remotion project template
dev/synth-track.mjs                 synthetic test and demo track (CC0)
test/                               npm test
```

## Develop

```bash
npm test
```

## License

Beatframe is [MIT](LICENSE).

**Remotion has its own license.** It is free for individuals, non-profits and companies with up to 3 employees; larger companies need a [Remotion company license](https://www.remotion.dev/docs/pricing). Check it before using Beatframe commercially.

Not affiliated with Anthropic or Remotion.
