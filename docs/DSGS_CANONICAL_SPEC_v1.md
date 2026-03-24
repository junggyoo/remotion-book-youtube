# Dynamic Scene Generation System — Canonical Spec v1.0

**이 문서가 동적 씬 생성 시스템의 단일 기준이다.**
이전 문서(VCL_ARCHITECTURE.md, COMPARISON_AND_IMPROVED_ARCHITECTURE.md)를 대체한다.

---

## 0. 체크리스트 판정 로그

ChatGPT 수정 체크리스트 12개 항목에 대한 판정과 반영 내역.
이 섹션은 의사결정 추적용이며, 구현 시 참조할 필요 없다.

```
P0-1  Opening 규칙 충돌 제거           ✅ 채택 — 섹션 8 규칙 분리 완료
P0-2  narrativeArc 네이밍 충돌 제거     ✅ 채택 — NarrativeArcType + VideoNarrativePlan 분리
P0-3  MediaPlan을 SceneBlueprint에 편입  ✅ 채택 — 핵심 수정. mediaPlan 필드 추가
P0-4  HITL 체크포인트 명시              ✅ 채택 — 3개 승인 지점 + 자동/반자동 모드
P0-5  QA metric 수치화                 ✅ 채택 — SceneQualityMetrics + QUALITY_GATE 추가

P1-6  OpeningPackage 묶음 처리          ✅ 채택 — transitionBridge 포함한 패키지 구조
P1-7  confidence 임계값을 정책 객체로    ✅ 채택 — PlanningPolicy 인터페이스로 분리
P1-8  preset 폴더 core/fallback 분리    ✅ 채택 — 디렉토리 구조 반영
P1-9  Ephemeral/Promotable lifecycle    ✅ 채택 — SynthesizedBlueprint.lifecycle 추가

P2-10 FormatPolicy 분리                ✅ 채택 — longform/shorts 정책 객체
P2-11 Asset Research 단계 추가          ✅ 채택 — 6.5단계 assetPlanner 추가
P2-12 Claude Skill 구조 반영           ⚠️ 부분 채택 — 8개→6개로 축소 (과도한 분리 방지)
```

---

## 1. 시스템 목표

한국어 책 요약 YouTube 채널용 영상 자동화 시스템.
**"책의 구조를 해석해 필요한 씬을 생성하는 엔진"**이 핵심이다.

고정 씬 템플릿에서 고르는 것이 아니라,
기존 프리셋(70%)과 책 고유의 동적 씬(30%)을 조합하여
매 영상이 그 책만의 고유한 시각 표현을 갖도록 한다.

---

## 2. 파이프라인 (10단계)

```
입력: "미라클 모닝으로 8분짜리 영상 만들어줘"

 1. Book Analyzer          책 → BookFingerprint
 2. Narrative Planner      BookFingerprint → VideoNarrativePlan
 3. Opening Composer       BookFingerprint → OpeningPackage
 4. Scene Planner          VideoNarrativePlan → PresetScenes + SceneGaps
 5. Gap Detector           PresetScenes 분석 → SceneGap[] 확정
 6. Scene Synthesizer      SceneGap → SceneBlueprint[] (VCL engine)
 6.5 Asset Planner         SceneBlueprint[].mediaPlan.assetPlan → 에셋 수급
 7. Blueprint Validator    전체 blueprint → 검증 + fallback 확정
 8. Blueprint Renderer     ValidatedBlueprint[] → Remotion React → .mp4

 ── 영상 완성 후 ──

 9. Scene Promoter         합성 씬 재사용 가치 평가 → 라이브러리 승격

 HITL-A: 3단계 후 — Opening 승인
 HITL-B: 6단계 후 — Signature Scene 승인
 HITL-C: 8단계 후 — Final QA 승인
```

---

## 3. 핵심 타입 정의

### 3-1. BookFingerprint

