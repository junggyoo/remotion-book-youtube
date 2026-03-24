# DSGS Claude Code Orchestration Layer — Supplement to Canonical Spec v1.0

**이 문서는 DSGS_CANONICAL_SPEC_v1.md의 보충 문서다.**
`src/` 실행 엔진 위에 얹는 `.claude/` 오케스트레이션 레이어를 정의한다.

---

## 0. ChatGPT 제안 검증 로그

ChatGPT의 `.claude/` 구조 제안을 Claude Code 공식 문서와 대조 검증한 결과.

```
핵심 원칙 "src/ = 제품, .claude/ = 운영체계"          ✅ 채택 — 공식 문서와 일치
CLAUDE.md에 항상 켜진 규칙만                          ✅ 채택 — 공식 문서: "500줄 이하, 참조자료는 skill로"
.claude/rules/ 디렉토리                              ✅ 채택 — 공식 문서: paths frontmatter로 파일별 규칙 가능
Skills 8개 구조                                     ⚠️ 수정 채택 — 6개로 유지 (기존 판정 유지)
Agents 5개 구조                                     ✅ 채택 — 공식 문서 subagent 구조와 일치
Hooks를 .claude/hooks/ 폴더로                        ❌ 수정 필요 — 공식 문서: hook 설정은 settings.json에,
                                                          스크립트 파일만 별도 위치 가능
Plugin 패키징 (미래)                                  ✅ 채택 — 공식 문서 plugin 구조와 일치
context: fork + agent 조합                           ✅ 채택 — 공식 문서에서 skill이 subagent에서 실행 가능 확인
disable-model-invocation 전략                        ✅ 채택 — render, promote는 수동 전용이 맞음
Skill frontmatter 세부 설정                           ⚠️ 부분 수정 — 공식 문서 기준으로 필드명 정확히 맞춤
```

**ChatGPT가 틀린 부분 1가지:**
`.claude/hooks/` 디렉토리에 hook을 정의한다고 했는데, 이것은 **plugin 구조에서만** 가능하다.
프로젝트 수준에서 hook **설정**은 `.claude/settings.json`의 `hooks` 키에 들어가고,
hook이 실행하는 **스크립트 파일**만 별도 경로(예: `.claude/scripts/`)에 둘 수 있다.

---

## 1. 아키텍처 원칙

```
┌─────────────────────────────────────────────────────┐
│  .claude/                                            │
│  오케스트레이션 레이어                                  │
│  "누가 어떤 순서로 어떤 기준으로 엔진을 쓸 것인가"         │
│                                                      │
│  CLAUDE.md     — 항상 켜진 규칙                        │
│  rules/        — 파일/영역별 세부 규칙                  │
│  skills/       — 단계별 플레이북 (6개)                  │
│  agents/       — 무거운 역할 분담 (5개)                 │
│  settings.json — hook 설정 + 정책                     │
│  scripts/      — hook이 실행하는 검증 스크립트            │
├─────────────────────────────────────────────────────┤
│  src/                                                │
│  실행 엔진                                            │
│  "실제 Remotion/React 코드와 비즈니스 로직"              │
│                                                      │
│  renderer/     — BlueprintRenderer, layouts, etc.    │
│  primitives/   — VCL 시각 어휘 30+                    │
│  analyzer/     — bookAnalyzer, narrativePlanner      │
│  planner/      — scenePlanner, gapDetector           │
│  validator/    — blueprintValidator, qualityMetrics   │
│  promoter/     — scenePromoter, libraryManager       │
│  tts/          — TTS 엔진 통합                        │
│  design/       — 토큰, 테마, 모션 프리셋                │
└─────────────────────────────────────────────────────┘
```

**핵심:** `.claude/`의 skill/agent는 `src/`의 코드를 **호출하고 조율**하는 것이지,
`src/`를 **대체**하는 것이 아니다.

---

## 2. CLAUDE.md (항상 켜진 규칙)

공식 문서: "모든 세션에서 로드. 500줄 이하 유지. 참조자료는 skill로 이동."

