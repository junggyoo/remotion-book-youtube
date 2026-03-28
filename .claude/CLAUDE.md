# CLAUDE.md — Editorial Signal DSGS

> **Claude Code가 이 프로젝트에서 작업할 때 반드시 먼저 읽는 파일이다.**
> 모든 규칙은 이 파일이 기준이다. 모르는 부분이 있으면 추측하지 말고 이 파일을 먼저 참조하라.

---

## 프로젝트 개요

**브랜드:** Editorial Signal
**핵심 메타포:** Editorial Continuous Canvas
**목적:** 한국어 책 요약 / 핵심 인사이트 YouTube 채널용 Remotion 영상 자동 생산 시스템
**포맷:** Longform (1920x1080, 16:9) + Shorts (1080x1920, 9:16)
**스택:** React 18 + Remotion 4 + TypeScript 5 + Zod

**핵심 원칙 한 줄:**
데이터(`content/books/*.json`)만 바꾸면 새 영상이 나오는 구조.
디자인 결정은 이미 시스템에 들어있다. Claude Code는 그 시스템 안에서 조립한다.

---

## 절대 규칙

- Opening preset은 일반 경로에서 사용 금지 (fallback-only)
- 모든 synthesized scene에 fallbackPreset 필수
- custom blueprint는 design token / motion preset 범위 밖 금지
- SceneBlueprint는 mediaPlan(narration + caption + audio + asset) 포함 필수
- render 전에 validator 통과 필수
- 하드코딩 색상/폰트/spring config 금지
- accent 색상 씬당 최대 2개

---

## 빌드 명령

```bash
npm run preview          # Remotion Studio 미리보기
npm run validate         # content JSON 검증
npm run render:longform  # longform 렌더
npm run render:shorts    # shorts 렌더
```

---

## 파이프라인 순서 (반드시 이 순서)

1.BookAnalyzer -> 2.NarrativePlanner -> 3.OpeningComposer
-> 4.ScenePlanner -> 5.GapDetector -> 6.SceneSynthesizer
-> 6.3.BeatComposer -> 6.5.AssetPlanner -> 7.BlueprintValidator -> 8.BlueprintRenderer
-> 9.ScenePromoter

## HITL 체크포인트 (review 모드)

A: Opening 승인 (3단계 후)
B: Signature Scene 승인 (6단계 후)
C: Final QA 승인 (8단계 후)

---

## 새 책 영상 생성 워크플로우 (절대 규칙)

> 이 워크플로우는 위 파이프라인의 **Stage 0 (content JSON 생성)** 절차를 정의한다.
> 파이프라인 Stage 1~8은 오케스트레이터가 자동 처리한다.

사용자가 책 이름을 언급하며 영상 생성을 요청하면:

### 반드시 이 순서를 따른다:

1. `.claude/skills/content-composer/SKILL.md`를 읽고 그 절차를 따른다
2. book-analyst 에이전트로 BookFingerprint + NarrativePlan을 먼저 생성한다
3. 그 결과를 기반으로 content JSON을 생성한다 (스키마 검증 필수)
4. 오케스트레이터를 실행한다:
   `npx ts-node scripts/dsgs-orchestrate.ts content/books/{id}.json --mode auto --format longform`
5. Root.tsx를 수동으로 수정하지 않는다 (`scripts/sync-root.ts`가 자동 처리)

### 절대 금지:

- book-analyst를 건너뛰고 바로 content JSON을 작성하는 것
- 기존 책의 JSON을 복사해서 텍스트만 바꾸는 것
- generated/ 산출물을 수동으로 작성하는 것
- 오케스트레이터를 우회하는 것
- Root.tsx에 수동으로 import/Composition을 추가하는 것

---

## Beat 시스템 규칙