```typescript
interface BookFingerprint {
  // 기본 정보
  genre: GenreKey
  subGenre?: string

  // 구조 분석
  structure: 'framework' | 'narrative' | 'argument' | 'collection'
  coreFramework?: string                    // "SAVERS 6단계"
  keyConceptCount: number

  // 감정/톤
  emotionalTone: EmotionalTone[]            // ["uplifting", "disciplined"]
  narrativeArcType: NarrativeArcType        // ← P0-2 수정: 네이밍 분리
  urgencyLevel: 'low' | 'medium' | 'high'

  // 시각 메타포
  visualMotifs: string[]                    // ["sunrise", "wheel", "loop"]
  spatialMetaphors: string[]                // ["순환", "층위", "분기"]

  // Hook 분석
  hookStrategy: HookStrategy
  entryAngle: string                        // 한 문장 요약

  // 고유성 판단
  uniqueElements: string[]                  // 기존 씬으로 표현 불가능한 후보
  contentMode: 'actionable' | 'conceptual' | 'narrative' | 'mixed'
}

type NarrativeArcType =                     // ← P0-2 수정: 이름 변경
  | 'transformation'
  | 'discovery'
  | 'warning'
  | 'instruction'

type HookStrategy =
  | 'pain' | 'contrarian' | 'transformation'
  | 'identity' | 'question' | 'system' | 'urgency'
```

### 3-2. VideoNarrativePlan (← P0-2 수정: NarrativeArc에서 이름 변경)

```typescript
interface VideoNarrativePlan {
  totalDurationSec: number
  segments: NarrativeSegment[]
  emotionalCurve: EmotionalPoint[]
}

interface NarrativeSegment {
  role: SegmentRole
  durationRatio: number                     // 합계 = 1.0
  intent: string
  requiredDelivery: string[]
}

type SegmentRole =
  | 'opening'      // 5~8%
  | 'setup'        // 10~15%
  | 'core'         // 50~60%
  | 'climax'       // 10~15%
  | 'resolution'   // 10~15%
  | 'closing'      // 3~5%
```

### 3-3. SceneBlueprint (← P0-3 수정: mediaPlan 편입)

```typescript
interface SceneBlueprint {
  // 메타
  id: string
  intent: string
  origin: 'preset' | 'synthesized'

  // 시각 구성 (VCL)
  layout: LayoutType
  layoutConfig?: Record<string, unknown>
  elements: VCLElement[]
  choreography: ChoreographyType
  motionPreset: MotionPresetKey

  // 타이밍
  format: FormatKey
  theme: Theme
  from: number
  durationFrames: number

  // ← P0-3 핵심 추가: 미디어 계획
  mediaPlan: MediaPlan
}

interface MediaPlan {
  narrationText: string

  captionPlan: {
    mode: 'sentence-by-sentence'            // 한 문장씩 표시
    maxCharsPerLine: 28
    maxLines: 2
    leadFrames: 3                           // VO 시작 3f 전 자막 노출
    trailFrames: 6                          // VO 종료 후 6f 유지
    highlightKeywords?: string[]
    transitionStyle: 'fade-slide' | 'hard-cut'
  }

  audioPlan: {
    ttsEngine: TTSEngineKey
    voiceKey: string
    speed: number                           // 0.7 ~ 1.4
    pitch: string                           // "+0Hz"
    pauses?: Array<{ afterSentence: number; ms: number }>
  }

  assetPlan: {
    required: AssetRequirement[]
    searchQueries?: string[]                // 자동 검색용 키워드
    fallbackMode: 'text-only' | 'shape-placeholder' | 'generic-library'
  }
}

type TTSEngineKey =
  | 'edge-tts' | 'qwen3-tts' | 'chatterbox'
  | 'fish-audio-s2' | 'elevenlabs'

interface AssetRequirement {
  role: 'book-cover' | 'author-photo' | 'concept-image' | 'icon' | 'texture' | 'diagram'
  description: string
  optional: boolean
}
```