우리 프로젝트의 CLAUDE.md에는 **위반하면 안 되는 규칙만** 넣는다.
책 분석 절차, hook 전략 목록, gap detection 체크리스트 등은 skill로 뺀다.

```markdown
# CLAUDE.md — Editorial Signal DSGS

## 프로젝트 개요
한국어 책 요약 YouTube 채널용 Remotion 영상 자동화 시스템.
스택: React 18 + Remotion 4 + TypeScript 5 + Zod

## 절대 규칙
- Opening preset은 일반 경로에서 사용 금지 (fallback-only)
- 모든 synthesized scene에 fallbackPreset 필수
- custom blueprint는 design token / motion preset 범위 밖 금지
- SceneBlueprint는 mediaPlan(narration + caption + audio + asset) 포함 필수
- render 전에 validator 통과 필수
- 하드코딩 색상/폰트/spring config 금지
- accent 색상 씬당 최대 2개

## 빌드 명령
npm run preview          # Remotion Studio 미리보기
npm run validate         # content JSON 검증
npm run render:longform  # longform 렌더
npm run render:shorts    # shorts 렌더

## 파이프라인 순서 (반드시 이 순서)
1.BookAnalyzer → 2.NarrativePlanner → 3.OpeningComposer
→ 4.ScenePlanner → 5.GapDetector → 6.SceneSynthesizer
→ 6.5.AssetPlanner → 7.BlueprintValidator → 8.BlueprintRenderer
→ 9.ScenePromoter

## HITL 체크포인트 (review 모드)
A: Opening 승인 (3단계 후)
B: Signature Scene 승인 (6단계 후)
C: Final QA 승인 (8단계 후)

## 참조 (상세 내용은 skill 참조)
- 디자인 토큰: src/design/tokens/
- 모션 프리셋: src/design/tokens/motion-presets.json
- 씬 카탈로그: src/schema/scene-catalog.json
- VCL 문법: /scene-architect skill 참조
- Hook 전략: /opening-composer skill 참조
```

약 50줄. 500줄 한도 대비 충분한 여유. 
구체적 절차와 참조자료는 전부 skill로 분리.

---

## 3. Rules (영역별 세부 규칙)

공식 문서: "`.claude/rules/*.md` — paths frontmatter로 특정 파일 작업 시에만 로드."

```
.claude/rules/
├── scene-schema.md          ← src/schema/ 파일 작업 시 로드
├── opening-rules.md         ← Opening 관련 코드 작업 시 로드
├── media-rules.md           ← tts/, subtitleGen 작업 시 로드
├── design-token-rules.md    ← src/design/ 작업 시 로드
└── validation-rules.md      ← src/validator/ 작업 시 로드
```

예시 — `.claude/rules/opening-rules.md`:

```yaml
---
paths:
  - src/analyzer/openingComposer.ts
  - src/validator/openingValidator.ts
  - src/renderer/presetBlueprints/fallback/**
---

# Opening 규칙
- Opening(Hook + Intro)은 반드시 동적 생성. 프리셋 사용 금지 (일반 경로)
- 동적 생성 실패 시에만 fallback/ 프리셋 사용 가능
- fallback 사용 시 openingPresetUsedReason 필드 필수 기록
- 7가지 Hook Strategy 중 반드시 하나 명시 선택
- openingGenericness score 0.35 이하 필수
```

이렇게 하면 Opening 관련 코드를 만질 때만 이 규칙이 컨텍스트에 로드되어 효율적이다.

---

## 4. Skills (단계별 플레이북 6개)

공식 문서: "`.claude/skills/<name>/SKILL.md` — 재사용 가능한 지식/워크플로우.
frontmatter로 호출 방식 제어. 지원 파일은 같은 디렉토리에."

### 4-1. 전체 구조