- 8초+ 씬에는 beats 배열 필수
- beat.activates = UI 요소 키, beat.emphasisTargets = 자막 하이라이트 단어 (혼용 금지)
- beat 최소 duration: endRatio - startRatio >= 0.12
- beat 간 overlap 금지 (beat[n].endRatio === beat[n+1].startRatio)
- evidenceCard는 evidence-rubric.md A/B등급만 사용 (C등급 금지)
- BeatDesignRationale 구조화된 근거 필수 출력
- beat가 있는 씬은 BeatElement + useBeatTimeline으로 렌더링

---

## 디렉토리 구조

```
editorial-signal/
├── src/
│   ├── design/
│   │   ├── tokens/
│   │   │   ├── design-tokens-draft.json   <- 색/타이포/간격 단일 소스
│   │   │   ├── motion-presets.json        <- 모션 단일 소스
│   │   │   ├── colors.ts
│   │   │   ├── typography.ts
│   │   │   ├── spacing.ts
│   │   │   ├── motion.ts
│   │   │   ├── layout.ts
│   │   │   ├── zIndex.ts
│   │   │   └── index.ts
│   │   └── themes/
│   │       ├── useTheme.ts
│   │       └── useFormat.ts
│   ├── components/
│   │   ├── primitives/     <- 원자 단위. TextBlock, LabelChip, DividerLine 등
│   │   ├── layout/         <- CanvasWrapper, SafeArea, SplitPanel
│   │   ├── motion/         <- ArchitecturalReveal, StaggerContainer 등
│   │   └── hud/            <- SubtitleLayer, ChapterIndicator
│   ├── scenes/             <- 씬 컴포넌트
│   ├── compositions/       <- LongformComposition, ShortsComposition
│   ├── schema/             <- JSON 스키마 파일들 (읽기 전용)
│   ├── types/index.ts      <- TypeScript 타입 단일 소스
│   ├── pipeline/           <- validate, planScenes, buildProps, qa
│   └── tts/                <- ttsClient, durationSync, subtitleGen
├── content/books/          <- 책별 콘텐츠 JSON (여기를 채워서 영상 생산)
├── assets/                 <- icons, textures, covers, sounds
├── scripts/                <- CLI 명령 스크립트
├── docs/
│   ├── specs/              <- 활성 시스템 스펙
│   ├── roadmap/            <- 로드맵
│   └── archive/            <- 완료/폐기 문서
├── generated/              <- 파이프라인 산출물 (books별)
└── .claude/                <- Claude Code 운영 설정
    ├── CLAUDE.md           <- 이 파일
    └── rules/              <- 콘텐츠 작성 규칙
```

---

## 디자인 토큰 사용 규칙

### 반드시 이렇게 한다

```typescript
// 토큰에서 가져온다
import { tokens } from "@/design/tokens";
import { useTheme } from "@/design/themes/useTheme";
import { useFormat } from "@/design/themes/useFormat";

const theme = useTheme("dark", "psychology");
const { safeArea, typeScale } = useFormat("longform");

// 색상
color: theme.textStrong;
backgroundColor: theme.bg;
borderColor: theme.lineSubtle;

// 타이포
fontSize: typeScale.headlineL; // 56
fontFamily: tokens.typography.fontFamily.sans;

// 간격
padding: `${tokens.spacing[6]}px`; // 24px
```

### 절대 하지 않는다

```typescript
color: "#F8F7F2"; // 하드코딩 금지
fontSize: 56; // 토큰 참조 없이 금지
padding: "24px"; // 금지
fontFamily: "Pretendard"; // 금지
spring({ stiffness: 100 }); // preset 없이 금지
```

### 모션 토큰 참조

```typescript
import motionPresets from "@/design/tokens/motion-presets.json";

// preset 사용
const config = motionPresets.presets.heavy.config;
spring(config);

// role 사용
const { translateY } = motionPresets.motionRoles.typography.architecturalReveal;
```

---

## 컴포넌트 사용 규칙

### 컴포넌트 계층