### 3-4. SynthesizedBlueprint (← P1-9 수정: lifecycle 추가)

```typescript
interface SynthesizedBlueprint extends SceneBlueprint {
  origin: 'synthesized'
  lifecycle: 'ephemeral' | 'candidate-promotable'   // ← P1-9
  fallbackPreset: SceneType
  fallbackContent: SceneContent
}
```

### 3-5. OpeningPackage (← P1-6 수정: 묶음 처리)

```typescript
interface OpeningPackage {
  hook: SceneBlueprint
  intro: SceneBlueprint

  // 둘의 연결
  transitionBridge: {
    transitionToBody: string                // 본론 진입 방식 설명
    carryKeyword?: string                   // Hook에서 Intro로 이어지는 키워드
    audioCrossfadeMs?: number               // 오디오 크로스페이드
  }

  hookStrategy: HookStrategy
  introFraming: string                      // 이 책을 한 문장으로 재프레이밍
  packageDurationSec: number                // 20~35초
}
```

### 3-6. PlanningPolicy (← P1-7 수정: 튜닝 가능한 정책)

```typescript
interface PlanningPolicy {
  presetConfidenceThreshold: number         // 기본 0.7. 이 이상이면 프리셋 사용
  minSignatureScenes: number                // 기본 2. 최소 합성 씬 수
  maxSynthesizedScenes: number              // 기본 5. 최대 합성 씬 수
  openingMustBeDynamic: boolean             // 기본 true
  formatPolicy: FormatPolicy                // ← P2-10
}

interface FormatPolicy {                    // ← P2-10 수정
  format: 'longform' | 'shorts'
  maxElementsPerScene: number               // longform: 12, shorts: 6
  captionDensity: 'low' | 'medium' | 'high'
  openingDurationSecRange: [number, number] // longform: [20, 35], shorts: [5, 10]
  sceneCountRange: [number, number]         // longform: [8, 14], shorts: [1, 3]
}
```

### 3-7. SceneQualityMetrics (← P0-5 수정: 수치화)

```typescript
interface SceneQualityMetrics {
  readabilityScore: number                  // 0~1. 텍스트 읽기 시간 충분한가
  brandConsistencyScore: number             // 0~1. 토큰/프리셋 범위 내인가
  visualComplexityScore: number             // 0~1. 요소가 과하지 않은가 (높을수록 단순)
  renderStability: number                   // 0~1. 렌더 성공률
  shortsAdaptability: number                // 0~1. shorts 변환 가능한가
  openingGenericness?: number               // 0~1. Opening 전용. 낮을수록 좋음
}

const QUALITY_GATE = {
  // 통과 기준 (모든 씬)
  readabilityScore: 0.8,
  brandConsistencyScore: 0.85,
  renderStability: 0.95,

  // Opening 전용 추가 기준
  openingGenericnessMax: 0.35,              // 이 이상이면 "너무 뻔한 Opening"으로 재생성

  // 승격 기준 (Scene Promoter에서 사용)
  promotionMinReusability: 0.6,
  promotionMinAbstractability: 0.7,
  promotionMinQuality: 0.8,
  promotionMinStability: 0.95,
} as const
```

**측정 방법:**

```
readabilityScore:
  모든 텍스트 요소에 대해 (표시 시간 / 필요 읽기 시간) 계산.
  한국어 기준 초당 5~7자. 모든 요소가 1.0 이상이면 score = 1.0.

brandConsistencyScore:
  하드코딩 색상 0개, 토큰 외 폰트 0개, 프리셋 외 spring config 0개,
  accent 2개 이하, scale 1.06 이하 → 각 항목 통과 비율.

visualComplexityScore:
  elements 수 / maxElementsPerScene. 0.8 이하면 1.0, 초과 시 비례 감소.

renderStability:
  3회 테스트 렌더 성공률. 3/3 = 1.0, 2/3 = 0.67.

openingGenericness:
  Opening의 narrationText와 시각 구성이 장르 기본 프리셋과 얼마나 유사한지.
  TF-IDF 또는 cosine similarity 기반. 0.35 이하가 목표.
```

