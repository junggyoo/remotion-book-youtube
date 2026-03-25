# Claude Code 실전 사용 가이드

## 1. 두 문서의 관계

```
DSGS_CANONICAL_SPEC_v1.md          = "무엇을 만들 것인가" (시스템 설계)
DSGS_CLAUDE_CODE_ORCHESTRATION.md  = "Claude Code가 어떻게 운영할 것인가" (오케스트레이션)
```

이 둘은 **별개의 문서지만 하나의 시스템**이다.
비유하자면 건축 설계도(SPEC)와 시공 관리 매뉴얼(ORCHESTRATION)의 관계.

**둘 다 프로젝트에 넣어야 한다.** Claude Code가 참조할 수 있도록.

---

## 2. 프로젝트 세팅 (최초 1회)

### Step 1: 기존 프로젝트에 문서 배치

```bash
# 프로젝트 루트로 이동
cd ~/editorial-signal

# 두 문서를 프로젝트 docs/ 에 배치
mkdir -p docs/dsgs
cp DSGS_CANONICAL_SPEC_v1.md docs/dsgs/
cp DSGS_CLAUDE_CODE_ORCHESTRATION.md docs/dsgs/

# .claude/ 디렉토리 기본 구조 생성
mkdir -p .claude/{rules,skills,agents,scripts}
```

### Step 2: CLAUDE.md에 참조 추가

기존 CLAUDE.md 맨 위에 추가:

```markdown
## DSGS (Dynamic Scene Generation System)
이 프로젝트는 동적 씬 생성 시스템으로 확장 중이다.
- 시스템 설계: docs/dsgs/DSGS_CANONICAL_SPEC_v1.md
- 오케스트레이션: docs/dsgs/DSGS_CLAUDE_CODE_ORCHESTRATION.md
위 두 문서가 동적 씬 생성의 기준이다.
```

---

## 3. Claude Code 프롬프트 — 단계별 실행

### ⚠️ 핵심 원칙

```
한 번에 전부 하지 말 것.
Phase 단위로 나눠서, 각 Phase를 /plan → 확인 → 실행 순서로 진행.
```

---

### Phase A: 기반 설정 (가장 먼저)

#### A-1. 오케스트레이션 레이어 구축

```
/plan docs/dsgs/DSGS_CLAUDE_CODE_ORCHESTRATION.md 문서의 섹션 7 "전체 .claude/ 디렉토리 구조"를 기준으로, 
현재 프로젝트에 .claude/ 오케스트레이션 레이어를 구축해줘.

구체적으로:
1. .claude/CLAUDE.md를 ORCHESTRATION 문서 섹션 2 기준으로 작성 (50줄 이내)
2. .claude/rules/ 5개 파일 작성 (섹션 3 기준)
3. .claude/settings.json에 hook 설정 (섹션 6-2 기준)
4. .claude/scripts/ 검증 스크립트 6개 작성 (섹션 6-1 기준)

아직 skills와 agents는 만들지 마. 기반부터.
```

#### A-2. 핵심 타입 정의

```
/plan docs/dsgs/DSGS_CANONICAL_SPEC_v1.md 문서의 섹션 3 "핵심 타입 정의"를 기준으로,
src/types/index.ts에 다음 타입들을 추가해줘:

- BookFingerprint (3-1)
- VideoNarrativePlan (3-2)  
- SceneBlueprint + MediaPlan (3-3)
- SynthesizedBlueprint (3-4)
- OpeningPackage (3-5)
- PlanningPolicy + FormatPolicy (3-6)
- SceneQualityMetrics + QUALITY_GATE (3-7)

기존 타입과 충돌하지 않게 해줘. 기존 BaseSceneProps, Theme 등은 유지.
```

#### A-3. 기존 9종 씬을 preset blueprint로 변환

```
/plan docs/dsgs/DSGS_CANONICAL_SPEC_v1.md 섹션 4-5 "기존 9종 씬 호환"을 기준으로,
기존 src/scenes/ 의 9종 씬 컴포넌트를 
src/renderer/presetBlueprints/core/ 디렉토리에 
SceneBlueprint JSON 형식의 프리셋으로 변환해줘.

기존 씬 컴포넌트는 삭제하지 말고, 프리셋 blueprint도 함께 생성해서
type: "cover" 같은 기존 방식과 type: "custom" + blueprint 새 방식이 공존하게 해줘.
```

---

### Phase B: 분석 엔진

#### B-1. Book Analyzer