```
.claude/skills/
├── book-analyze/
│   ├── SKILL.md
│   ├── fingerprint-template.md
│   └── examples/
│       ├── miracle-morning.json
│       └── atomic-habits.json
│
├── opening-compose/
│   ├── SKILL.md
│   ├── hook-strategies.md
│   └── intro-framing-examples.md
│
├── scene-architect/
│   ├── SKILL.md
│   ├── gap-checklist.md
│   ├── blueprint-template.md
│   └── vcl-reference.md
│
├── subtitle-audio/
│   ├── SKILL.md
│   ├── tts-engine-comparison.md
│   ├── subtitle-style-guide.md
│   └── korean-nlp-rules.md
│
├── asset-research/
│   ├── SKILL.md
│   ├── license-guide.md
│   └── asset-spec.md
│
└── render-qa/
    ├── SKILL.md
    ├── quality-gates.md
    └── promotion-rubric.md
```

### 4-2. 각 Skill의 SKILL.md

#### Skill 1: book-analyze

```yaml
---
name: book-analyze
description: >
  책의 구조, 감정, 메타포를 분석하여 BookFingerprint를 생성한다.
  책 요약 영상 기획, book.json 생성, 콘텐츠 JSON 작성 시 사용.
  "책 분석해줘", "영상 기획", "fingerprint" 등의 요청에 자동 활성화.
context: fork
agent: book-analyst
---

# Book Analyzer + Narrative Planner

## 입력
- 책 제목, 저자, 장르
- 책 내용 요약 (챕터별 또는 자유 형식)
- 목표 영상 길이 (분)

## 출력
1. BookFingerprint JSON
2. VideoNarrativePlan JSON (segments + emotionalCurve)

## 분석 프레임워크 (5가지 질문)
Q1. 구조(Structure): 목록? 순환? 계층? 비교? 시간축?
Q2. 관계(Relationship): 병렬? 순차? 대립? 포함?
Q3. 핵심 숫자(Numbers): 퍼센트? 개수? 비율?
Q4. 감정 톤(Emotional Tone): 긴장? 각성? 평온?
Q5. 시각적 이미지(Mental Image): 바퀴? 산? 파도? 나선?

## 상세 참조
- BookFingerprint 타입: [fingerprint-template.md](fingerprint-template.md)
- 완성 예시: [examples/](examples/)
```

#### Skill 2: opening-compose

```yaml
---
name: opening-compose
description: >
  책의 특성에 맞는 Opening(Hook + Intro)을 동적 설계한다.
  오프닝 설계, 훅 전략, 도입부 작성 시 사용.
  "오프닝 만들어줘", "훅 전략", "도입부 설계" 등에 자동 활성화.
---

# Opening Composer

## 7가지 Hook Strategy
상세 설명과 예시: [hook-strategies.md](hook-strategies.md)

## 핵심 규칙
- Opening은 OpeningPackage로 다룸 (Hook + Intro + transitionBridge)
- 프리셋 사용 금지 (일반 경로)
- hookStrategy 반드시 명시 선택
- openingGenericness < 0.35 필수

## Intro Framing 규칙
- 책 정보 소개가 아니라 "왜 이 영상을 봐야 하는가"
- 상세 예시: [intro-framing-examples.md](intro-framing-examples.md)
```

#### Skill 3: scene-architect

```yaml
---
name: scene-architect
description: >
  기존 프리셋 매핑 + Gap Detection + 커스텀 씬 Blueprint 생성을 수행한다.
  씬 설계, gap 분석, 커스텀 씬, blueprint 생성 시 사용.
  "씬 구성해줘", "이 책에 맞는 씬", "blueprint" 등에 자동 활성화.
context: fork
agent: scene-designer
---

# Scene Planner + Gap Detector + Scene Synthesizer

## 워크플로우
1. VideoNarrativePlan의 각 segment에 대해 기존 프리셋 매핑 (confidence 점수)
2. confidence < threshold인 segment를 SceneGap으로 분류
3. 각 Gap에 대해 VCL engine으로 SceneBlueprint 생성
4. 모든 합성 씬에 fallbackPreset + fallbackContent 지정

## Gap Detection 체크리스트
상세: [gap-checklist.md](gap-checklist.md)

## VCL 참조 (Vocabulary + Grammar + Prosody)
상세: [vcl-reference.md](vcl-reference.md)

## Blueprint 템플릿
상세: [blueprint-template.md](blueprint-template.md)

## 비율 가이드라인
- Opening 2씬(동적) + 프리셋 7~8씬(55~60%) + 합성 3~4씬(25~30%)
- 합성 씬 최소 2개, 최대 5개
```

