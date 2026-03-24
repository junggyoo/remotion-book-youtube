---
name: opening-compose
description: >
  책의 특성에 맞는 Opening(Hook + Intro)을 동적 설계한다.
  오프닝 설계, 훅 전략, 도입부 작성 시 사용.
  "오프닝 만들어줘", "훅 전략", "도입부 설계" 등에 자동 활성화.
context: inline
---

# Opening Composer

BookFingerprint를 기반으로 OpeningPackage(Hook + Intro + transitionBridge)를 동적 생성하는 시스템.

## 핵심 규칙

1. **Opening은 OpeningPackage로 다룸** — Hook과 Intro는 분리된 씬이 아니라 하나의 설계 단위
2. **프리셋 사용 금지** — 일반 경로에서 Opening preset 사용 불가 (fallback-only)
3. **hookStrategy 반드시 명시 선택** — 7가지 중 스코어링으로 선택
4. **openingGenericness < 0.35 필수** — Stage 7 BlueprintValidator가 검증
5. **SynthesizedBlueprint 필수** — lifecycle: 'ephemeral', fallbackPreset, fallbackContent 포함
6. **sentinel narrationText** — `[HOOK_NARRATION]` / `[INTRO_NARRATION]`은 에이전트가 실제 나레이션으로 교체

## 7가지 Hook Strategy

상세 설명과 예시: [hook-strategies.md](hook-strategies.md)

| Strategy | 설명 | 패턴 |
|----------|------|------|
| pain | 시청자의 문제를 찌름 | 문제→공감→해결 약속 |
| contrarian | 통념을 뒤집음 | 통념→반박→진짜 이유 |
| transformation | 변화 전후를 먼저 보여줌 | 결과→궁금증→방법 약속 |
| identity | 정체성에 연결 | 정체성 질문→연결→해답 |
| question | 강한 질문으로 시작 | 질문→일반답→깊은 답 약속 |
| system | 원인이 구조라고 프레이밍 | 오해→시스템 관점→해결 |
| urgency | 지금 바꿔야 한다고 자극 | 현재→위험→변화 약속 |

## 스코어링 로직

- 5개 차원 (합계 1.0): 장르 친화도 0.25, 구조 매칭 0.25, 톤 매칭 0.20, 콘텐츠모드 0.15, 내러티브아크 0.15
- Primary: 최고 점수 전략
- Secondary: `score >= primary * 0.7`일 때 선택
- 최소 점수 기준: 모든 전략이 0.3 미만이면 `fingerprint.hookStrategy`로 폴백
- 동점 시 `fingerprint.hookStrategy` 우선

## Intro Framing 규칙

- 책 정보 소개가 아니라 **"왜 이 영상을 봐야 하는가"**
- Hook이 만든 긴장을 Intro가 의미로 정리
- transitionBridge로 본론에 자연스럽게 진입
- 상세 예시: [intro-framing-examples.md](intro-framing-examples.md)

## 사용법

```typescript
import { composeOpening } from '@/analyzer'
import { useTheme } from '@/design/themes/useTheme'

const theme = useTheme('dark', fingerprint.genre)
const pkg = composeOpening(fingerprint, { format: 'longform', theme })
// pkg.hook.mediaPlan.narrationText === '[HOOK_NARRATION]' ← 에이전트가 교체
// pkg.intro.mediaPlan.narrationText === '[INTRO_NARRATION]' ← 에이전트가 교체
```

## 파이프라인 위치

```
1.BookAnalyzer → 2.NarrativePlanner → **3.OpeningComposer** → 4.ScenePlanner → ...
```

- 입력: BookFingerprint (Stage 1 출력)
- 출력: OpeningPackage (SynthesizedBlueprint × 2 + transitionBridge)
- `fingerprint.hookStrategy`는 Stage 1의 추천값이며, OpeningComposer는 독립적으로 재스코어링함