---

## 4. VCL (Visual Composition Language) 엔진

씬 합성의 기술 구현 계층. Scene Synthesizer(6단계)와 Blueprint Renderer(8단계)가 사용한다.

### 4-1. Vocabulary (시각 어휘 30+)

4개 카테고리, 각 primitive는 React 컴포넌트로 구현.

**텍스트 계열:** headline, body, caption, number-display, label, quote-text,
keyword-highlight(🆕), bullet-list(🆕), annotation(🆕)

**비주얼 계열:** image-frame, icon, shape(🆕), divider, signal-bar,
color-zone(🆕), gradient-bar(🆕)

**데이터 계열:** bar-chart, line-chart, pie-segment(🆕), progress-bar(🆕),
counter-animate, comparison-meter(🆕), percentage-ring(🆕)

**구조 계열(핵심 신규):** timeline-node, cycle-connector, hierarchy-node,
flow-step, card-stack, orbit-item, matrix-cell, before-after-pair,
path-branch, layer-stack

### 4-2. Grammar (배치 문법 14종)

각 layout은 `(elements, canvas, format) → PositionedElement[]` 함수.

center-focus, split-two, grid-n, timeline-h, timeline-v, radial,
pyramid, flowchart, stacked-layers, orbit, matrix-2x2, scattered-cards,
left-anchor, comparison-bar

Layout은 **중첩 가능** (split-two 안에 timeline-v 등).

### 4-3. Prosody (모션 운율 10종)

Choreography Pattern(순서/방식) × Motion Preset(물리 특성) = 최종 모션.

reveal-sequence, stagger-clockwise, count-up, path-trace, split-reveal,
stack-build, zoom-focus, wave-fill, morph-transition, pulse-emphasis

Motion Preset 5종(기존 유지): gentle, smooth, snappy, heavy, dramatic

### 4-4. BlueprintRenderer

```typescript
// SceneBlueprint JSON → Remotion React 컴포넌트 트리
export const BlueprintRenderer: React.FC<{ blueprint: SceneBlueprint }> = ({ blueprint }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // 1. Layout Engine: 좌표 계산
  const positions = useLayoutEngine(blueprint.layout, blueprint.layoutConfig)
    .resolve(blueprint.elements, useSafeArea(blueprint.format))

  // 2. Choreography: 등장 타이밍 계산
  const timings = useChoreography(blueprint.choreography, blueprint.motionPreset)
    .plan(blueprint.elements, blueprint.durationFrames)

  // 3. primitive registry에서 컴포넌트 조회 → 조립
  return (
    <AbsoluteFill>
      {blueprint.elements.map((el, i) => (
        <MotionWrapper key={el.id} timing={timings[i]} preset={blueprint.motionPreset}>
          {React.createElement(primitiveRegistry[el.type], {
            ...el.props, style: positions[i], format: blueprint.format, theme: blueprint.theme
          })}
        </MotionWrapper>
      ))}
    </AbsoluteFill>
  )
}
```

### 4-5. 기존 9종 씬 호환

기존 씬 타입은 "프리셋 Blueprint"로 유지. content.json에서 공존 가능.

```json
{
  "scenes": [
    { "id": "cover-01", "type": "cover", "content": { ... } },
    { "id": "savers-wheel", "type": "custom", "blueprint": { ... }, "content": { ... } },
    { "id": "insight-02", "type": "keyInsight", "content": { ... } }
  ]
}
```

`type: "기존타입"` → presetBlueprints에서 자동 변환
`type: "custom"` + `blueprint` → 직접 BlueprintRenderer로 렌더

---

## 5. Opening 시스템

### 5-1. 7가지 Hook Strategy

