# TTS Engine Comparison

DSGS supports multiple TTS engines via `TTSEngineKey` type.

## Engine Matrix

| Engine            | Cost             | Korean                                   | Quality   | Latency        | Notes                                                                 |
| ----------------- | ---------------- | ---------------------------------------- | --------- | -------------- | --------------------------------------------------------------------- |
| **edge-tts**      | Free             | ✅ ko-KR-SunHiNeural, ko-KR-InJoonNeural | Good      | Fast (~1-3s)   | Microsoft Azure Edge, CLI via `pip install edge-tts`. Default choice. |
| **elevenlabs**    | Paid ($5+/mo)    | ✅ (multilingual v2)                     | Excellent | Medium (~3-5s) | Best quality, expensive at scale. API key required.                   |
| **qwen3-tts**     | Free (self-host) | ✅                                       | Good      | Varies         | Open source, requires GPU for real-time.                              |
| **chatterbox**    | Free (self-host) | ❌ (English only)                        | Good      | Varies         | ResembleAI open source. Not suitable for Korean.                      |
| **fish-audio-s2** | Free (self-host) | ⚠️ (limited)                             | Good      | Varies         | Community voice cloning. Korean support experimental.                 |

## Recommended Selection

1. **Production (free)**: `edge-tts` — reliable, fast, good Korean quality
2. **Production (paid)**: `elevenlabs` — best quality when budget allows
3. **Development/testing**: `edge-tts` — zero cost, no API key needed

## edge-tts Korean Voices

| Voice ID             | Gender | Style                          |
| -------------------- | ------ | ------------------------------ |
| `ko-KR-SunHiNeural`  | Female | Standard narration, warm tone  |
| `ko-KR-InJoonNeural` | Male   | Standard narration, clear tone |

## edge-tts CLI Usage

```bash
# Install
pip install edge-tts

# Generate audio + VTT subtitles
edge-tts --voice ko-KR-SunHiNeural --text "텍스트" --write-media output.mp3 --write-subtitles output.vtt

# With speed/pitch adjustment
edge-tts --voice ko-KR-SunHiNeural --rate "+10%" --pitch "+2Hz" --text "텍스트" --write-media output.mp3
```

## VTT Format Note

edge-tts outputs VTT with comma-separated timestamps (`HH:MM:SS,mmm`) instead of standard WebVTT dot separator (`HH:MM:SS.mmm`). The shared `vttParser.ts` handles this format.