```
primitives  ->  layout / motion  ->  scenes  ->  compositions
```

- 상위 계층은 하위 계층을 import할 수 없다 (scenes -> primitives O, primitives -> scenes X)
- `compositions/`는 `scenes/`만 조립한다. 직접 primitive를 쓰지 않는다

### 필수 Props

모든 씬 컴포넌트는 아래 props를 반드시 받는다:

```typescript
interface BaseSceneProps {
  format: "longform" | "shorts"; // 절대 생략 금지
  theme: Theme;
  from: number;
  durationFrames: number;
}
```

### 컴포넌트 파일 구조

```typescript
// 1. import 순서: React -> Remotion -> 내부 tokens/types -> 내부 components
import React from 'react'
import { useCurrentFrame, interpolate } from 'remotion'
import { tokens } from '@/design/tokens'
import type { BaseSceneProps } from '@/types'

// 2. Props 타입 정의 (컴포넌트 파일 안에서)
interface KeyInsightSceneProps extends BaseSceneProps {
  content: KeyInsightContent
}

// 3. 컴포넌트 (named export, default export 둘 다)
export const KeyInsightScene: React.FC<KeyInsightSceneProps> = ({ format, theme, ... }) => {
  // 4. hooks 먼저
  const frame = useCurrentFrame()
  const { safeArea, typeScale } = useFormat(format)

  // 5. 애니메이션 계산
  // 6. 렌더
}

export default KeyInsightScene
```

---

## Animation Coding Convention

### 원칙

1. 모든 모션은 motion-presets.json의 preset에서 참조
2. 전환은 새 슬라이드 등장이 아니라 캔버스 위 시선 이동
3. 모든 enter 애니메이션은 from 기준 상대 프레임으로 계산
4. scale emphasis 최대 1.06 이하
5. Y 오프셋 최대 24px 이하

### 표준 enter 패턴

```typescript
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import motionPresets from "@/design/tokens/motion-presets.json";

const { fps } = useVideoConfig();
const frame = useCurrentFrame();

const enterProgress = spring({
  frame,
  fps,
  config: motionPresets.presets.heavy.config,
  durationInFrames: 36,
});

const opacity = interpolate(enterProgress, [0, 1], [0, 1]);
const translateY = interpolate(enterProgress, [0, 1], [22, 0]); // maxRevealYOffset = 24
```

### stagger 패턴

```typescript
const STAGGER = motionPresets.defaults.staggerFrames; // 3

items.map((item, i) => {
  const itemFrame = Math.max(0, frame - i * STAGGER);
  const progress = spring({
    frame: itemFrame,
    fps,
    config: presets.smooth.config,
  });
  // ...
});
```

### 금지 패턴

```typescript
spring({ frame, fps, config: { stiffness: 999, damping: 5, mass: 0.1 } }); // 임의 config
scale: interpolate(progress, [0, 1], [0, 2.5]); // 과한 scale
transform: `rotate(${Math.random() * 360}deg)`; // 랜덤 rotation
// full-screen shake, 파티클/불꽃 효과 금지
```

---

## Scene 작성 규칙

### 씬은 layout archetype 기반으로 조립한다

```
씬 타입         -> layout archetype
cover           -> center-focus
chapterDivider  -> left-anchor / band-divider
keyInsight      -> center-focus / top-anchor
compareContrast -> split-compare
quote           -> quote-hold
framework       -> grid-expand
application     -> map-flow / left-anchor
data            -> grid-expand / top-anchor
closing         -> center-focus / quote-hold
```

### 씬 레이어 zIndex 규칙

```
background:     0
texture:        5
grid (dev):     10
baseContent:    20
supportContent: 30
emphasis:       40
overlay:        50
annotation:     60
hud (subtitle): 70
transition:     80
globalOverlay:  90
```

### Shorts 분기 방법