| Strategy | 설명 | 적합 장르 | 패턴 |
|----------|------|-----------|------|
| pain | 시청자의 문제를 찌름 | psychology, selfHelp | 문제→공감→해결 약속 |
| contrarian | 통념을 뒤집음 | science, philosophy | 통념→반박→진짜 이유 |
| transformation | 변화 전후를 먼저 보여줌 | selfHelp, business | 결과→궁금증→방법 약속 |
| identity | 정체성에 연결 | selfHelp, psychology | 정체성 질문→연결→해답 |
| question | 강한 질문으로 시작 | philosophy, science | 질문→일반답→깊은 답 약속 |
| system | 원인이 구조라고 프레이밍 | selfHelp, business | 오해→시스템 관점→해결 |
| urgency | 지금 바꿔야 한다고 자극 | business, ai | 현재→위험→변화 약속 |

### 5-2. OpeningPackage 생성 규칙

Opening(Hook + Intro)은 독립 씬 2개가 아니라 **하나의 설계 단위**로 다룬다.
Hook이 만든 긴장을 Intro가 의미로 정리하고, transitionBridge로 본론에 진입.

```
나쁜 예 (고정형):
  Hook: "오늘 소개할 책은 미라클 모닝입니다."
  Intro: [표지 등장 + 저자 이름]

좋은 예 (동적):
  Hook: "아침 한 시간이 하루 전체를 바꾼다면, 당신의 인생도 바뀔 수 있을까요?"
  Intro: "미라클 모닝은 새벽 기상 자체보다, 하루를 주도적으로 설계하는 아침 시스템에 관한 책입니다."
  Bridge: "그 시스템의 핵심이 바로 SAVERS 6단계인데요—" → 본론
```

---

## 6. Gap Detection 시스템

### 6-1. confidence score 기반 판정

```typescript
// Scene Planner가 각 서사 구간에 대해 기존 프리셋을 매칭하고 confidence를 매긴다
interface PresetMatch {
  segment: SegmentRole
  sceneType: SceneType
  content: SceneContent
  confidence: number              // 0~1
}

// PlanningPolicy.presetConfidenceThreshold (기본 0.7) 미만이면 Gap
```

### 6-2. Gap 탐지 질문

```
1. 이 책의 핵심 프레임워크를 기존 grid-expand 씬으로 표현할 수 있는가?
2. 이 책의 핵심 메타포를 기존 씬으로 시각화할 수 있는가?
3. 이 책의 시간적 흐름/프로세스를 기존 씬이 표현할 수 있는가?
4. 이 책의 전/후 변화를 기존 split-compare로 충분히 보여줄 수 있는가?
5. 이 책의 감정적 클라이맥스를 기존 씬이 담을 수 있는가?
```

### 6-3. Gap → Synthesized Blueprint 변환

각 Gap에 대해 VCL 엔진이:
1. `requiredCapabilities` → 최적 layout 선택
2. `intent` + `fingerprint` → primitive 선정
3. `emotionalTone` → choreography 결정
4. mediaPlan 자동 생성 (narrationText, captionPlan, audioPlan, assetPlan)
5. fallbackPreset + fallbackContent 지정 (필수)
6. lifecycle: 'ephemeral' | 'candidate-promotable' 분류

---

## 7. HITL (Human-In-The-Loop) 체크포인트 (← P0-4)

### 운영 모드 2가지

**자동 모드(auto):** HITL 체크포인트를 건너뛰고 전 파이프라인 자동 실행.
테스트/대량 생산 시 사용. validator가 QUALITY_GATE를 통과하면 진행.

**승인 모드(review):** 3개 체크포인트에서 사람이 확인.
신규 장르, 중요 영상, 첫 제작 시 사용.

### Checkpoint A — Opening 승인 (3단계 후)

```
확인 항목:
- hookStrategy가 이 책에 적합한가?
- introFraming이 generic하지 않은가? (openingGenericness < 0.35)
- transitionBridge가 자연스러운가?
- narrationText가 시청자를 붙잡는가?
```

