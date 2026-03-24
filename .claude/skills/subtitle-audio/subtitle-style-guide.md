# Subtitle Style Guide

## Display Rules (from DSGS Spec §3-3)

### Sentence-by-Sentence Mode

- Each sentence is displayed as a separate subtitle cue
- One cue visible at a time (no overlapping)
- Korean sentence splitting: see [korean-nlp-rules.md](korean-nlp-rules.md)

### Line Constraints

- **Max characters per line**: 28
- **Max lines**: 2
- Overflow handling: text is hard-wrapped at 28 chars, lines beyond 2 are trimmed

### Timing

- **Lead frames**: 3 — subtitle appears 3 frames (100ms @ 30fps) before VO starts
- **Trail frames**: 6 — subtitle lingers 6 frames (200ms @ 30fps) after VO ends
- This creates a subtle "anticipation + persistence" effect

### Transition Styles

- **fade-slide** (default): opacity 0→1 + translateY 12→0px on enter, reverse on exit
  - Enter zone: first 3 frames (matches lead)
  - Exit zone: last 6 frames (matches trail)
  - Uses linear interpolation (not spring — too fast for spring)
- **hard-cut**: instant show/hide (no animation)

## Visual Style

### Positioning

- Bottom of screen, centered horizontally
- Respects safe area margins (outerMarginX, outerMarginY)
- Extra padding: `sp(4)` above safe area bottom

### Background

- Color: `rgba(0, 0, 0, 0.65)` (semi-transparent black)
- Border radius: `radius.md` from design tokens
- Padding: `sp(2)` vertical, `sp(4)` horizontal

### Typography

- Font: `typography.fontFamily.sans` (Pretendard)
- Size: `typeScale.bodyM` from format-aware tokens
- Weight: `typography.fontWeight.medium`
- Color: `theme.textStrong`
- Line height: `typography.lineHeight.normal`
- Letter spacing: `typography.tracking.normal`

### Z-Index

- Layer: `zIndex.hud` (70)
- Above all scene content, below transitions and global overlays

## Comparison: SubtitleLayer vs CaptionLayer

| Feature      | SubtitleLayer (DSGS)      | CaptionLayer (Legacy)         |
| ------------ | ------------------------- | ----------------------------- |
| Data source  | Props (`SubtitleEntry[]`) | File (`staticFile()`)         |
| Display mode | Sentence-by-sentence      | Word-highlight (TikTok-style) |
| Timing       | VTT-derived per sentence  | 2.4s page groups              |
| Animation    | fade-slide / hard-cut     | None (instant)                |
| Highlighting | None                      | Active word highlight         |
| Pipeline     | BlueprintRenderer         | LongformComposition           |
