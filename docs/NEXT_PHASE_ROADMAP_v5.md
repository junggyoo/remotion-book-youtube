# Next Phase Roadmap v5 — 최종 실행 로드맵
## DSGS 자동 판단 엔진 + 렌더링 표현력 향상

> Date: 2026-03-27
> Status: Phase A~D 완료 후, v4 피드백 반영 최종판
> Goal: 전문가 수준 모션그래픽 책 유튜브 영상 제작 에이전트

---

## 우선순위 구조

| 등급 | 목표 | 핵심 질문 |
|------|------|----------|
| **P0** | DSGS 자동 판단 엔진 real | "책 제목만 넣으면 장면 구성이 자동으로 결정되는가?" |
| **P1** | 렌더링 baseline 품질 상승 | "결과물이 전문가 영상에 가까워 보이는가?" |
| **P2** | 전문가급 확장 | "디테일이 살아있는가? 재사용 가능한가?" |

**원칙: P0가 완료되어야 P1의 가치가 극대화된다.**
자동 구성 엔진 없이 표현력만 올리면 "수동 고급 슬라이드 시스템"에 머문다.

---

## 현재 오케스트레이터 상태

| # | Stage | Status | 목표 등급 |
|---|-------|--------|----------|
| 1 | BookAnalyzer | ✅ real | — |
| 2 | NarrativePlanner | ✅ real | — |
| 3 | OpeningComposer | ⬜ stub | P0 |
| 4 | ScenePlanner | ⬜ stub | P0 |
| 5 | GapDetector | ⬜ stub | P0 |
| 6 | SceneSynthesizer | ⬜ stub | P0 |
| 6.3 | BeatComposer | ⬜ stub | P0 |
| 6.5 | AssetPlanner | ✅ real | — |
| 7 | Validator | ✅ real | — |
| 8 | Renderer | ✅ real | — |
| 9 | Promoter | ⬜ stub | P2 |

---

## P0 — DSGS 자동 판단 엔진 완성

> 이 단계가 끝나면: "책 제목 → planning artifacts + blueprint 자동 생성"이 가능해짐

### P0-1: BeatComposer wrapper
- **Stage**: 6.3 stub → real
- **난이도**: 하
- **의존**: 없음
- **산출물**: 씬별 beats 배열 자동 생성

### P0-2: ScenePlanner wrapper
- **Stage**: 4 stub → real
- **난이도**: 중하
- **의존**: P0-1
- **산출물**: 03-storyboard.json 자동 생성
- **주의**: 먼저 `src/planner/scenePlanner.ts`의 실제 인터페이스를 확인한 후 wrapper 설계

### P0-3: GapDetector wrapper
- **Stage**: 5 stub → real
- **난이도**: 하
- **의존**: P0-2
- **산출물**: SceneGap[] 저장 + gap summary
- **주의**: 순수 gap 탐지만. 에셋 요구사항은 이미 real인 Stage 6.5 AssetPlanner가 처리

### P0-4: OpeningComposer real
- **Stage**: 3 stub → real
- **난이도**: 중
- **의존**: P0-2 (storyboard에서 opening 위치 결정)
- **산출물**: 02-art-direction.json 자동 생성