### Checkpoint B — Signature Scene 승인 (6단계 후)

```
확인 항목:
- must-priority gap의 blueprint가 책의 고유성을 잘 반영하는가?
- fallbackPreset이 적절한가? (fallback으로 갔을 때도 영상이 되는가?)
- 합성 씬 수가 적정한가? (2~5개)
- mediaPlan이 완전한가? (narration, caption, audio, asset 모두 있는가?)
```

### Checkpoint C — Final QA 승인 (8단계 후)

```
확인 항목:
- 자막 가독성 (readabilityScore >= 0.8)
- 오디오 싱크 (자막-TTS 간 gap < 200ms)
- 브랜드 일관성 (brandConsistencyScore >= 0.85)
- shorts 적응 가능 여부
- 전체 영상 길이 ±5% 이내
```

---

## 8. 규칙 체계 (← P0-1 수정: Opening 규칙 충돌 해소)

### 핵심 규칙 9개

```
[Scene Coverage Rule]
기존 씬으로 표현 불가능한 핵심 요소가 있으면 새 씬 blueprint를 생성한다.

[Scene Novelty Rule]
새 씬은 VCL의 vocabulary + grammar + prosody 범위 안에서 생성한다.
디자인 토큰, 모션 프리셋을 벗어나는 자유 생성은 허용하지 않는다.

[Scene Promotion Rule]
합성 씬의 재사용 가치가 QUALITY_GATE.promotion* 기준을 넘으면
프리셋 라이브러리로 승격한다.

[Signature Scene Rule]
각 영상에는 최소 2개의 합성 씬(= 그 영상만의 대표 씬)을 포함한다.
합성 씬이 0개인 영상은 제작하지 않는다.

[Opening Primary Rule]                           ← P0-1 수정
Opening(Hook + Intro)은 일반 생성 경로에서 반드시 동적 생성한다.
Opening preset은 일반 경로에서 사용할 수 없다.

[Opening Emergency Fallback Rule]                ← P0-1 수정
Opening 동적 생성이 blueprint 검증 또는 렌더 단계에서 실패한 경우에만,
장르별 fallback opening preset을 사용할 수 있다.
이 경우 validator가 openingPresetUsedReason 필드를 기록해야 한다.

[Fallback Guarantee Rule]
모든 합성 씬에는 대체 프리셋(fallbackPreset + fallbackContent)을 지정한다.
동적 생성이 실패해도 영상은 반드시 완성되어야 한다.

[Media Completeness Rule]                        ← P0-3 수정
모든 SceneBlueprint는 시각 blueprint뿐 아니라 mediaPlan을 포함해야 한다.
mediaPlan은 narrationText, captionPlan, audioPlan, assetPlan으로 구성된다.

[Human Review Rule]                              ← P0-4 수정
시스템은 Opening 승인, Signature Scene 승인, Final QA 승인의
세 체크포인트를 지원해야 한다. auto/review 모드 전환 가능.
```

### 비율 가이드라인

```
13씬 기준 (longform 8분):
  Opening: 2씬 (동적 필수)
  프리셋:  7~8씬 (55~60%)
  합성:    3~4씬 (25~30%)

합성 씬 수 범위: 최소 2, 최대 5
  0개 → 제작 거부 (차별화 실패)
  6개 이상 → 경고 (품질 불안정 위험)
```

---

## 9. 실패 시나리오 대응

