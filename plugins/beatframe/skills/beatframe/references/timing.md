# timing.json (version 1) and labels

`public/timing.json` is written by `scripts/analyze.mjs`. All times are seconds from the start of the audio; lists are sorted.

| Field | Meaning |
|---|---|
| `version` | `1` |
| `generator` | Analyzer name and version |
| `quality` | `basic` (Node analyzer: beats, bars, hits, energy) or `full` (later: adds sections and more) |
| `source` | Original audio file name |
| `duration` | Length of the audio |
| `tempo` | Beats per minute (typical beat gap) |
| `meter` | Beats per bar (default 4) |
| `beats` | Every beat |
| `downbeats` | First beat of every bar. A guess in basic mode; fix with `--first-bar N` |
| `onsets` | Note and drum attacks (any instrument) |
| `kicks` | Low-frequency attacks (kick drum, bass notes) |
| `hits` | `[{ t, strength }]`: big loudness rises (drops, choruses, entrances); `strength` is the rise in dB |
| `sections` | `[{ name, start, end }]`: empty in basic mode. You may add them by hand (e.g. from the user's description of the song) |
| `markers` | `{ name: seconds }`: hand-placed moments, referenced as `m:name` |
| `lyrics` | `{ source, lines: [{ start, end, text, words? }] }` from SRT or LRC, or `null` |
| `energy` | `{ rate: 10, values }`: loudness 0..1, ten values per second |

Editing `timing.json` by hand is fine (adding sections, markers, nudging a lyric line). Re-running the analyzer overwrites it.

## Labels

Anywhere a scene takes a time (`from`, `to`, `<At>`, `useLabel()`), use a label:

| Label | Means |
|---|---|
| `12.5` or `12.5s` | Seconds |
| `start`, `end` | Start and end of the song |
| `beat:N` | Beat N (1-based) |
| `bar:N` | Start of bar N (1-based); `bar:N.end` is the start of the next bar |
| `hit:N` | Hit N in time order |
| `onset:N`, `kick:N` | Onset or kick N |
| `LN` | Start of lyric line N (SRT numbering: L1 is the first line); `LN.end` is when it ends |
| `section:chorus` | First section named chorus; `section:chorus:2` the second; `section:3` the third section; add `.end` for its end |
| `m:NAME` | Marker from `markers` |

Offsets chain after any label: `+2beats`, `-1bar`, `+0.5s`, `+1beat`, `-2bars`. Examples: `L5+1bar`, `hit:2-0.25s`, `end-2bars`, `bar:9+2beats`. Beat and bar offsets use the song tempo. Beats and bars past the end of the list are extrapolated at the tempo.

Unknown or out-of-range labels throw an error naming the problem (for example "there are only 14 lyric lines").
