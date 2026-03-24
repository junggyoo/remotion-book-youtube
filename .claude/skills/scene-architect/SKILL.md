---
name: scene-architect
description: >
  NarrativePlan에서 씬을 매칭하고 gap을 탐지한다.
  "씬 계획", "gap 탐지", "프리셋 매칭" 등에 자동 활성화.
context: inline
---

# Scene Architect

VideoNarrativePlan + BookFingerprint를 기반으로 기존 프리셋을 매칭하고, 프리셋으로 표현 불가한 gap을 탐지하는 시스템.

## 핵심 규칙

1. **Two-pass pipeline** — Stage 4 `matchPresets()`가 프리셋 매칭, Stage 5 `detectGaps()`가 gap 분류
2. **Policy 기반** — 모든 임계값은 PlanningPolicy에서 관리 (하드코딩 금지)
3. **결정론적** — 동일 입력 → 동일 출력 (LLM 호출 없음)
4. **Opening 제외** — Opening은 Stage 3 OpeningComposer가 담당, minSignatureScenes에 불포함
5. **per-sceneType scoring** — 9개 프리셋 각각 독립 스코어링 함수 보유

## 파이프라인 위치

```
1.BookAnalyzer → 2.NarrativePlanner → 3.OpeningComposer
→ **4.ScenePlanner(matchPresets)** → **5.GapDetector(detectGaps)**
→ 6.SceneSynthesizer → ...
```

## 사용법

```typescript
import { createPlanningPolicy, matchPresets, detectGaps } from '@/planner'

const policy = createPlanningPolicy()  // threshold 0.7, min 2, max 5
const plan = matchPresets(narrativePlan, fingerprint, openingPackage, policy)
const result = detectGaps(plan, fingerprint, narrativePlan)

// result.presetMatches: 기존 프리셋으로 충분한 씬
// result.gaps: 합성이 필요한 씬 (Stage 6 입력)
```

## PlanningPolicy 튜닝

| 파라미터 | 기본값 | 설명 |
|----------|--------|------|
| presetConfidenceThreshold | 0.7 | 이상이면 프리셋 사용, 미만이면 gap |
| minSignatureScenes | 2 | 최소 합성 씬 수 (Opening 제외) |
| maxSynthesizedScenes | 5 | 최대 합성 씬 수 |
| openingMustBeDynamic | true | Opening은 항상 동적 생성 |

## 스코어링 차원

각 프리셋별 scoring 함수가 4개 차원을 평가:

| 차원 | 가중치 | 설명 |
|------|--------|------|
| delivery | 0.35 | requiredDelivery vs 프리셋 capabilities 매칭 |
| structure | 0.25 | BookFingerprint.structure와 정렬 |
| contentFit | 0.25 | 해당 segment role에 콘텐츠 적합성 |
| layout | 0.15 | spatialMetaphors vs layout archetype 정렬 |

## 5가지 Gap Detection 질문

상세 체크리스트: [gap-checklist.md](gap-checklist.md)