```
/plan docs/dsgs/DSGS_CANONICAL_SPEC_v1.md 섹션 3-1 BookFingerprint 타입과
docs/dsgs/DSGS_CLAUDE_CODE_ORCHESTRATION.md 섹션 4-2 book-analyze skill을 참조해서,

1. src/analyzer/bookAnalyzer.ts 구현 — 책 정보를 받아 BookFingerprint를 반환
2. src/analyzer/narrativePlanner.ts 구현 — BookFingerprint를 받아 VideoNarrativePlan을 반환
3. .claude/skills/book-analyze/ 디렉토리에 SKILL.md + fingerprint-template.md + examples/ 작성
4. .claude/agents/book-analyst.md 작성

먼저 미라클 모닝 예시로 테스트할 수 있게 examples/miracle-morning.json도 포함해줘.
```

#### B-2. Opening Composer

```
/plan docs/dsgs/DSGS_CANONICAL_SPEC_v1.md 섹션 5 "Opening 시스템"과
ORCHESTRATION 문서 섹션 4-2의 opening-compose skill을 참조해서,

1. src/analyzer/openingComposer.ts 구현 — BookFingerprint를 받아 OpeningPackage 반환
2. 7가지 Hook Strategy를 코드로 구현 (HOOK_STRATEGIES 객체)
3. .claude/skills/opening-compose/ 디렉토리에 SKILL.md + hook-strategies.md + intro-framing-examples.md 작성
4. .claude/agents/opening-designer.md 작성

미라클 모닝에 대해 system + transformation 조합 hook이 나오는지 테스트 가능하게.
```

---

### Phase C: Gap Detection + VCL

#### C-1. Scene Planner + Gap Detector

```
/plan docs/dsgs/DSGS_CANONICAL_SPEC_v1.md 섹션 6 "Gap Detection 시스템"을 기준으로,

1. src/planner/scenePlanner.ts — VideoNarrativePlan의 각 segment에 기존 프리셋 매칭 + confidence 점수
2. src/planner/gapDetector.ts — confidence < threshold인 segment를 SceneGap으로 분류
3. src/planner/planningPolicy.ts — PlanningPolicy 정책 객체 (threshold, min/max 합성 씬 수 등)
4. .claude/skills/scene-architect/ 디렉토리에 SKILL.md + gap-checklist.md 작성

미라클 모닝에서 "SAVERS 순환 구조"와 "아침 타임라인"이 gap으로 탐지되는지 확인 가능하게.
```

#### C-2. VCL Engine (BlueprintRenderer + Primitives + Layouts)

```
/plan docs/dsgs/DSGS_CANONICAL_SPEC_v1.md 섹션 4 "VCL 엔진"을 기준으로,

1. src/renderer/BlueprintRenderer.tsx 구현 (섹션 4-4 코드 기준)
2. src/renderer/primitiveRegistry.ts 구현
3. src/renderer/layouts/ 에 가장 핵심적인 layout 5개 먼저 구현:
   - centerFocus, splitTwo, radial, timelineH, gridN
4. src/renderer/choreography/ 에 핵심 패턴 3개 먼저:
   - revealSequence, staggerClockwise, pathTrace
5. src/primitives/structure/ 에 핵심 5개 먼저:
   - timelineNode, cycleConnector, flowStep, cardStack, layerStack

전부 한 번에 하지 말고 위 핵심 요소만 먼저 구현해서 
미라클 모닝의 "SAVERS 습관 휠" 씬을 렌더링할 수 있는 최소 세트를 만들어줘.
```

#### C-3. Scene Synthesizer

```
/plan docs/dsgs/DSGS_CANONICAL_SPEC_v1.md 섹션 4와 6을 참조해서,

1. src/planner/sceneSynthesizer.ts — SceneGap을 받아 VCL로 SynthesizedBlueprint 생성
2. gap.requiredCapabilities → layout 선택, intent → primitive 선정, emotionalTone → choreography 결정
3. 모든 합성 씬에 fallbackPreset + fallbackContent 자동 지정
4. lifecycle: 'ephemeral' | 'candidate-promotable' 자동 분류
5. .claude/skills/scene-architect/ 에 blueprint-template.md + vcl-reference.md 추가
6. .claude/agents/scene-designer.md 작성

미라클 모닝의 gap 2개 (SAVERS 휠, 아침 타임라인)를 실제로 합성해서
Remotion Studio에서 프리뷰할 수 있는 상태까지.
```

---

### Phase D: 미디어 + 검증

#### D-1. TTS + 자막

```
/plan docs/dsgs/DSGS_CANONICAL_SPEC_v1.md 섹션 3-3 MediaPlan 타입과
ORCHESTRATION 문서의 subtitle-audio skill을 참조해서,

1. src/tts/ttsClient.ts — edge-tts 엔진 연동 (무료, 한국어 지원)
2. src/tts/subtitleGen.ts — narrationText → 문장 분리 → SubtitleCue[] 생성
3. src/tts/durationSync.ts — TTS duration → durationFrames 자동 계산
4. src/components/hud/SubtitleLayer.tsx — 자막 렌더링 컴포넌트
5. .claude/skills/subtitle-audio/ 디렉토리 작성
6. .claude/agents/media-planner.md 작성

미라클 모닝 첫 3개 씬에 대해 TTS 음성 + 자막이 싱크되어 렌더링되는 것까지.
```