```
┌──────────────────────────────┬──────────────────────────────────────┐
│ 실패                          │ 대응                                  │
├──────────────────────────────┼──────────────────────────────────────┤
│ Book Analyzer 실패            │ 장르 기본 fingerprint 사용             │
│ Narrative Planner 실패        │ 장르별 기본 서사 템플릿 사용            │
│ Opening 동적 생성 실패         │ 장르별 fallback opening preset 사용    │
│                              │ + openingPresetUsedReason 기록        │
│ Gap이 0개 (전부 프리셋 가능)    │ Signature Scene 최소 1개 강제 생성     │
│ 합성 씬 blueprint 검증 실패    │ fallbackPreset으로 자동 대체           │
│ 합성 씬 렌더 실패              │ fallbackPreset으로 자동 대체           │
│ 합성 씬 과다 (>5)             │ confidence 낮은 것부터 프리셋 전환     │
│ Asset 수급 실패               │ mediaPlan.assetPlan.fallbackMode 적용 │
│ TTS 실패                      │ silent + 자막만 모드                  │
│ 전체 파이프라인 실패            │ 100% 프리셋 모드로 fallback           │
└──────────────────────────────┴──────────────────────────────────────┘

원칙: 동적 생성이 실패해도, 영상은 반드시 나와야 한다.
최악의 경우에도 기존 프리셋 시스템만으로 영상이 완성되는 구조.
```

---

## 10. 디렉토리 구조

```
editorial-signal/
├── src/
│   ├── analyzer/
│   │   ├── bookAnalyzer.ts               ← 책 → BookFingerprint
│   │   ├── narrativePlanner.ts           ← BookFingerprint → VideoNarrativePlan
│   │   └── openingComposer.ts            ← BookFingerprint → OpeningPackage
│   │
│   ├── planner/
│   │   ├── scenePlanner.ts               ← VideoNarrativePlan → PresetScenes
│   │   ├── gapDetector.ts                ← PresetScenes → SceneGap[]
│   │   ├── sceneSynthesizer.ts           ← SceneGap → SynthesizedBlueprint (VCL)
│   │   ├── assetPlanner.ts              ← mediaPlan.assetPlan → 에셋 수급 (P2-11)
│   │   └── planningPolicy.ts             ← PlanningPolicy 정책 객체 (P1-7)
│   │
│   ├── renderer/
│   │   ├── BlueprintRenderer.tsx          ← blueprint → React 변환
│   │   ├── primitiveRegistry.ts           ← 타입 → 컴포넌트 매핑
│   │   ├── layouts/                       ← layout algorithm 14종
│   │   ├── choreography/                  ← motion choreography 10종
│   │   └── presetBlueprints/              ← P1-8 수정: core/fallback 분리
│   │       ├── core/                      ← 일반 사용 가능 프리셋
│   │       │   ├── cover.ts
│   │       │   ├── chapterDivider.ts
│   │       │   ├── keyInsight.ts
│   │       │   ├── compareContrast.ts
│   │       │   ├── quote.ts
│   │       │   ├── framework.ts
│   │       │   ├── application.ts
│   │       │   ├── data.ts
│   │       │   └── closing.ts
│   │       └── fallback/                  ← 비상용 전용 (Opening 실패 시)
│   │           ├── opening-selfHelp.ts
│   │           ├── opening-psychology.ts
│   │           ├── opening-business.ts
│   │           ├── opening-philosophy.ts
│   │           ├── opening-science.ts
│   │           └── opening-ai.ts
│   │
│   ├── primitives/
│   │   ├── text/                          ← 9종
│   │   ├── visual/                        ← 7종
│   │   ├── data/                          ← 7종
│   │   └── structure/                     ← 10종 (핵심 신규)
│   │
│   ├── promoter/
│   │   ├── scenePromoter.ts               ← 합성 씬 평가 + 승격
│   │   └── libraryManager.ts              ← 프리셋 라이브러리 CRUD
│   │
│   ├── validator/
│   │   ├── blueprintValidator.ts          ← 브랜드 + 구현 가능성 검증
│   │   ├── openingValidator.ts            ← Opening genericness 검증
│   │   ├── qualityMetrics.ts              ← SceneQualityMetrics 계산 (P0-5)
│   │   └── fallbackResolver.ts            ← 실패 시 대체 씬 결정
│   │
│   ├── design/                            ← 기존 유지 (토큰, 테마, 모션)
│   ├── compositions/                      ← BlueprintRenderer 사용
│   ├── pipeline/                          ← 기존 유지 + 확장
│   └── tts/                               ← 기존 유지 (5개 엔진 통합)
```

