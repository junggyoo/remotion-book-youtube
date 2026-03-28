# Editorial Motion System — Hybrid Bridge Architecture v1

> 책의 구조, 감정, 인사이트 유형을 해석해 그에 맞는 시각 문법과 연출 리듬을 동적으로 선택하고, 필요할 경우 새로운 씬 문법까지 확장 가능한 에디토리얼 모션 그래픽 시스템

---

## 1. 목표와 비전

### 최종 비전

책의 성격에 따라 장면 문법을 스스로 확장할 수 있는 **Scene Invention Platform**.

### 현재 제품 목표

책의 구조와 인사이트에 맞춰 씬, beat, direction이 동적으로 달라지는 **Editorial Motion System**.

### Maturity Levels

**Level 1 — Smart Template System**
책 fingerprint에 따라 preset 선택, scene 조합, direction profile이 달라진다.
그러나 scene grammar 자체는 아직 preset/starter-pack 범위 안에 머문다.
새 scene invention이나 의미 구조 기반 beat synthesis는 없다.

**Level 2 — Editorial Motion System (현재 제품 목표)**
Interpretation, direction, composition, beat semantics가 분리된 구조 위에서,
동일한 정보 의도도 책의 구조·톤·인사이트 성격에 따라 다른 scene family와 연출 리듬으로 구현된다.

**Level 3 — Scene Invention Platform (최종 비전)**
기존 라이브러리로 커버 안 되는 책이 오면 새 scene grammar를 제안하고,
검증 통과 시 라이브러리에 승격한다.
만들수록 점점 강해지는 시스템.

### 검증 기준 (6-Question Framework)

모든 아키텍처 결정은 아래 6개 질문으로 검증한다.

1. 이 로직은 책마다 다른 결과를 만드는가?
2. 이 차이가 단순 텍스트 교체가 아니라 시각 문법 차이로 이어지는가?
3. beat가 씬 타입 고정이 아니라 의미 구조를 반영하는가?
4. 기존 라이브러리로 안 되면 확장 경로가 존재하는가?
5. 확장된 결과가 브랜드 일관성 안에 들어오는가?
6. 이번 결과가 다음 책에 축적 가능한 자산이 되는가?

5~6개 만족 시 전문가급 방향. 4개 이하면 아직 템플릿 시스템.

---

## 2. 현재 파이프라인의 구조적 한계

### 한계 1: Scene intent와 render implementation이 결합되어 있다

현재는 keyInsight, framework, compareContrast 같은 scene type이 곧바로 특정 React 컴포넌트로 연결된다. 그 결과 scene intent, layout, element grammar, choreography, beat profile을 독립적으로 바꿀 수 없다. 같은 keyInsight라도 책의 인사이트 성격(분석적/감정적/실험적)에 관계없이 거의 같은 시각 결과로 수렴한다.

### 한계 2: Direction 개념 부재

씬의 "무엇을 보여줄까"만 있고, "어떤 태도로 보여줄까"가 없다. motion preset(gentle/snappy/heavy)이 있지만, 이건 물리 파라미터일 뿐 연출 의도가 아니다. 같은 framework 씬이 심리학 책에서도, 경영 책에서도, 철학 책에서도 동일한 에너지로 렌더된다.

### 한계 3: Beat가 씬 타입에 종속

keyInsight → 항상 [headline, support, evidence]. framework → 항상 [headline, reveal×N]. 나레이션의 의미 구조나 감정 곡선과 무관하게 기계적 분할. "evidence가 핵심인 keyInsight"와 "감정이 핵심인 keyInsight"의 beat가 동일하다.

### 한계 4: Synthesis가 사실상 무력

GapDetector가 gap을 감지해도, SceneSynthesizer가 7개 레이아웃 중 하나로 매핑. 실측: 모든 synthesized blueprint가 center-focus fallback으로 수렴. uniqueElements(FEED 다이어그램, 방사형 차트 등)가 메타데이터로만 존재하고 시각화에 반영 안 됨.

### 한계 5: 축적 메커니즘 없음

책 한 권 처리할 때 만든 결정이 다음 책에 전달되지 않음. 잘 작동한 scene composition이 라이브러리에 승격되지 않음. scene-catalog.json이 읽기 전용이라 시스템 진화가 코드 배포에 종속.