#### Skill 4: subtitle-audio

```yaml
---
name: subtitle-audio
description: >
  TTS 음성 합성 + 자막 생성 + 싱크를 처리한다.
  TTS 연결, 자막 생성, 나레이션, 음성 합성 시 사용.
  "TTS", "자막", "나레이션", "음성" 등에 자동 활성화.
---

# TTS + Subtitle Pipeline

## TTS 엔진 선택 가이드
상세: [tts-engine-comparison.md](tts-engine-comparison.md)

## 자막 스타일 규칙
- 한 문장씩 표시 (sentence-by-sentence)
- 28자/줄, 최대 2줄
- VO 시작 3f 전 자막 노출, 종료 후 6f 유지
- 상세: [subtitle-style-guide.md](subtitle-style-guide.md)

## 한국어 처리 규칙
- 어절 단위 줄바꿈, 조사 분리 방지
- 상세: [korean-nlp-rules.md](korean-nlp-rules.md)
```

#### Skill 5: asset-research

```yaml
---
name: asset-research
description: >
  영상에 필요한 이미지/아이콘/텍스처를 검색하고 수급한다.
  에셋 준비, 이미지 찾기, 표지 이미지, 아이콘 배치 시 사용.
  "이미지 찾아줘", "에셋 준비", "표지" 등에 자동 활성화.
---

# Asset Planner + Fetcher

## 에셋 유형별 수급 전략
- 책 표지: Google Books API / 웹 검색
- 저자 사진: Wikipedia Commons
- 컨셉 이미지: Unsplash / Pexels
- 아이콘: Lucide / Heroicons
- 상세: [asset-spec.md](asset-spec.md)

## 라이선스 확인 규칙
상세: [license-guide.md](license-guide.md)

## Fallback
- mediaPlan.assetPlan.fallbackMode에 따라 대체
```

#### Skill 6: render-qa

```yaml
---
name: render-qa
description: >
  최종 렌더링 + QA 검수 + 씬 승격을 처리한다.
  렌더링, QA 검수, 영상 출력, 씬 승격 시 사용.
disable-model-invocation: true
---

# Render + QA + Scene Promotion

⚠️ 이 skill은 부작용이 있으므로 /render-qa로 수동 호출만 가능합니다.

## QA Quality Gates
상세: [quality-gates.md](quality-gates.md)

## Scene Promotion 기준
상세: [promotion-rubric.md](promotion-rubric.md)

## 워크플로우
1. Blueprint Validator 실행 (모든 씬 검증)
2. Remotion render 실행
3. QA metrics 계산 (SceneQualityMetrics)
4. QUALITY_GATE 통과 여부 판정
5. 합성 씬 중 promotable 후보 판별
```

### 4-3. Skill 호출 방식 전략

공식 문서 기준으로 분류:

| Skill | 자동 호출 | 수동 호출 | context: fork | 이유 |
|-------|----------|----------|---------------|------|
| book-analyze | ✅ | `/book-analyze` | ✅ fork | 많은 파일 읽기, 컨텍스트 격리 필요 |
| opening-compose | ✅ | `/opening-compose` | ❌ inline | 대화 컨텍스트 필요 |
| scene-architect | ✅ | `/scene-architect` | ✅ fork | VCL 참조 많음, 격리 유리 |
| subtitle-audio | ✅ | `/subtitle-audio` | ❌ inline | 대화 흐름에서 바로 처리 |
| asset-research | ✅ | `/asset-research` | ❌ inline | 브라우저 연동 시 대화 필요 |
| render-qa | ❌ 금지 | `/render-qa` 전용 | ❌ inline | 부작용 있음, 사람이 트리거 |