#### D-2. Validator + QA

```
/plan docs/dsgs/DSGS_CANONICAL_SPEC_v1.md 섹션 3-7 SceneQualityMetrics와 
ORCHESTRATION 문서의 render-qa skill을 참조해서,

1. src/validator/blueprintValidator.ts — 브랜드 규칙 + 구현 가능성 검증
2. src/validator/openingValidator.ts — Opening genericness 검증
3. src/validator/qualityMetrics.ts — SceneQualityMetrics 계산
4. src/validator/fallbackResolver.ts — 실패 시 대체 씬 결정
5. .claude/skills/render-qa/ 디렉토리 작성 (disable-model-invocation: true)
6. .claude/agents/qa-validator.md 작성

QUALITY_GATE 상수 기준으로 pass/fail 판정이 자동으로 나오게.
```

---

### Phase E: 통합 테스트

#### E-1. 미라클 모닝 전체 파이프라인

```
미라클 모닝으로 8분짜리 longform 영상을 전체 파이프라인으로 만들어줘.

1. /book-analyze 로 BookFingerprint + VideoNarrativePlan 생성
2. /opening-compose 로 OpeningPackage 생성 (hook strategy: system + transformation)
3. /scene-architect 로 프리셋 매핑 + gap detection + 합성 씬 생성
4. TTS + 자막 생성
5. 에셋 수급 (가능한 것만)
6. /render-qa 로 최종 검증 + 렌더

각 단계 결과를 보여주고, 문제가 있으면 알려줘.
review 모드로 HITL 체크포인트 A, B, C에서 내 확인을 받아줘.
```

#### E-2. 아토믹 해빗으로 비교 테스트

```
아토믹 해빗(James Clear)으로 8분짜리 longform 영상을 만들어줘.

미라클 모닝 영상과 비교할 거야. 두 가지를 확인하고 싶어:
1. 두 영상의 합성 씬이 완전히 다른가? (같은 씬이 하나도 없어야 함)
2. 둘 다 "Editorial Signal" 브랜드로 느껴지는가? (디자인 토큰 일관성)

파이프라인 전체를 돌려주고, 결과를 미라클 모닝과 비교 분석해줘.
```

---

## 4. 일상 사용 프롬프트

시스템이 구축된 후 매일 사용하는 프롬프트:

### 새 책으로 영상 제작 (기본)

```
"딥 워크(Cal Newport)" 이 책으로 8분짜리 영상 만들어줘.
review 모드로. Opening 승인, Signature Scene 승인, Final QA 승인 각각 받을게.
```

### 빠른 제작 (auto 모드)

```
"세이노의 가르침" 으로 8분짜리 영상 만들어줘.
auto 모드로. HITL 체크포인트 건너뛰고 자동으로 끝까지.
```

### 특정 단계만 다시 실행

```
방금 만든 "딥 워크" 영상의 Opening이 마음에 안 들어.
hook strategy를 pain에서 contrarian으로 바꿔서 Opening만 다시 생성해줘.
나머지 씬은 그대로.
```

### Shorts 추출

```
방금 만든 "딥 워크" longform 영상에서
가장 임팩트 있는 씬 2~3개를 골라서 shorts 3개 만들어줘.
```

---

## 5. 진행 순서 요약

```
[1회] Phase A-1: .claude/ 오케스트레이션 기반 세팅
[1회] Phase A-2: 핵심 타입 정의
[1회] Phase A-3: 기존 씬 → preset blueprint 변환
  ↓
[1회] Phase B-1: Book Analyzer 구현
[1회] Phase B-2: Opening Composer 구현
  ↓
[1회] Phase C-1: Scene Planner + Gap Detector
[1회] Phase C-2: VCL Engine (최소 세트)
[1회] Phase C-3: Scene Synthesizer
  ↓
[1회] Phase D-1: TTS + 자막
[1회] Phase D-2: Validator + QA
  ↓
[반복] Phase E: 실전 테스트 (미라클 모닝 → 아토믹 해빗 → ...)
  ↓
[매일] 일상 사용: "이 책으로 영상 만들어줘"
```

각 Phase에서 `/plan` 으로 먼저 계획을 세우고,
계획을 확인한 뒤 실행하는 것이 안전하다.
한 번에 여러 Phase를 합치지 말 것.
```