**결과:** 현재 시스템은 책의 텍스트 내용은 바꿀 수 있지만, 장면 문법과 연출 태도는 거의 바꾸지 못한다. 그 결과 10개 책 중 8개(80%)가 사실상 유사한 scene order, beat pattern, motion attitude로 렌더된다.

---

## 3. 최종 5-Layer 아키텍처

이 5-layer 구조의 공통 계약은 SceneSpec이며, preset/composed/invented 모두 이 계약을 따른다.

```
┌─────────────────────────────────────────────────────────┐
│  L5. Interpretation Layer                               │
│  책 해석 → scene intent + direction 결정                 │
│  L5 = 무엇을 왜 이렇게 보여줄지 결정                      │
├─────────────────────────────────────────────────────────┤
│  L4. Direction Layer                                    │
│  "어떤 태도로 보여줄 것인가"                               │
│  L4 = 그것을 어떤 리듬과 태도로 연출할지 결정              │
├─────────────────────────────────────────────────────────┤
│  L3. Scene Composition Layer                            │
│  layout × elements × choreography 조합                   │
│  기존 preset = 이 레이어의 pre-composed 인스턴스           │
├─────────────────────────────────────────────────────────┤
│  L2. Primitive Engine                                   │
│  렌더링 원자 단위                                        │
│  씬보다 먼저 primitives가 있어야 composition이 강해진다     │
├─────────────────────────────────────────────────────────┤
│  L1. Brand Constraint Layer                             │
│  절대 무너지면 안 되는 가드레일                             │
│  사전 제약(preflight) + 사후 검증(validation) 둘 다 수행    │
└─────────────────────────────────────────────────────────┘
```

### L1. Brand Constraint Layer — "하면 안 되는 것"을 규정

모든 상위 레이어의 출력이 브랜드 범위 안에 머무르도록 제약한다.
생성 이전의 사전 제약(preflight constraint)과 렌더 이후의 사후 검증(post-render validation)을 모두 수행한다.

규정하는 것:

- typography system (Pretendard sans, serif는 quote/chapter accent만)
- color discipline (토큰 기반, accent 씬당 2개 이하)
- spacing rhythm (토큰 기반 간격)
- motion character (preset 기반, scale ≤1.15, Y offset ≤48px)
- density rules (요소 밀도 상한)
- subtitle philosophy (28자/줄, 2줄 이하)
- camera behavior limits (no full-screen shake, no particle effects)

금지 규칙(deny list)뿐 아니라 허용 가능한 선택지의 등록소(allow list)도 포함한다:

- allowed transitions (cut, crossfade, directional-wipe 등)
- allowed motion amplitudes (preset별 허용 범위)
- allowed subtitle treatments (standard, minimal)
- allowed accent combinations (씬당 최대 2개)

기존 design-tokens.json, motion-presets.json이 이 레이어의 구현체. 새로 만드는 게 아니라 역할을 명시하는 것.

### L2. Primitive Engine — 씬보다 먼저 존재하는 원자 부품

모든 씬이 조립에 사용하는 시각 요소의 등록소.

현재 존재: TextBlock, LabelChip, DividerLine, ArchitecturalReveal, StaggerContainer

확장 필요:

- DiagramNode + Edge (노드 기반 시각화)
- TimelineDot + TimelineTrack (시간축)
- ComparisonColumn (좌우 비교)
- RadialItem + RadialConnector (방사형)
- FunnelStep, MatrixCell (구조 시각화)
- EmphasisPulse, GlowHighlight (강조 효과)

핵심 원칙: primitive는 씬을 모른다. 자기가 어떤 씬에서 쓰이는지 알 필요 없음. props를 받아서 렌더할 뿐.

### L3. Scene Composition Layer — 장면 조립

SceneSpec을 받아서 렌더 가능한 Composition을 생성한다.

3가지 조립 경로:

1. **Preset path** — 기존 9개 프리셋을 PresetAdapter를 통해 사용. 가장 빠르고 안정적.
2. **Composed path** — layout + elements + choreography를 동적 조합. Preset보다 자유롭지만 검증된 조합만 허용.
3. **Invented path** — gap에서 생성된 blueprint. 실험적 경로이며, 검증을 통과한 invented blueprint만 composed recipe 또는 preset asset으로 승격될 수 있다.

layout, elements, choreography 모두 1등 시민. 특히 choreography(reveal order, anchor movement, emphasis rhythm, relation animation)가 전문가급 느낌의 핵심.

### L4. Direction Layer — "어떤 태도로"

같은 구조의 장면도 책마다 다른 연출 태도로 보이게 만드는 레이어.

Direction Profile Taxonomy:

| Profile       | 특성                                                     | 어울리는 장르    |
| ------------- | -------------------------------------------------------- | ---------------- |
| analytical    | 분석, 분해, 점진 공개, 낮은 에너지                       | 과학, 심리학     |
| systematic    | 체계, 구조 정렬, 프레임 제시, 중간 에너지                | 경영, 전략       |
| contemplative | 느린 reveal, 긴 hold, 여백                               | 철학, 에세이     |
| persuasive    | 대비 강조, 빠른 전환, 높은 에너지                        | 자기계발, 마케팅 |
| urgent        | 짧은 hold, 강한 emphasis, 압축 (**주로 local override**) | 위기/변화 씬     |
| inspirational | 점진적 상승, 따뜻한 톤, 여운                             | 동기부여, 전기   |
| investigative | 단서 공개, 서스펜스, 점진 reveal                         | 논픽션, 탐사     |

urgent는 global base profile보다는 local override로 더 자주 사용된다.

영향 범위:

- 영상 전체: global direction (BookFingerprint에서 결정)
- 씬 단위: local direction override (감정 곡선의 peak/valley에서 변주)

### L5. Interpretation Layer — 책 → 영상 문법 번역

BookFingerprint를 읽고 "이 책은 어떤 scene family와 direction으로 구성해야 하는가"를 결정한다.

입력: BookFingerprint, VideoNarrativePlan

출력: SceneSpec[], Global DirectionProfile, GapCandidate[]

Scene Family Taxonomy:

| Family                | 용도                                            | 기존 매핑                 |
| --------------------- | ----------------------------------------------- | ------------------------- |
| opening-hook          | 시청자 주의 확보                                | highlight                 |
| concept-introduction  | 핵심 개념 첫 등장, mental anchor 생성           | keyInsight                |
| mechanism-explanation | 원인-결과, 작동 원리, causal loop               | framework, data           |
| system-model          | 분류체계, 프레임워크, 모델, 구조도              | framework                 |
| tension-comparison    | 대비, 갈등, trade-off                           | compareContrast           |
| progression-journey   | 단계적 변화, 과정, 여정                         | application, timeline     |
| transformation-shift  | before/after 변화                               | compareContrast           |
| evidence-stack        | 이미 제시된 주장을 근거/사례/데이터로 누적 지지 | keyInsight + evidenceCard |
| reflective-anchor     | 인용, 성찰, 감정 고정점                         | quote                     |
| structural-bridge     | 챕터 전환                                       | chapterDivider            |
| closing-synthesis     | 요약 + CTA                                      | closing                   |

하나의 SceneFamily는 여러 LayoutType으로 구현될 수 있으며, 특정 LayoutType은 여러 SceneFamily에서 재사용될 수 있다. Family가 hidden preset처럼 굳어지지 않도록 이 느슨한 관계를 유지한다.

concept-introduction vs evidence-stack 경계:

- concept-introduction = 핵심 개념을 처음 제시하고 관객의 mental anchor를 만드는 장면
- evidence-stack = 이미 제시된 주장/개념을 근거, 사례, 실험, 데이터로 누적 지지하는 장면

mechanism-explanation vs system-model 경계:

- mechanism-explanation = 원인-결과, 작동 원리, causal loop
- system-model = 분류체계, 프레임워크, 모델, 구조도

Interpretation은 고정 규칙만으로 결정하지 않고, rule-based bias와 weighted scoring을 함께 사용한다. 결정적 규칙(deterministic rules), 가중 점수(weighted scoring), 오버라이드 휴리스틱(override heuristics)이 혼합된다.