```typescript
const { safeArea, typeScale } = useFormat(format);

// format에 따라 자동으로 올바른 값 반환
// 추가 분기가 필요한 경우만 명시
const maxItems = format === "shorts" ? 3 : 5;
const showSupportText = format === "longform";
```

### 씬 duration 처리

```typescript
// durationFrames는 항상 props로 받는다
// 씬 내부에서 하드코딩하지 않는다
// TTS가 있으면 pipeline/durationSync.ts가 자동 계산
// 없으면 scene-catalog.json의 durationFramesDefault 사용
```

---

## Schema Validation 규칙

### content JSON 작성 시

```bash
# 반드시 validate 먼저 실행
npm run validate -- content/books/my-book.json
```

통과 기준:

- scenes[0].type === 'cover'
- scenes[last].type === 'closing'
- scenes.length >= 3
- 모든 headline <= 60자
- framework items <= 5개
- application steps <= 4개

### schema 파일은 읽기 전용

```
src/schema/scene-catalog.json      <- 수정 금지
src/schema/content-schema.json     <- 수정 금지
src/schema/asset-manifest.json     <- 수정 금지
```

**예외:** `docs/specs/BEAT_SYSTEM_DESIGN_SPEC_v0.2.md`에 명시된 스키마 변경은
해당 문서의 section 4를 정확히 따르는 경우에 한해 Claude Code가 수행할 수 있다.

에셋 추가는 **사람이 직접** `asset-manifest.json`에 `status: "draft"` 항목을 수동 추가한 후 테스트 -> `"ready"` 승격 절차를 따른다. Claude Code는 이 파일을 수정할 수 없다.

---

## Import / Naming 규칙

### Import 순서

```typescript
// 1. React
import React, { useState } from "react";
// 2. Remotion
import { useCurrentFrame, spring, interpolate } from "remotion";
// 3. 외부 라이브러리
// 4. 내부 타입
import type { KeyInsightSceneProps } from "@/types";
// 5. 내부 토큰/테마
import { tokens } from "@/design/tokens";
import { useTheme } from "@/design/themes/useTheme";
// 6. 내부 컴포넌트 (하위 계층만)
import { TextBlock } from "@/components/primitives/TextBlock";
// 7. 에셋 (staticFile 사용)
import { staticFile } from "remotion";
```

### Naming 규칙

```
컴포넌트 파일:   PascalCase.tsx         (KeyInsightScene.tsx)
훅 파일:        camelCase.ts            (useTheme.ts)
JSON 스키마:    kebab-case.json         (scene-catalog.json)
타입 이름:      PascalCase              (BookContent, ThemeMode)
Props 타입:     컴포넌트명 + Props      (KeyInsightSceneProps)
훅 이름:        use + 동사/명사         (useTheme, useFormat)
상수:           UPPER_SNAKE_CASE        (MAX_ITEMS)
```

### Path Aliases

```typescript
// tsconfig.json paths
'@/*' -> 'src/*'
'@tokens' -> 'src/design/tokens/index.ts'
'@types' -> 'src/types/index.ts'
```

---

## QA 체크리스트 (빠른 참조)

> 상세: docs/specs/qa-checklist.md

### 빌드 전 체크

- [ ] `npm run validate` 통과
- [ ] 토큰 하드코딩 없음 (grep `#[0-9a-fA-F]{3,6}` in src/)
- [ ] `format` prop 누락 씬 없음
- [ ] 모든 이미지 `staticFile()` 경로 사용
- [ ] book.json 상단에 `"$schema": "../../src/schema/content-schema.json"` 선언됨
- [ ] (longform/both) 모든 headline <= 60자

### 렌더 후 체크

- [ ] 영상 길이 +/-5% 이내
- [ ] 자막 오버플로 없음 (28자/줄, 2줄 이하)
- [ ] 에셋 누락 -> fallback 정상 작동
- [ ] 씬 간 갭 없음 (from + durationFrames 연속성)