---

## 5. Agents (Subagents 5개)

공식 문서: "`.claude/agents/<name>.md` — YAML frontmatter + markdown 시스템 프롬프트.
tools, model, skills, hooks, memory 설정 가능."

### 5-1. 전체 구조

```
.claude/agents/
├── book-analyst.md
├── opening-designer.md
├── scene-designer.md
├── media-planner.md
└── qa-validator.md
```

### 5-2. 각 Agent 정의

#### book-analyst.md

```yaml
---
name: book-analyst
description: >
  책 요약 원문을 분석하여 BookFingerprint와 VideoNarrativePlan을 생성한다.
  많은 참조 파일을 읽어야 하므로 격리된 컨텍스트에서 실행.
tools: Read, Grep, Glob, Bash
model: sonnet
skills:
  - book-analyze
memory: project
---

너는 Editorial Signal 채널의 콘텐츠 분석가다.
책의 구조, 감정, 메타포, 시각적 가능성을 분석하여
BookFingerprint와 VideoNarrativePlan을 생성한다.

분석 시 반드시 5가지 질문(구조/관계/숫자/감정/이미지)에 답해야 한다.
결과는 TypeScript 타입 정의(src/types/index.ts)에 맞는 JSON으로 출력한다.

이전 분석 경험에서 배운 패턴이 있으면 agent memory를 참조하라.
분석 완료 후 새로 발견한 패턴을 memory에 기록하라.
```

#### opening-designer.md

```yaml
---
name: opening-designer
description: >
  BookFingerprint를 기반으로 Hook Strategy를 선택하고
  OpeningPackage(Hook + Intro + transitionBridge)를 설계한다.
tools: Read, Grep, Glob
model: sonnet
skills:
  - opening-compose
---

너는 YouTube 영상 오프닝 전문가다.
7가지 Hook Strategy 중 이 책에 가장 적합한 것을 선택하고,
시청자가 첫 15초 안에 이탈하지 않도록 OpeningPackage를 설계한다.

핵심 원칙:
- 역할은 고정(Hook = 붙잡기, Intro = 맥락 설정), 구현은 동적
- generic한 오프닝은 금지. openingGenericness < 0.35 필수
- Hook과 Intro는 하나의 설계 단위(OpeningPackage)로 다룬다
```

#### scene-designer.md

```yaml
---
name: scene-designer
description: >
  VideoNarrativePlan을 기반으로 기존 프리셋 매핑, Gap Detection,
  커스텀 씬 Blueprint 생성을 수행한다. VCL 참조가 많으므로 격리 실행.
tools: Read, Grep, Glob, Write
model: inherit
skills:
  - scene-architect
memory: project
---

너는 모션 그래픽 씬 아키텍트다.
기존 프리셋으로 충분한 씬은 프리셋을 쓰고,
이 책만의 고유한 표현이 필요한 씬은 VCL로 새로 설계한다.

워크플로우:
1. 각 narrative segment에 대해 기존 프리셋 매칭 (confidence 점수)
2. confidence < threshold → SceneGap 분류
3. 각 Gap에 대해 layout + elements + choreography 조합으로 Blueprint 생성
4. 모든 합성 씬에 fallbackPreset 지정 (필수)
5. mediaPlan 동시 작성

비율: 프리셋 55~60% + 합성 25~30% + Opening 15%
합성 씬 최소 2개 (Signature Scene Rule)

이전 프로젝트에서 승격된 씬 패턴이 있으면 memory를 참조하라.
새로 만든 좋은 패턴은 memory에 기록하라.
```

#### media-planner.md

