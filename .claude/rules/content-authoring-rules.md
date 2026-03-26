# Content Authoring Rules

## Duration 규칙

- narrationText가 있는 씬에 durationFrames를 직접 명시하지 않는다
- TTS 결과가 duration의 source of truth (자동으로 TTS + 15f 적용)
- narrationText가 없는 씬(transition 등)만 durationFrames 명시 허용
- minDurationFrames로 최소 보장 가능 (optional)

## Beat Activates Key 규칙

- framework 씬: item-0, item-1, item-2... (0-indexed, items[] 배열 인덱스와 일치)
- application 씬: step-0, step-1, step-2... (0-indexed, steps[] 배열 인덱스와 일치)
- timeline 씬: event-0, event-1... (0-indexed)
- listReveal 씬: item-0, item-1... (0-indexed)
- 기타 씬: 고정 키 사용 (headline, supportText 등)
- '\*'는 wildcard — 모든 요소 자동 stagger

## Cover Asset 규칙

- coverImageUrl은 assets/ 기준 상대경로 (예: "covers/book.png")
- 파일 미존재 시 fallback 동작하지만 QA warning 발생
- 에셋은 수동 배치 (자동 수집 파이프라인 없음)

## Narration 규칙

- beat.narrationText의 합 = scene.narrationText (TTS 일관성)
- 모든 beat에 narrationText가 있어야 TTS-beat 타이밍 싱크 정상 동작
- visual-only beat(narrationText 없음)은 ratio 기반 타이밍 사용