---

## Fallback 규칙

| 상황            | 구현 위치            | 처리                                                          |
| --------------- | -------------------- | ------------------------------------------------------------- |
| 이미지 누락     | `ImageMask.tsx`      | `onError` -> surfaceMuted 컬러 rect                           |
| 폰트 실패       | `typography.ts`      | `Pretendard -> Inter -> system-ui -> sans-serif`              |
| TTS 실패        | `ttsClient.ts`       | fish-audio → edge-tts → silent + 자막만                       |
| 텍스트 오버플로 | `TextBlock.tsx`      | 폰트 1단계 축소 -> `bodyS` 최소. 이후 말줄임표                |
| 아이콘 누락     | `IconWrapper.tsx`    | `visibility: hidden` (공간 보존)                              |
| 렌더 실패       | `render-longform.ts` | 3회 재시도 -> FAIL_FAST (process.exit(1)) + render-errors.log |
| 자막 길이 초과  | `subtitleGen.ts`     | 28자 강제 줄바꿈, 2줄 초과분 잘림                             |

---

## Asset Path Policy

### TTS 산출물 경로 규칙

**단일 진실 소스: `assets/tts/`**

| 파일      | 경로                        | git 여부  |
| --------- | --------------------------- | --------- |
| 오디오    | `assets/tts/{sceneId}.mp3`  | gitignore |
| 자막 JSON | `assets/tts/{sceneId}.json` | gitignore |
| manifest  | `assets/tts/manifest.json`  | gitignore |

**`remotion.config.ts`에 `Config.setPublicDir('assets')` 설정됨.**
따라서 `staticFile('tts/X')` = `assets/tts/X`.

### 금지 사항

- `public/tts/` 경로 사용 금지 (잘못된 경로)
- manifest에 `public/tts/` 문자열 포함 금지
- `*.mp3`를 git에 커밋하지 않는다 (재생성 보장이 정책)

### TTS 재생성 정책

TTS 산출물은 항상 재생성 가능해야 한다.

```bash
# 영상 전체 생성 (TTS 포함)
npm run make:video content/books/miracle-morning.json

# TTS/자막만 재생성
npm run tts content/books/miracle-morning.json
```

MP3가 없으면 `npm run make:video`가 자동 생성한다.
렌더 전 `qa-check.ts`가 asset 존재를 자동 검사한다.

### TTS 엔진

기본 TTS: Fish Audio S2-Pro (`FISH_API_KEY` + `FISH_VOICE_MODEL_ID` 환경변수 필요)
fallback: edge-tts → silent

환경변수:

- `FISH_API_KEY`: Fish Audio API 키
- `FISH_VOICE_MODEL_ID`: 클론된 목소리 model ID
- `TTS_ENGINE`: 강제 엔진 선택 (선택사항, `fish-audio` | `edge-tts` | `qwen3-tts`)

엔진 선택 우선순위:

1. `TTS_ENGINE` 환경변수
2. content JSON의 `narration.ttsEngine`
3. `FISH_API_KEY`가 있으면 fish-audio 자동 선택
4. edge-tts (최종 fallback)

**자막 타이밍:** Fish Audio STT API(`POST /v1/asr`)로 생성된 MP3를 분석하여
segment-level 타임스탬프를 얻는다. STT 실패 시 글자 수 비례 추정 fallback.

**한국어 감정 태그:** 씬 타입별 한국어 자연어 태그를 자동 삽입한다.
예: `[신나고 에너지 넘치는 목소리로]`, `[차분하고 자신감 있는 목소리로]` 등.
태그는 `src/tts/fish-audio-engine.ts`의 `SCENE_EMOTION_MAP`에서 관리.
content JSON에는 감정 태그를 넣지 않는다 (generate-captions.ts에서 자동 처리).

