# Checking a video from its contact sheet

`npm run stills` renders frames with the debug overlay (song time, beat, bar, lyric line, scene) and tiles them into `stills/sheet-<format>.jpg`; `stills/index.md` says what each tile is meant to show. Read both, then check:

**Timing**
- [ ] Each hit tile shows the change it should (flash, cut, new scene), not the moment before it.
- [ ] Lyric tiles show the line in the overlay's `LN` (no stale or early lines).
- [ ] Scene names in the overlay match the planned script.

**Picture**
- [ ] No empty or black frames, except intended fades.
- [ ] No text cut off at the edges or hidden behind other layers; text sits inside the safe area.
- [ ] Text is readable: enough contrast, not too small on 9:16.
- [ ] Non-Latin lyrics render as real glyphs (no boxes or question marks).
- [ ] Colours and type stay consistent across scenes unless a change is intended.

**Variety**
- [ ] Neighbouring tiles differ: nothing looks the same for more than about 10 seconds.
- [ ] The biggest visual change sits on the biggest hit.

**Formats** (when the user wants more than one)
- [ ] `npm run stills -- --format all` and check 9:16 and 1:1: nothing important off-screen, no awkward empty space.

When something fails, fix it, re-render only the affected moments with `npm run stills -- --at "..."`, and look again. Tell the user what you checked and anything you could not verify (for example how it sounds together, which only they can judge in Studio).
