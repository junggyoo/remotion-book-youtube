---
paths:
  - src/tts/**
  - src/pipeline/subtitleGen*
---

# 미디어(TTS + 자막) 규칙

## 자막 스타일
- 한 문장씩 표시 (sentence-by-sentence)
- 28자/줄, 최대 2줄
- VO 시작 3f 전 자막 노출, 종료 후 6f 유지

## 한국어 처리
- 어절 단위 줄바꿈
- 조사 분리 방지 (예: "것을" → 같은 줄에 유지)

## TTS
- narrationText → TTS 엔진 선택 + voice 설정
- TTS 실패 시 fallback: silent + 자막만

## mediaPlan 필수 필드
- narration, caption, audio, asset 4가지 모두 포함 필수