---

## 11. Claude Skill 구조 (← P2-12 부분 채택: 8개→6개로 축소)

ChatGPT는 8개 스킬을 제안했지만, gap-detection과 scene-synthesizer는 항상 함께 동작하고,
qa-validator와 scene-promotion도 렌더 후 단계로 묶이므로 6개로 축소한다.

```
1. book-analysis.skill
   → Book Analyzer + Narrative Planner
   트리거: "책 분석", "영상 기획", "book.json 생성"

2. opening-composer.skill
   → Opening Composer + Hook Strategy
   트리거: "오프닝 설계", "훅 전략", "도입부"

3. scene-architect.skill
   → Scene Planner + Gap Detector + Scene Synthesizer (통합)
   트리거: "씬 설계", "gap 분석", "커스텀 씬", "blueprint 생성"

4. subtitle-audio.skill
   → TTS 연결 + 자막 생성 + 싱크
   트리거: "TTS", "자막", "나레이션", "음성"

5. asset-research.skill
   → Asset Planner + 이미지 검색 + 라이선스 확인
   트리거: "에셋", "이미지 찾기", "표지", "아이콘"

6. render-qa.skill
   → Blueprint Renderer + Validator + Scene Promoter (통합)
   트리거: "렌더", "QA", "검수", "승격"
```

---

## 12. 구현 로드맵

### Phase A: 기반 (1주)
- [ ] 핵심 타입 정의 (섹션 3 전체)
- [ ] PlanningPolicy + FormatPolicy 정의
- [ ] 기존 9종 씬을 core preset blueprint로 변환
- [ ] 장르별 6개 fallback opening preset 작성
- [ ] BlueprintRenderer 코어 + primitiveRegistry

### Phase B: 분석 엔진 (1주)
- [ ] Book Analyzer → BookFingerprint 생성
- [ ] Narrative Planner → VideoNarrativePlan 생성
- [ ] Opening Composer → OpeningPackage 생성
- [ ] 7가지 Hook Strategy 구현

### Phase C: Gap Detection + VCL (1주)
- [ ] Scene Planner (confidence 기반 매칭)
- [ ] Gap Detector (5가지 질문 기반)
- [ ] Scene Synthesizer (VCL engine)
- [ ] 구조 계열 primitive 10종 구현
- [ ] Layout algorithm 14종 구현

### Phase D: 미디어 + 검증 (1주)
- [ ] MediaPlan 생성 자동화
- [ ] TTS 엔진 통합 (edge-tts 우선)
- [ ] 자막 생성 + 싱크 파이프라인
- [ ] Blueprint Validator + QA Metrics
- [ ] HITL 3개 체크포인트 구현
- [ ] Fallback Resolver

### Phase E: 실전 검증 (1주)
- [ ] 미라클 모닝으로 첫 영상 제작 (review 모드)
- [ ] 아토믹 해빗으로 두 번째 영상 (두 영상이 완전히 다른지 확인)
- [ ] Scene Promoter 동작 확인
- [ ] auto 모드 테스트
- [ ] 둘 다 "Editorial Signal" 브랜드로 느껴지는지 확인

---

## 13. 이 문서의 Precedence

```
1위  이 문서 (DSGS_CANONICAL_SPEC_v1.md)
2위  REVISED_CANONICAL_SPEC.md (기존 프로젝트 규격 — 디자인 토큰, 모션 등)
3위  src/types/index.ts (TypeScript 타입)
4위  src/schema/scene-catalog.json (씬 기본값)

이 문서가 기존 문서와 충돌하면 이 문서가 우선한다.
단, 디자인 토큰/모션 프리셋의 구체적 수치는 REVISED_CANONICAL_SPEC.md가 기준이다.
```