```yaml
---
name: media-planner
description: >
  각 씬의 captionPlan, audioPlan, assetPlan을 작성한다.
  TTS 엔진 선택, 자막 스타일, 에셋 요구사항을 결정.
tools: Read, Grep, Bash
model: sonnet
skills:
  - subtitle-audio
  - asset-research
---

너는 영상 미디어 플래너다.
각 SceneBlueprint의 mediaPlan을 완성한다.

처리 항목:
1. narrationText → TTS 엔진 선택 + voice 설정
2. narrationText → 문장 분리 → captionPlan 작성 (28자/줄, 2줄 이내)
3. blueprint.elements → 필요 에셋 목록 → assetPlan 작성
4. 에셋 검색 쿼리 생성 + fallbackMode 결정

한국어 자막 규칙: 어절 단위 줄바꿈, 조사 분리 방지
```

#### qa-validator.md

```yaml
---
name: qa-validator
description: >
  완성된 blueprint 세트의 브랜드 일관성, 구현 가능성, 품질을 검증한다.
  렌더 전 최종 검증 및 렌더 후 QA를 담당.
tools: Read, Grep, Glob, Bash
model: inherit
skills:
  - render-qa
---

너는 QA 검증자다.
모든 blueprint가 브랜드 규칙과 품질 기준을 충족하는지 검사한다.

검증 항목:
1. 하드코딩 색상/폰트/spring config 없는지
2. accent 씬당 2개 이내
3. 모든 합성 씬에 fallbackPreset 있는지
4. mediaPlan 완전한지 (narration + caption + audio + asset)
5. Opening genericness < 0.35인지
6. readabilityScore >= 0.8인지
7. brandConsistencyScore >= 0.85인지

실패 시 구체적 수정 지시를 반환한다.
```

### 5-3. Agent memory 활용

공식 문서: "`memory: project` — `.claude/agent-memory/<name>/`에 교차 세션 지식 저장."

`book-analyst`와 `scene-designer`에 memory를 설정하는 이유:
- 100권의 책을 분석하면서 장르별 패턴을 축적
- 승격된 씬 패턴을 기억하여 유사한 책에서 재활용
- 이것이 ChatGPT가 말한 "시스템이 학습하는" 구조를 실현

---

## 6. Hooks (결정론적 게이트)

공식 문서: "hook 설정은 settings.json에. 스크립트는 별도 경로.
exit 2 = 차단. LLM 판단 필요 없는 강제 규칙에만 사용."

**ChatGPT가 제안한 `.claude/hooks/` 디렉토리는 plugin 전용이다.**
프로젝트 수준에서는 `.claude/settings.json`의 `hooks` 키 + `.claude/scripts/` 스크립트 파일 조합.

### 6-1. 스크립트 파일

```
.claude/scripts/
├── validate-opening-no-preset.sh    ← Opening에 프리셋 사용 차단
├── validate-fallback-exists.sh      ← 합성 씬 fallback 필수 검증
├── validate-media-plan.sh           ← mediaPlan 완전성 검증
├── validate-no-hardcoded-colors.sh  ← 하드코딩 색상 차단
├── validate-subtitle-length.sh      ← 자막 28자/2줄 초과 차단
└── run-zod-validation.sh            ← Zod schema 검증
```

### 6-2. settings.json hook 설정

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/scripts/validate-no-hardcoded-colors.sh"
          }
        ]
      },
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/scripts/validate-opening-no-preset.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path' | xargs npx prettier --write 2>/dev/null || true"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Check if all planned scenes have been generated and all mediaPlan fields are complete. If not, respond with {\"ok\": false, \"reason\": \"what remains\"}."
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "matcher": "compact",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Reminder: 파이프라인 순서를 지켜라. Opening은 동적 생성 필수. 모든 합성 씬에 fallback 필수.'"
          }
        ]
      }
    ]
  }
}
```

### 6-3. Hook vs Skill vs Agent 역할 분담

ChatGPT가 정확히 짚은 핵심을 정리:

```
Hook:  "opening preset이 Write 대상 파일에 들어갔는가?" → 기계적 차단 (exit 2)
Skill: "이 Opening이 충분히 강한가?" → 참조자료 기반 판단
Agent: "이 책에 가장 적합한 Hook Strategy는?" → 분석 + 생성

