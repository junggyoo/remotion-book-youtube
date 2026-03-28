# TTS Engine Comparison

DSGS supports multiple TTS engines via `TTSEngineKey` type.

## Engine Matrix

| Engine         | Cost             | Korean | Quality   | Latency        | Emotion Tags | Notes                                                                             |
| -------------- | ---------------- | ------ | --------- | -------------- | ------------ | --------------------------------------------------------------------------------- |
| **fish-audio** | Paid (API)       | ✅     | Excellent | Medium (~3-5s) | ✅ [bracket] | Fish Audio S2-Pro cloud API. Voice cloning + STT. **기본 엔진 (CLAUDE.md 선언)**. |
| **edge-tts**   | Free             | ✅     | Good      | Fast (~1-3s)   | ❌           | Microsoft Azure Edge, CLI via `pip install edge-tts`. Fallback 전용.              |
| **qwen3-tts**  | Free (self-host) | ✅     | Good      | Varies         | ❌           | Open source, requires GPU for real-time. Voice cloning 지원.                      |

## Recommended Selection

1. **Production (default)**: `fish-audio` — best quality, voice cloning, emotion tags, STT timestamps
2. **Fallback**: `edge-tts` — zero cost, no API key needed
3. **Development/self-host**: `qwen3-tts` — GPU 필요, 무료

## Fish Audio S2-Pro Features

- Cloud API: `https://api.fish.audio`
- 감정 태그: `[bracket]` 문법, 한국어 자연어 지원 (예: `[호기심 어린 톤으로]`)
- Paralinguistic: `[pause]`, `[emphasis]`, `[whisper]`, `[sigh]` 등
- STT: `/v1/asr` 엔드포인트로 segment-level 타임스탬프
- Temperature: 0.0~1.0 (씬 타입별 자동 조절)
- Speed: `prosody.speed` 0.5~2.0

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

## 주의: 엔진별 감정 태그 호환성

- Fish Audio: `[bracket]` 태그를 자연어로 해석하여 음성에 감정 반영
- edge-tts/qwen3-tts: 태그를 이해하지 못하고 **그대로 텍스트로 읽음**
- 따라서 emotionTag가 포함된 텍스트는 Fish Audio 경로에서만 사용해야 한다