Interpretation Rules (장르 → scene family 가중치):

```
자기계발/실행형 → progression-journey↑, evidence-stack↑
심리학          → mechanism-explanation↑, tension-comparison↑
경영/비즈니스    → tension-comparison↑, system-model↑
철학            → reflective-anchor↑, concept-introduction↑
과학            → mechanism-explanation↑, progression-journey↑
```

### 레이어 간 데이터 흐름

```
BookFingerprint
    │
    ▼
L5 Interpretation ──→ SceneSpec[] + DirectionProfile + GapCandidates
    │
    ▼
L4 Direction ──→ 각 SceneSpec에 timing/energy/emphasis 파라미터 주입
    │
    ▼
L3 Composition ──→ SceneSpec → preset|composed|invented 경로 선택 → 렌더 트리
    │
    ▼
L2 Primitives ──→ 실제 React 컴포넌트 인스턴스 생성
    │
    ▼
L1 Brand ──→ 모든 출력을 제약 검증 (preflight + post-render)
```

---

## 4. 핵심 타입 계약

### SceneSpec — 씬의 단일 계약

```typescript
interface SceneSpec {
  // Identity
  id: string;
  family: SceneFamily;
  intent: string; // 한 문장 의도 선언: "이 씬이 무엇을 시각적으로 달성해야 하는지"

  // Composition
  layout: LayoutType;
  elements: ElementSpec[];
  choreography: ChoreographyType;

  // Direction
  direction: DirectionProfile;
  directionOverrides?: Partial<DirectionParams>;

  // Beat
  beatProfile: BeatProfile;

  // Duration
  durationStrategy?: {
    mode: "tts-driven" | "beat-driven" | "hybrid" | "fixed";
    minFrames?: number;
    maxFrames?: number;
  };

  // Transition
  transitionIn?: TransitionSpec;
  transitionOut?: TransitionSpec;

  // Source & Confidence
  source: CompositionPath; // "preset" | "composed" | "invented"
  confidence: number;
  fallbackPreset?: CoreSceneType; // rendered failure 또는 brand constraint violation 시 안전망

  // Content
  narrationText: string;
  content: Record<string, unknown>; // 초기에는 유연한 레코드, 장기적으로 family별 schema normalization 대상

  // Traceability
  interpretationMeta?: {
    derivedFrom: string[]; // ["genre:psychology", "structure:framework", "uniqueElement:causal loop"]
    whyThisFamily?: string;
    whyThisDirection?: string;
  };

  // Brand validation
  constraintHints?: {
    maxDensity?: number;
    accentBudget?: number;
    subtitleMode?: "standard" | "minimal";
  };
  brandValidation?: {
    status: "pending" | "passed" | "failed";
    violations?: string[];
  };
}
```

### SceneFamily

```typescript
type SceneFamily =
  | "opening-hook"
  | "concept-introduction"
  | "mechanism-explanation"
  | "system-model"
  | "tension-comparison"
  | "progression-journey"
  | "transformation-shift"
  | "evidence-stack"
  | "reflective-anchor"
  | "structural-bridge"
  | "closing-synthesis";
```

### DirectionProfile & DirectionParams

```typescript
type DirectionProfileName =
  | "analytical"
  | "systematic"
  | "contemplative"
  | "persuasive"
  | "urgent" // 주로 local override
  | "inspirational"
  | "investigative";

interface DirectionParams {
  pacing: number; // 0(느림) ~ 1(빠름)
  energy: number; // 0(차분) ~ 1(격렬)
  emphasisDensity: number; // 0(절제) ~ 1(밀집)
  holdRatio: number; // beat 내 정지 비율
  revealPattern: "sequential" | "parallel" | "layered" | "suspense";
  transitionTension: number; // 0(부드러움) ~ 1(급격함)
  subtitleCadence: "steady" | "syncopated" | "dramatic-pause";
}

// DirectionParams는 렌더러에 직접 전달되는 raw values가 아니라,
// motion/timing/subtitle resolvers의 입력 파라미터다.

interface DirectionProfile {
  name: DirectionProfileName;
  base: DirectionParams;
}
```

프로파일 → 파라미터 기본값:

