---
name: subtitle-audio
description: TTS voice synthesis + subtitle generation + audio-subtitle sync for DSGS pipeline
triggers:
  - TTS
  - 자막
  - 나레이션
  - 음성
  - subtitle
  - caption
  - audio sync
  - edge-tts
  - 자막 싱크
---

# Subtitle-Audio Skill

TTS 음성 합성 + 자막 생성 + 싱크를 처리한다.

## Key Files

| File                                   | Purpose                                                                 |
| -------------------------------------- | ----------------------------------------------------------------------- |
| `src/tts/ttsClient.ts`                 | edge-tts CLI integration, `generateTTS()` / `generateTTSWithCaptions()` |
| `src/tts/subtitleGen.ts`               | sentence-level subtitle generation, Korean sentence splitting           |
| `src/tts/vttParser.ts`                 | VTT → Caption[] parsing (shared with scripts/generate-captions.ts)      |
| `src/tts/durationSync.ts`              | TTS duration → durationFrames decision tree                             |
| `src/tts/mediaPlanExecutor.ts`         | Full pipeline orchestration for DSGS blueprints                         |
| `src/tts/index.ts`                     | Barrel export for all TTS modules                                       |
| `src/components/hud/SubtitleLayer.tsx` | DSGS subtitle rendering (props-driven, fade-slide)                      |
| `src/components/hud/CaptionLayer.tsx`  | Legacy caption rendering (file-driven, word-highlight)                  |

## Dual Pipeline Architecture

```
LEGACY PATH:
  scripts/generate-captions.ts → assets/tts/*.json + *.mp3
  → LongformComposition → CaptionLayer (word-highlight, file-driven)

DSGS PATH:
  mediaPlanExecutor.ts → generateTTSWithCaptions() → generateSentenceSubtitles()
  → BlueprintRenderer scene → SubtitleLayer (sentence-fade, props-driven)
```

Both share: `src/tts/vttParser.ts`, edge-tts CLI, `assets/tts/` output directory.

## Rules

### Caption Plan (from DSGS Spec §3-3 MediaPlan.captionPlan)

- **mode**: `sentence-by-sentence` — 한 문장씩 표시
- **maxCharsPerLine**: 28
- **maxLines**: 2
- **leadFrames**: 3 — VO 시작 3f 전 자막 노출
- **trailFrames**: 6 — VO 종료 후 6f 유지
- **transitionStyle**: `fade-slide` (default) | `hard-cut`

### TTS Engine

- Default: `edge-tts` (free, Korean support via ko-KR-SunHiNeural)
- See [tts-engine-comparison.md](tts-engine-comparison.md) for alternatives

### Fallback Chain

1. TTS succeeds → sentence-level subtitles from VTT timing
2. TTS fails → single-entry subtitle with estimated timing
3. Subtitle generation fails → no subtitles (render continues)

### Output Directory

- All TTS files go to `assets/tts/` (matches `remotion.config.ts` publicDir)
- Audio: `assets/tts/{sceneId}.mp3`
- VTT: `assets/tts/{sceneId}.vtt` (retained for debugging)
- Captions JSON: `assets/tts/{sceneId}.json` (legacy path only)
- Manifest: `assets/tts/manifest.json` (legacy path only)

## Related Documentation

- [TTS Engine Comparison](tts-engine-comparison.md)
- [Subtitle Style Guide](subtitle-style-guide.md)
- [Korean NLP Rules](korean-nlp-rules.md)