### P0-5a: SceneSynthesizer wrapper
- **Stage**: 6 stub → real (1단계: wrapper만)
- **난이도**: 상
- **의존**: P0-3 (gap 목록), P0-4 (art direction)
- **산출물**: SceneGap[] → synthesizeGaps() → 06-blueprints/*.json

### P0-5b: SceneSynthesizer 오케스트레이터 통합
- **Stage**: 6 완전 연결
- **난이도**: 중
- **의존**: P0-5a
- **산출물**: 오케스트레이터에서 자동 실행, storyboard blueprint 씬 자동 반영

### P0-6: Art direction weighted synthesis
- **난이도**: 중
- **의존**: P0-5a
- **산출물**: layoutBias/motionCharacter가 실제 blueprint를 변화시킴

### P0 완료 기준
- `atomic-habits` content JSON으로 오케스트레이터 1회 실행 시:
  - 00-fingerprint ~ 06-blueprints 전체 자동 생성
  - validation 통과
  - Remotion Studio에서 프리뷰 가능
- 다른 책으로도 실행 시 다른 blueprint가 나옴

---

## P1 — 렌더링 baseline 품질 상승

> 이 단계가 끝나면: 전체 영상(preset + blueprint)의 시각적 품질이 도약

### P1-1: TransitionSeries 도입
- **축**: 렌더링
- **난이도**: 중
- **의존**: P0-1 (beat 타이밍 있어야 전환 타이밍 정확)
- **산출물**: 씬 간 fade/slide/wipe 전환

### P1-2: KineticText + WordHighlight
- **축**: 렌더링
- **난이도**: 중
- **의존**: P0-1 (beat emphasisTargets)
- **산출물**: 단어별 stagger 등장 + 키워드 하이라이트
- **범위 제한**: 1차 적용은 hook/opening 씬만. 안정 후 확장

### P1-3: SceneWrapper (Background depth system)
- **축**: 렌더링
- **난이도**: 중하
- **의존**: P0-4 (art direction의 palette, textureMood)
- **산출물**: 그라데이션 배경, 텍스처, 미세 parallax
- **적용 범위**: preset + blueprint 모든 씬 (래퍼 레벨, 개별 씬 수정 없음)

### P1-4: Preset scene modernization pass
- **축**: 렌더링
- **난이도**: 중
- **의존**: P1-3 (SceneWrapper 위에 추가 개선)
- **대상**: CoverScene, KeyInsightScene, CompareContrastScene, QuoteScene, ClosingScene
- **개선 항목**: spacing, headline hierarchy, card/container 구조, active/dim emphasis, non-text decorative elements
- **원칙**: SceneWrapper로 해결 안 되는 씬 내부 구조만 터치

### P1-5: Early Asset Path (DiagramSpec)
- **축**: 데이터
- **난이도**: 중하
- **의존**: P0-4 (art direction에 visualMetaphors)
- **산출물**: DiagramSpec 타입 + metaphor→spec 매핑
- **위치**: H-3(Animated diagram)의 선행 조건. P1에서 미리 준비

### P1-6: QA Failure Taxonomy
- **축**: 품질
- **난이도**: 하
- **산출물**: RenderFailureCode enum + 판정 로직
- **병행 가능**: P1 어느 시점에서든

### P1 완료 기준
- 같은 content로 P0 only vs P0+P1 영상을 비교했을 때 차이가 명확
- 씬 전환이 부드럽고, 텍스트에 생동감, 배경에 깊이감
- preset 씬과 blueprint 씬의 품질 격차가 줄어듦

---

## P2 — 전문가급 모션그래픽 확장

> 이 단계가 끝나면: 전문가 유튜버 수준의 모션 그래픽 영상

### P2-1: Animated diagram primitives
- AnimatedPath (SVG path drawing)
- NodeActivation (순차 색상 전환)
- ZoomFocus (다이어그램 → 특정 노드 zoom-in)

### P2-2: Camera wrapper
- 씬 레벨 미세 zoom/pan (Ken Burns)
- beat emphasis 구간 연동

### P2-3: Narration sync
- VTT 타이밍 → 씬 내부 텍스트 WordHighlight 연동
- "말하는 단어가 화면에서 빛나는" 효과

### P2-4: Emphasis expansion
- emphasisTargets를 자막 → 씬 내부 텍스트 → 카메라까지 확장

### P2-5: ScenePromoter real (Stage 9)
- 승격 기준 적용, ephemeral → persistent

### P2-6: SFX + QA 강화
- 씬 전환 whoosh/swoosh SFX
- QA failure taxonomy 기반 auto-fix 1차

---

## 병행 작업 (P0부터 시작, 순서 무관)

### Promotion Criteria Logging
`generated/promotion-log.md` — custom scene 생성 시마다:
- 패턴 이름, archetype 적합성, 재사용 가능성, 승격 후보 여부

### HITL 모드 인프라
P0-1에서 `--mode auto|review` 플래그 구축. 이후 동일 패턴.

---

## 실행 순서 요약

```
P0 (자동화 엔진)
  P0-1  BeatComposer wrapper
  P0-2  ScenePlanner wrapper
  P0-3  GapDetector wrapper
  P0-4  OpeningComposer real
  P0-5a SceneSynthesizer wrapper
  P0-5b SceneSynthesizer 오케스트레이터 통합
  P0-6  Art direction weighted synthesis

P1 (렌더 품질)
  P1-1  TransitionSeries
  P1-2  KineticText + WordHighlight (hook/opening 먼저)
  P1-3  SceneWrapper (background depth)
  P1-4  Preset scene modernization
  P1-5  Early Asset Path (DiagramSpec)
  P1-6  QA Failure Taxonomy

P2 (전문가급)
  P2-1  Animated diagram primitives
  P2-2  Camera wrapper
  P2-3  Narration sync
  P2-4  Emphasis expansion
  P2-5  ScenePromoter
  P2-6  SFX + QA auto-fix
```