| Profile       | pacing | energy | emphasisDensity | holdRatio | revealPattern | transitionTension |
| ------------- | ------ | ------ | --------------- | --------- | ------------- | ----------------- |
| analytical    | 0.3    | 0.2    | 0.4             | 0.3       | sequential    | 0.2               |
| systematic    | 0.4    | 0.3    | 0.5             | 0.25      | parallel      | 0.3               |
| contemplative | 0.2    | 0.15   | 0.2             | 0.5       | layered       | 0.15              |
| persuasive    | 0.7    | 0.7    | 0.7             | 0.15      | sequential    | 0.6               |
| urgent        | 0.85   | 0.85   | 0.8             | 0.1       | sequential    | 0.8               |
| inspirational | 0.4    | 0.5    | 0.4             | 0.35      | layered       | 0.3               |
| investigative | 0.35   | 0.4    | 0.5             | 0.3       | suspense      | 0.5               |

### BeatProfile & BeatSegment

```typescript
interface BeatProfile {
  segments: BeatSegment[];
  timingIntent: "even" | "front-loaded" | "back-loaded" | "climactic";
  emphasisStrategy: "single-peak" | "distributed" | "escalating";
}

// BeatProfile은 의미 구조를 표현하는 상위 계획(semantic plan)이며,
// 실제 startRatio/endRatio는 direction과 scene duration을 반영하는
// compilation 단계에서 확정된다.

interface BeatSegment {
  id: string;
  role: BeatRole;
  narrationText: string;

  // 의미 분석
  semanticWeight: number;
  emotionalIntensity: number;

  // timing (compiled from direction + semantics)
  startRatio: number;
  endRatio: number;

  // activation
  activates: string[];
  emphasisTargets: string[];
  transition: "enter" | "replace" | "emphasis" | "hold" | "exit";
}

type BeatRole =
  | "anchor"
  | "evidence"
  | "reveal"
  | "contrast"
  | "escalation"
  | "reflection"
  | "bridge"
  | (string & {});
```

Beat 생성 원칙:

```
기존: sceneType → 고정 beat 패턴
신규: narration semantics + direction + emphasis intent → 동적 beat
```

같은 evidence-stack family라도:

- direction이 analytical이면: [anchor → evidence → evidence → recap] (고른 분포)
- direction이 persuasive이면: [anchor → escalation → evidence → anchor] (반복 강조)
- direction이 investigative이면: [bridge → evidence → evidence → anchor] (반전 구조)

### 보조 타입

```typescript
type CompositionPath = "preset" | "composed" | "invented";

interface ElementSpec {
  id: string;
  primitive: PrimitiveType;
  props: Record<string, unknown>;
  layer: number;
  beatActivationKey: string;
}

interface TransitionSpec {
  type: "cut" | "crossfade" | "directional-wipe" | "zoom-bridge" | "hold-fade";
  duration: number;
  tension: number;
  direction?: "left" | "right" | "up" | "down";
}

interface GapCandidate {
  sceneId: string;
  family: SceneFamily;
  unmetNeed: string;
  requiredVisualGrammar: string[];
  confidence: number;
}

type LayoutType =
  // 현재 구현됨
  | "center-focus"
  | "split-two"
  | "radial"
  | "timeline-h"
  | "grid-n"
  // Phase 2에서 추가
  | "timeline-v"
  | "pyramid"
  | "flowchart"
  | "matrix-2x2"
  | "funnel"
  | "concentric"
  | "stacked-layers"
  // invented 확장 (registry에 등록되기 전까지 실험적 식별자)
  | (string & {});
```

---

## 5. Phase 0~4 실행 계획

### 핵심 원칙

- **구현은 점진적으로, 인터페이스는 처음부터 최종형으로.**
- Phase 2는 composition capability를 확장하는 단계이고, Phase 3는 그 확장된 capability 중 무엇을 선택할지에 대한 interpretation intelligence를 강화하는 단계다.

### Phase 0: Contract First + Direction Bootstrap

**목표:** 기존 프리셋 생산 경로를 유지한 채, 모든 씬이 SceneSpec과 DirectionProfile을 통과하도록 만든다.

**산출물:**

