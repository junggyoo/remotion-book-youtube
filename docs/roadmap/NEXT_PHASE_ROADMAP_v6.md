# Next Phase Roadmap v6 — 현실 반영 업데이트

> Date: 2026-03-28
> Status: P0 완료, Editorial Motion System Phase 0+1+2A 완료, P1 부분 완료
> Goal: 전문가 수준 모션그래픽 책 유튜브 영상 제작 에이전트

---

## 현재 상태 요약

### 오케스트레이터 — 전 Stage real

| #   | Stage            | Status  | 비고                                            |
| --- | ---------------- | ------- | ----------------------------------------------- |
| 1   | BookAnalyzer     | ✅ real | `scripts/stages/book-analyzer.ts`               |
| 2   | NarrativePlanner | ✅ real | `scripts/stages/narrative-planner.ts`           |
| 3   | OpeningComposer  | ✅ real | `scripts/stages/opening-composer.ts`            |
| 4   | ScenePlanner     | ✅ real | `scripts/stages/scene-planner.ts`               |
| 5   | GapDetector      | ✅ real | `scripts/stages/gap-detector.ts`                |
| 6   | SceneSynthesizer | ✅ real | `scripts/stages/scene-synthesizer.ts`           |
| 6.3 | BeatComposer     | ✅ real | `scripts/stages/beat-composer.ts` (1000+ lines) |
| 6.5 | AssetPlanner     | ✅ real | `scripts/stages/asset-planner.ts`               |
| 7   | Validator        | ✅ real | orchestrator 내장 + autoFix                     |
| 8   | Renderer         | ✅ real | orchestrator 내장 (prepare-plan + make-video)   |
| 9   | ScenePromoter    | ✅ real | orchestrator 내장 (promotionObserver)           |

### Editorial Motion System — Phase 2A 완료

| Phase        | 목표                           | Status      |
| ------------ | ------------------------------ | ----------- |
| Phase 0      | Contract + Direction Bootstrap | ✅ 완료     |
| Phase 1      | Beat Semantics 분리            | ✅ 완료     |
| **Phase 2A** | **Core Composition Engine**    | **✅ 완료** |
| Phase 2B     | Grammar Expansion              | ⬜ 다음     |
| Phase 3      | Interpretation Engine 강화     | ⬜ 대기     |
| Phase 4      | Scene Invention Loop           | ⬜ 대기     |

### P1 렌더링 품질 — 부분 완료

| 항목                                 | Status  | 비고                          |
| ------------------------------------ | ------- | ----------------------------- |
| P1-1 TransitionSeries                | ✅ 완료 | storyboard-driven transitions |
| P1-2 KineticText + WordHighlight     | ✅ 완료 | hook/opening + 전체 확장      |
| P1-3 SceneWrapper (background depth) | ✅ 완료 | 그라데이션, 텍스처, parallax  |
| P1-4 Preset scene modernization      | ✅ 완료 | spacing, hierarchy, card 구조 |
| P1-5 DiagramSpec (Early Asset Path)  | ✅ 완료 | P2-1로 구현됨                 |
| P1-6 QA Failure Taxonomy             | ✅ 완료 | RenderFailureCode + autoFix   |

### P2 전문가급 — 부분 완료

| 항목                             | Status      | 비고                                                 |
| -------------------------------- | ----------- | ---------------------------------------------------- |
| P2-1 Animated diagram primitives | ✅ 완료     | AnimatedPath, NodeActivation, FrameworkScene overlay |
| P2-2 Camera wrapper              | ✅ 완료     | CameraLayer + SceneRenderer 래핑                     |
| P2-3 Narration sync              | ✅ 완료     | KeyInsightScene (Framework/Quote 미확장)             |
| P2-4 Emphasis expansion          | ⬜ 대기     | emphasisTargets → 자막→씬→카메라                     |
| P2-5 ScenePromoter               | ✅ 완료     | promotionObserver 구현됨                             |
| P2-6 SFX + QA auto-fix           | ✅ 부분완료 | transitionSfx 구현, autoFix 1차                      |

