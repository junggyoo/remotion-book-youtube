# CLAUDE.md — Editorial Signal Remotion Project

## DSGS (Dynamic Scene Generation System)

이 프로젝트는 동적 씬 생성 시스템으로 확장 중이다.

- 시스템 설계: docs/dsgs/DSGS_CANONICAL_SPEC_v1.md
- 오케스트레이션: docs/dsgs/DSGS_CLAUDE_CODE_ORCHESTRATION.md
  위 두 문서가 동적 씬 생성의 기준이다.

> **Claude Code가 이 프로젝트에서 작업할 때 반드시 먼저 읽는 파일이다.**
> 모든 규칙은 이 파일이 기준이다. 모르는 부분이 있으면 추측하지 말고 이 파일을 먼저 참조하라.

---

## 프로젝트 개요

**브랜드:** Editorial Signal  
**핵심 메타포:** Editorial Continuous Canvas  
**목적:** 한국어 책 요약 / 핵심 인사이트 YouTube 채널용 Remotion 영상 자동 생산 시스템  
**포맷:** Longform (1920×1080, 16:9) + Shorts (1080×1920, 9:16)  
**스택:** React + Remotion + TypeScript

**핵심 원칙 한 줄:**  
데이터(`content/books/*.json`)만 바꾸면 새 영상이 나오는 구조.  
디자인 결정은 이미 시스템에 들어있다. Claude Code는 그 시스템 안에서 조립한다.

---

## 디렉토리 구조

```
editorial-signal/
├── src/
│   ├── design/
│   │   ├── tokens/
│   │   │   ├── design-tokens-draft.json   ← 색·타이포·간격 단일 소스
│   │   │   ├── motion-presets.json        ← 모션 단일 소스
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
│   │   ├── primitives/     ← 원자 단위. TextBlock, LabelChip, DividerLine 등
│   │   ├── layout/         ← CanvasWrapper, SafeArea, SplitPanel
│   │   ├── motion/         ← ArchitecturalReveal, StaggerContainer 등
│   │   └── hud/            ← SubtitleLayer, ChapterIndicator
│   ├── scenes/             ← 씬 컴포넌트 9종
│   ├── compositions/       ← LongformComposition, ShortsComposition
│   ├── schema/             ← JSON 스키마 파일들 (읽기 전용)
│   ├── types/index.ts      ← TypeScript 타입 단일 소스
│   ├── pipeline/           ← validate, planScenes, buildProps, qa
│   └── tts/                ← ttsClient, durationSync, subtitleGen
├── content/books/          ← 책별 콘텐츠 JSON (여기를 채워서 영상 생산)
├── assets/                 ← icons, textures, covers, sounds
├── scripts/                ← CLI 명령 스크립트
├── src/schema/
│   ├── scene-catalog.json  ← 씬 시스템 규격 (읽기 전용)
│   ├── content-schema.json ← 콘텐츠 JSON 스키마 (읽기 전용)
│   └── asset-manifest.json ← 에셋 목록 및 규칙 (읽기 전용)
└── CLAUDE.md               ← 지금 이 파일
```

---

## 디자인 토큰 사용 규칙

### ✅ 반드시 이렇게 한다

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

### ❌ 절대 하지 않는다

```typescript
// 하드코딩 금지
color: "#F8F7F2"; // ❌
fontSize: 56; // ❌ (토큰 참조 없이)
padding: "24px"; // ❌
fontFamily: "Pretendard"; // ❌
spring({ stiffness: 100 }); // ❌ (preset 없이)
```

### 모션 토큰 참조

```typescript
import motionPresets from "@/design/tokens/motion-presets.json";

// preset 사용
const config = motionPresets.presets.heavy.config;
spring(config); // ✅

// role 사용
const { translateY } = motionPresets.motionRoles.typography.architecturalReveal;
```

---

## 컴포넌트 사용 규칙

### 컴포넌트 계층

```
primitives  →  layout / motion  →  scenes  →  compositions
```