- SceneSpec 타입 정의 (interpretationMeta, constraintHints 포함)
- DirectionProfile 타입 + 7개 프로파일 기본값 테이블
- SceneFamily 타입 (11개 family)
- PresetAdapter — 기존 9개 preset을 SceneSpec으로 변환하는 어댑터
- Interpretation Layer 초안 — heuristic bootstrap 수준으로 제한:
  - genre → default direction
  - structure → family bias
  - preset → SceneSpec 변환
  - 본격적인 scoring/selection intelligence는 Phase 3에서 다룸
- content-composer 스킬 업데이트 — SceneSpec 기반으로 content JSON 생성

**체감 변화:** "같은 구조인데 분위기가 다르다"

**완료 조건:** 모든 기존 preset scene이 SceneSpec으로 변환되고, 최소 2개 이상의 direction profile 차이를 실제 렌더 결과로 확인할 수 있어야 한다.

**성공 지표:** 동일 preset이라도 direction 차이로 시각적 변주가 재현되는가

**검증 기준:** 6-question #1, #5 통과

### Phase 1: Beat Semantics 분리

**목표:** beat 생성을 씬 타입 종속에서 의미 구조 기반으로 전환

**산출물:**

- BeatSemanticAnalyzer — narrationText → BeatSegment[] (semantic plan)
  - 한국어 문장 경계, 접속사, 전환어를 분석해 의미 단위 분할
  - 각 segment에 semanticWeight, emotionalIntensity 부여
- BeatProfileResolver — semantic plan + DirectionProfile → timingIntent, emphasisStrategy 결정
- BeatTimelineCompiler — semantic plan + direction params + scene duration → 최종 startRatio/endRatio 확정
- BeatRole 확장 — anchor, evidence, contrast, reflection, escalation, bridge + (string & {})
- BeatDebugView — beat compilation 결과를 확인할 수 있는 디버그 출력 (semantic segmentation, role 분류, weight, compiled ratio)

**체감 변화:** "같은 내용인데 호흡이 다르다"

**성공 지표:** beat pattern이 narration semantics에 따라 가시적으로 달라지는가

**검증 기준:** #3 통과

### Phase 2: Composition Engine 확장

**목표:** preset 중심에서 동적 조합 중심으로 이동 (capability expansion)

**산출물:**

- Layout registry 확장 — 현재 7개 → 12개+ (timeline-v, pyramid, flowchart, matrix-2x2, funnel, concentric, stacked-layers)
- CompositionFactory — SceneSpec → layout × elements × choreography 동적 조합
- Choreography variants 확장 — 현재 4개 → 8개+ (path-trace, split-reveal, stagger-clockwise, suspend-reveal, layer-stack, anchor-shift 등)
- Primitive 확장 — DiagramNode, ComparisonColumn, FunnelStep 등
- CompositionPath 라우터 — source에 따라 preset/composed/invented 경로 분기
- uniqueElements 정규화 — BookFingerprint.uniqueElements를 렌더 가능한 composition hints로 정규화하여 layout/primitive 선택에 반영 (required family, preferred layout, needed primitives, preferred choreography)

**체감 변화:** "장면 문법 자체가 다르다"

**성공 지표:** preset 없이 composed path로 안정 렌더되는 scene 비율이 증가하는가

**검증 기준:** #2, #4 통과. Level 2 시작.

### Phase 3: Interpretation Engine 강화

**목표:** BookFingerprint가 scene grammar를 실질적으로 결정 (decision intelligence)

**산출물:**

- InterpretationRules — 장르 × structure × contentMode × emotionalTone → scene family 가중치 매트릭스
- ScenePlanGenerator — NarrativePlan의 segments를 SceneSpec[]으로 변환. family/direction/layout을 동적 결정
- GapClassifier — 기존 라이브러리로 커버 불가능한 씬을 정밀 분류 (unmetNeed, requiredVisualGrammar)
- Scoring engine 고도화 — confidence 계산에 direction 적합성, beat 복잡도, primitive 가용성 반영
- InterpretationTrace — 왜 이 family를 골랐는지, 왜 이 direction이 높게 나왔는지, 왜 이 layout이 선택되었는지 추적

**체감 변화:** "책을 넣으면 알아서 적합한 영상 문법을 선택한다"