Hook은 "생각"을 시키는 게 아니라 "위반을 막는 게이트"
```

---

## 7. 전체 .claude/ 디렉토리 구조

```
.claude/
├── CLAUDE.md                              ← 항상 켜진 규칙 (~50줄)
│
├── rules/                                 ← 영역별 세부 규칙
│   ├── scene-schema.md
│   ├── opening-rules.md
│   ├── media-rules.md
│   ├── design-token-rules.md
│   └── validation-rules.md
│
├── skills/                                ← 단계별 플레이북 (6개)
│   ├── book-analyze/
│   │   ├── SKILL.md
│   │   ├── fingerprint-template.md
│   │   └── examples/
│   ├── opening-compose/
│   │   ├── SKILL.md
│   │   ├── hook-strategies.md
│   │   └── intro-framing-examples.md
│   ├── scene-architect/
│   │   ├── SKILL.md
│   │   ├── gap-checklist.md
│   │   ├── blueprint-template.md
│   │   └── vcl-reference.md
│   ├── subtitle-audio/
│   │   ├── SKILL.md
│   │   ├── tts-engine-comparison.md
│   │   ├── subtitle-style-guide.md
│   │   └── korean-nlp-rules.md
│   ├── asset-research/
│   │   ├── SKILL.md
│   │   ├── license-guide.md
│   │   └── asset-spec.md
│   └── render-qa/
│       ├── SKILL.md
│       ├── quality-gates.md
│       └── promotion-rubric.md
│
├── agents/                                ← 무거운 역할 분담 (5개)
│   ├── book-analyst.md
│   ├── opening-designer.md
│   ├── scene-designer.md
│   ├── media-planner.md
│   └── qa-validator.md
│
├── scripts/                               ← hook이 실행하는 검증 스크립트
│   ├── validate-opening-no-preset.sh
│   ├── validate-fallback-exists.sh
│   ├── validate-media-plan.sh
│   ├── validate-no-hardcoded-colors.sh
│   ├── validate-subtitle-length.sh
│   └── run-zod-validation.sh
│
├── settings.json                          ← hook 설정 + 정책
└── settings.local.json                    ← 로컬 전용 설정 (gitignore)
```

---

## 8. 미래: Plugin 패키징

공식 문서: "plugin은 skills, hooks, agents, MCP를 단일 설치 가능한 단위로 번들."

현재는 `.claude/` 프로젝트 구조로 충분하지만,
시스템이 안정화되면 plugin으로 패키징하여 재사용/판매 가능:

```
editorial-signal-plugin/
├── .claude-plugin/
│   └── plugin.json           ← name, version, description
├── skills/                   ← 위의 6개 skill 그대로
├── agents/                   ← 위의 5개 agent 그대로
├── hooks/
│   └── hooks.json            ← plugin용 hook 설정 (여기서는 별도 파일 가능)
└── scripts/                  ← hook 스크립트
```

이렇게 하면:
- `youtube-book-summary-system` plugin
- `ai-news-channel-system` plugin
- `motivation-shorts-system` plugin

같은 식으로 주제별 변형 plugin을 만들어 marketplace 배포 가능.

---

## 9. 로드맵 보충 (Phase F 추가)

기존 DSGS_CANONICAL_SPEC_v1.md의 Phase A~E에 추가:

### Phase F: Claude Code 오케스트레이션 (Phase C와 병행)
- [ ] CLAUDE.md 작성 (50줄 이내)
- [ ] `.claude/rules/` 5개 작성
- [ ] Skills 6개의 SKILL.md + 지원 파일 작성
- [ ] Agents 5개의 markdown 정의 작성
- [ ] Hook 스크립트 6개 + settings.json 설정
- [ ] book-analyst agent memory 테스트 (3권 분석 후 패턴 축적 확인)
- [ ] scene-designer agent memory 테스트 (승격 패턴 재활용 확인)
- [ ] render-qa skill의 disable-model-invocation 동작 확인
- [ ] 전체 파이프라인 `/book-analyze` → `/scene-architect` → `/render-qa` 흐름 테스트