- 상위 계층은 하위 계층을 import할 수 없다 (scenes → primitives ✅, primitives → scenes ❌)
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
// 1. import 순서: React → Remotion → 내부 tokens/types → 내부 components
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

```
1. 모든 모션은 motion-presets.json의 preset에서 참조
2. 전환은 새 슬라이드 등장이 아니라 캔버스 위 시선 이동
3. 모든 enter 애니메이션은 from 기준 상대 프레임으로 계산
4. scale emphasis 최대 1.06 이하
5. Y 오프셋 최대 24px 이하
```

### 표준 enter 패턴

```typescript
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import motionPresets from "@/design/tokens/motion-presets.json";

// ✅ preset에서 config 참조
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
// staggerFrames 토큰 참조
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
// ❌ 임의 spring config
spring({ frame, fps, config: { stiffness: 999, damping: 5, mass: 0.1 } });

// ❌ 과한 scale
scale: interpolate(progress, [0, 1], [0, 2.5]);

// ❌ 랜덤 rotation
transform: `rotate(${Math.random() * 360}deg)`;

// ❌ 화면 전체 shake
// ❌ 파티클/불꽃 효과
```

---

## Scene 작성 규칙

### 씬은 layout archetype 기반으로 조립한다

```
씬 타입         → layout archetype
cover           → center-focus
chapterDivider  → left-anchor / band-divider
keyInsight      → center-focus / top-anchor
compareContrast → split-compare
quote           → quote-hold
framework       → grid-expand
application     → map-flow / left-anchor
data            → grid-expand / top-anchor
closing         → center-focus / quote-hold
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
interface SomeSceneProps extends BaseSceneProps {
  // durationFrames는 BaseSceneProps에서 상속됨
}

// TTS가 있으면 pipeline/durationSync.ts가 자동 계산
// 없으면 scene-catalog.json의 durationFramesDefault 사용
```

---

## Schema Validation 규칙

### content JSON 작성 시

```typescript
// 반드시 validate 먼저 실행
npm run validate -- content/books/my-book.json

// 통과 기준 (qa-checklist.md 참조)
// - scenes[0].type === 'cover'
// - scenes[last].type === 'closing'
// - scenes.length >= 3
// - 모든 headline <= 60자
// - framework items <= 5개
// - application steps <= 4개
```

### schema 파일은 읽기 전용

```
src/schema/scene-catalog.json      ← 수정 금지
src/schema/content-schema.json     ← 수정 금지
src/schema/asset-manifest.json     ← 수정 금지
```

**예외:** `docs/dsgs/BEAT_SYSTEM_DESIGN_SPEC_v0.2.md`에 명시된 스키마 변경은 
해당 문서의 §4를 정확히 따르는 경우에 한해 Claude Code가 수행할 수 있다.
```

에셋 추가는 **사람이 직접** `asset-manifest.json`에 `status: "draft"` 항목을 수동 추가한 후 테스트 → `"ready"` 승격 절차를 따른다. Claude Code는 이 파일을 수정할 수 없다.

---

## Import / Naming / File 구조 규칙

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
'@/*' → 'src/*'
'@tokens' → 'src/design/tokens/index.ts'
'@types' → 'src/types/index.ts'
```

---

## 테스트 / QA 체크리스트

> **qa-checklist.md가 기준.** 아래는 개발 중 빠른 참조용 요약.

### 빌드 전 체크

- [ ] `npm run validate` 통과
- [ ] 토큰 하드코딩 없음 (grep `#[0-9a-fA-F]{3,6}` in src/)
- [ ] `format` prop 누락 씬 없음
- [ ] 모든 이미지 `staticFile()` 경로 사용
- [ ] book.json 상단에 `"$schema": "../../src/schema/content-schema.json"` 선언됨
- [ ] (longform/both) 모든 headline <= 60자

### 렌더 후 체크

- [ ] 영상 길이 ±5% 이내
- [ ] 자막 오버플로 없음 (28자/줄, 2줄 이하)
- [ ] 에셋 누락 → fallback 정상 작동
- [ ] 씬 간 갭 없음 (from + durationFrames 연속성)

### 전체 QA