---

## 완료된 것 (P0 + P1 + P2 부분 + Editorial Motion Phase 0~2A)

**P0 전체 완료:** 모든 오케스트레이터 stage가 real. "책 JSON → 오케스트레이터 1회 실행 → 영상 자동 생성" 가능.

**P1 전체 완료:** TransitionSeries, KineticText, SceneWrapper, preset modernization, QA taxonomy.

**P2 부분 완료:** diagram primitives, camera, narration sync, SFX, ScenePromoter.

**Editorial Motion System Phase 0~2A:** Direction Layer (7 profiles), Beat Semantics (semantic analyzer + timeline compiler), Composition Engine (CompositionFactory + 3 family recipes + CompositionPathRouter).

---

## 다음 우선순위

### 1순위: Phase 2B — Grammar Expansion

> Phase 2A에서 엔진을 만들었다. 2B에서는 엔진의 어휘를 늘린다.

**목표:** composed path로 렌더 가능한 scene family와 시각 표현력을 확장

**산출물:**

- 새 layout 추가 (timeline-v, flowchart, matrix-2x2, funnel, concentric, stacked-layers)
- 새 choreography 추가 (anchor-shift, suspend-reveal, layer-stack, split-reveal 확장)
- 새 primitive 추가 (DiagramNode, ComparisonColumn, FunnelStep, MatrixCell)
- 추가 family recipes (tension-comparison, evidence-stack, reflective-anchor 등)
- uniqueElements → composition hints 정규화 강화

**완료 기준:**

- composed path로 렌더 가능한 family 수: 3개 → 7개+
- 새 layout/choreography가 실제 registry에 등록되고 사용됨
- preset 없이 composed path만으로 최소 50% 씬이 안정 렌더

### 2순위: Phase 3 — Interpretation Engine 강화

> 2B의 확장된 capability 중 무엇을 선택할지 결정하는 intelligence

- InterpretationRules (장르 × structure → family 가중치)
- ScenePlanGenerator (NarrativePlan → SceneSpec[] 동적 결정)
- GapClassifier 고도화
- InterpretationTrace

### 3순위: P2-4 Emphasis Expansion

- emphasisTargets를 자막 → 씬 내부 텍스트 → 카메라까지 확장
- useEmphasisGate 채널 우선순위 구현

### 4순위: Phase 4 — Scene Invention Loop

- gap → 생성 → 검증 → 승격
- InventionValidator + PromotionWorkflow + SceneRegistry

---

## 핵심 문서 참조

| 문서           | 경로                                                                       |
| -------------- | -------------------------------------------------------------------------- |
| 아키텍처 스펙  | `docs/superpowers/specs/2026-03-28-editorial-motion-system-design.md`      |
| Phase 2A 계획  | `docs/superpowers/plans/2026-03-28-phase2a-core-composition-engine.md`     |
| Phase 0 계획   | `docs/superpowers/plans/2026-03-28-phase0-contract-direction-bootstrap.md` |
| 이 로드맵      | `docs/roadmap/NEXT_PHASE_ROADMAP_v6.md`                                    |
| Beat 시스템    | `docs/specs/BEAT_SYSTEM_DESIGN_SPEC_v0.2.md`                               |
| DSGS 정규 스펙 | `docs/specs/DSGS_CANONICAL_SPEC_v1.md`                                     |

---

## v5 → v6 변경 사항

1. **P0 상태 현실화:** 모든 오케스트레이터 stage가 ✅ real (v5에서 stub으로 표기된 Stage 3~6.3, 9 모두 구현 완료 확인)
2. **P1 상태 현실화:** 6개 항목 전체 완료 확인
3. **P2 상태 현실화:** P2-1~3, P2-5~6 완료 확인
4. **Editorial Motion System Phase 추가:** Phase 0+1+2A 완료 기록
5. **다음 우선순위 재정의:** Phase 2B → Phase 3 → P2-4 → Phase 4