**temperature:** 씬 타입별 temperature 자동 적용 (0.5~0.85).
감정이 강한 씬(highlight: 0.85)은 높게, 설명 씬(chapterDivider: 0.5)은 낮게.
`SCENE_TEMPERATURE_MAP` + `getTemperatureForScene()`에서 관리.

**prosody.speed:** content JSON의 `narration.speed`가 Fish Audio `prosody.speed`로 매핑된다 (0.5~2.0).

---

## 금지 사항

### 디자인 관련

- 색상 hex 하드코딩
- px 수치 하드코딩 (spacing, fontSize)
- `spring()` config 임의 작성 (preset 필수)
- scale 1.06 초과 emphasis
- 씬당 accent 2개 초과
- 세리프 폰트를 body/headline에 사용 (quote/chapter accent 전용)

### 구조 관련

- `scenes/`에서 `compositions/` import
- `primitives/`에서 `scenes/` import
- schema 파일 직접 수정 (사람만 가능):
  - `src/schema/scene-catalog.json`
  - `src/schema/content-schema.json`
  - `src/schema/asset-manifest.json`
- composition 내부에서 직접 primitive 사용
- `durationFrames` 씬 내부 하드코딩 (항상 props로 받기)

### 모션 관련

- full-screen shake
- 파티클/불꽃 효과
- 랜덤 rotation
- SaaS-card choreography
- PPT식 push 전환
- 과한 bounce (preset.constraints 참조)

### 에셋 관련

- `staticFile()` 없이 에셋 경로 직접 사용
- license: "pending-check" 에셋을 ready로 처리
- 에셋 씬당 accent icon 3개 초과

---

## 비주얼 검증

- "검증", "비주얼 확인", "studio 확인" 시 visual-verify skill 자동 활성화
- 3계층: cmux 내장 브라우저(눈) + agent-browser(손) + Playwright MCP(현미경)

---

## 문서 참조 경로

| 분류        | 경로             | 내용                                                       |
| ----------- | ---------------- | ---------------------------------------------------------- |
| 시스템 스펙 | `docs/specs/`    | DSGS 정규 스펙, 오케스트레이션, Beat 시스템, QA 체크리스트 |
| 로드맵      | `docs/roadmap/`  | 로드맵 v5, 씬 리디자인 스펙                                |
| 과거 기록   | `docs/archive/`  | 완료된 정규화 패치, 초기 아키텍처, 구현 계획 등            |
| 콘텐츠 규칙 | `.claude/rules/` | content-authoring-rules.md, content-generation-contract.md |

### 주요 스펙 파일

- DSGS 정규 스펙: `docs/specs/DSGS_CANONICAL_SPEC_v1.md`
- 오케스트레이션: `docs/specs/DSGS_CLAUDE_CODE_ORCHESTRATION.md`
- Beat 시스템 설계: `docs/specs/BEAT_SYSTEM_DESIGN_SPEC_v0.2.md`
- Beat Composer: `docs/specs/BEAT_COMPOSER_AGENT_SKILL_DESIGN_v0.2.md`
- QA 체크리스트: `docs/specs/qa-checklist.md`

### 현재 로드맵

`docs/roadmap/NEXT_PHASE_ROADMAP_v5.md` 참조.
P0(자동화 엔진) -> P1(렌더 품질) -> P2(전문가급) 순서로 진행 중.

---

## Claude Code 세션 운영 팁

1. **세션 시작 시 반드시 이 파일(CLAUDE.md)을 먼저 읽는다**
2. **작업 전 `src/types/index.ts`를 참조해 타입을 확인한다**
3. **새 컴포넌트 작성 전 `scene-catalog.json`의 layers 정의를 확인한다**
4. **모션 작성 전 `motion-presets.json`의 preset을 확인한다**
5. **콘텐츠 JSON 작성 후 반드시 `npm run validate`를 실행한다**
6. **에러 발생 시 추측하지 말고 관련 schema/type 파일을 먼저 읽는다**