```bash
npm run qa -- output/my-book-longform.mp4
```

---

## Fallback 규칙

모든 외부 의존 요소에 fallback을 구현한다.

| 상황            | 구현 위치            | 처리                                                         |
| --------------- | -------------------- | ------------------------------------------------------------ |
| 이미지 누락     | `ImageMask.tsx`      | `onError` → surfaceMuted 컬러 rect                           |
| 폰트 실패       | `typography.ts`      | `Pretendard → Inter → system-ui → sans-serif`                |
| TTS 실패        | `ttsClient.ts`       | silent + 자막만                                              |
| 텍스트 오버플로 | `TextBlock.tsx`      | 폰트 1단계 축소 → `bodyS` 최소. 이후 말줄임표                |
| 아이콘 누락     | `IconWrapper.tsx`    | `visibility: hidden` (공간 보존)                             |
| 렌더 실패       | `render-longform.ts` | 3회 재시도 → FAIL_FAST (process.exit(1)) + render-errors.log |
| 자막 길이 초과  | `subtitleGen.ts`     | 28자 강제 줄바꿈, 2줄 초과분 잘림                            |

---

## Asset Path Policy

### TTS 산출물 경로 규칙

**단일 진실 소스: `assets/tts/`**

| 파일      | 경로                        | git 여부     |
| --------- | --------------------------- | ------------ |
| 오디오    | `assets/tts/{sceneId}.mp3`  | ❌ gitignore |
| 자막 JSON | `assets/tts/{sceneId}.json` | ❌ gitignore |
| manifest  | `assets/tts/manifest.json`  | ❌ gitignore |

**`remotion.config.ts`에 `Config.setPublicDir('assets')` 설정됨.**
따라서 `staticFile('tts/X')` = `assets/tts/X`.

### 금지 사항

- ❌ `public/tts/` 경로 사용 금지 (잘못된 경로)
- ❌ manifest에 `public/tts/` 문자열 포함 금지
- ❌ `*.mp3`를 git에 커밋하지 않는다 (재생성 보장이 정책)

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

---

## 금지 사항

### 디자인 관련

- ❌ 색상 hex 하드코딩
- ❌ px 수치 하드코딩 (spacing, fontSize)
- ❌ `spring()` config 임의 작성 (preset 필수)
- ❌ scale 1.06 초과 emphasis
- ❌ 씬당 accent 2개 초과
- ❌ 세리프 폰트를 body/headline에 사용 (quote/chapter accent 전용)

### 구조 관련

- ❌ `scenes/`에서 `compositions/` import
- ❌ `primitives/`에서 `scenes/` import
- ❌ schema 파일 직접 수정 — Claude Code 수정 불가 (사람만):
  - `src/schema/scene-catalog.json`
  - `src/schema/content-schema.json`
  - `src/schema/asset-manifest.json`
- ❌ composition 내부에서 직접 primitive 사용
- ❌ `durationFrames` 씬 내부 하드코딩 (항상 props로 받기)

### 모션 관련

- ❌ full-screen shake
- ❌ 파티클/불꽃 효과
- ❌ 랜덤 rotation
- ❌ SaaS-card choreography
- ❌ PPT식 push 전환
- ❌ 과한 bounce (preset.constraints 참조)

### 에셋 관련

- ❌ `staticFile()` 없이 에셋 경로 직접 사용
- ❌ license: "pending-check" 에셋을 ready로 처리
- ❌ 에셋 씬당 accent icon 3개 초과

---

## Claude Code 세션 운영 팁

1. **세션 시작 시 반드시 이 파일(CLAUDE.md)을 먼저 읽는다**
2. **작업 전 `src/types/index.ts`를 참조해 타입을 확인한다**
3. **새 컴포넌트 작성 전 `scene-catalog.json`의 layers 정의를 확인한다**
4. **모션 작성 전 `motion-presets.json`의 preset을 확인한다**
5. **콘텐츠 JSON 작성 후 반드시 `npm run validate`를 실행한다**
6. **에러 발생 시 추측하지 말고 관련 schema/type 파일을 먼저 읽는다**