**성공 지표:** genre/structure 변화에 따라 family/layout 선택이 설명 가능하게 달라지는가

**검증 기준:** #1 + #2 + #3 완전 통과. Level 2 완성.

### Phase 4: Scene Invention Loop

**목표:** gap → 생성 → 검증 → 승격. 만들수록 강해지는 시스템.

**산출물:**

- InventionPromptContract — gap을 받아 Claude Code에 blueprint 생성을 요청하는 표준 프롬프트
- InventionValidator — 생성된 blueprint가 L1 brand constraint를 통과하는지 검증
- PromotionWorkflow — invented → validated → promoted (composed recipe 또는 preset asset)
- SceneRegistry — scene-catalog.json을 대체하는 동적 레지스트리. 코드 배포 없이 확장 가능

**체감 변화:** "시스템이 진화한다"

**성공 지표:** invented scene의 validated→promoted 전환률이 관리 가능한가

**검증 기준:** #4, #6 완전 통과. Level 3 진입.

### Phase 간 의존성

```
Phase 0 ──→ Phase 1 ──→ Phase 2 ──→ Phase 3 ──→ Phase 4
(계약+방향)  (beat분리)   (조합엔진)  (해석엔진)  (invention)
  │                                      │
  └──── 기존 preset 계속 동작 ────────────┘
```

Phase 0은 모든 것의 기초. Phase 1~3는 순서대로 가되 각각 독립 배포 가능. Phase 4는 Phase 2+3 완료 후.

---

## 6. 레거시 프리셋 호환 전략

### 원칙

기존 9개 프리셋(cover, chapterDivider, keyInsight, compareContrast, quote, framework, application, data, closing)은 **삭제하지 않는다.** 역할을 "정답"에서 "starter pack"으로 전환한다.

### PresetAdapter

기존 프리셋을 SceneSpec으로 변환하는 어댑터:

```
기존 scene JSON {type: "keyInsight", content: {...}}
    │
    ▼
PresetAdapter.toSceneSpec()
    │
    ▼
SceneSpec {
  family: "concept-introduction",
  layout: "center-focus",
  direction: resolvedFromFingerprint,
  source: "preset",
  ...
}
```

### 호환 보장

- Phase 0~1: 모든 씬이 preset path를 통해 렌더. composed/invented path는 아직 없거나 실험적.
- Phase 2: composed path가 열리지만, confidence < threshold이면 자동으로 preset fallback.
- Phase 3+: interpretation이 preset 대신 composed를 선택할 수 있지만, fallbackPreset이 항상 존재.

### 기존 content JSON 호환

기존 `content/books/*.json`의 `scenes[].type` 필드는 PresetAdapter가 SceneFamily로 매핑한다. 기존 JSON을 수정하지 않아도 새 파이프라인에서 동작한다.

---

## 7. Scene Invention 승격 정책

### 라이프사이클

```
invented (실험) → validated (검증 통과) → promoted (라이브러리 등록)
```

### 승격 기준

invented blueprint가 promoted recipe로 승격되려면 다음 5개 기준을 모두 충족해야 한다:

1. **안정성:** 동일 구조를 3회 이상 안정적으로 렌더. fallback 없이 통과.
2. **브랜드 적합성:** L1 brand constraint 위반이 0.
3. **시각적 구분:** 기존 라이브러리의 어떤 recipe와도 충분히 구분되는 시각 결과.
4. **재사용 가치:** 특정 책 1권에만 적용 가능한 것이 아니라, 유사 구조의 다른 책에도 적용 가능.
5. **추적 가능성:** interpretationMeta가 존재하여, 왜 이 recipe가 만들어졌는지 설명 가능.

### 오염 방지

- invented layout name은 registry에 등록되기 전까지 실험적 식별자로 취급한다.
- validated를 통과하지 못한 invented blueprint는 자동 만료 (30일 후 archive).
- promoted recipe는 버전 관리되며, 성능 저하 시 demote 가능.

### 축적 방향

반복 처리 과정에서 family별 reusable recipe, validated layout pattern, choreography variants가 점진적으로 축적된다. 이 축적이 시스템의 장기적 경쟁력이다.
