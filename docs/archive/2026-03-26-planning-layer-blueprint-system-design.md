# Planning Layer + Blueprint System Design Spec

> **Status:** Approved
> **Date:** 2026-03-26
> **Scope:** 1차 구현 — atomic-habits 검증 케이스
> **Approach:** A (분리된 Planning Layer) + thin B (핵심 씬 2개 blueprint 렌더)

---

## 1. 목적

현재의 "scene template + content injection" 구조에 **planning layer**와 **blueprint 렌더 경로**를 점진적으로 도입한다.

**1차 목표:**

1. Planning 산출물 6종이 `generated/books/{book-id}/`에 안정적으로 저장되고 검증된다
2. atomic-habits의 핵심 씬 2개(`hook-01`, `framework-01`)가 custom blueprint로 렌더된다
3. 나머지 씬은 기존 Scene.tsx fallback으로 100% 유지된다
4. Planning 산출물이 없는 책은 기존 경로에 영향 없다

**1차 비목표 (2차 이후):**

- 전체 씬 blueprint화
- CLI 자동 생성 파이프라인
- surface theme override
- in-scene choreography 모션 고도화
- archetype library
- 런타임 fallback 분기 (fallbackPreset/fallbackContent 로직)

---

## 2. 핵심 원칙

1. **JSON이 source of truth**, MD는 human-readable mirror
2. **Storyboard가 핵심 중간 계약** — planning layer와 render layer의 경계
3. **Scene order의 source of truth는 content JSON** — storyboard는 partial planning override + renderMode/meta/QA용
4. **`targetDurationSeconds`는 1차에서 planning/QA 참조용** — 실제 render duration은 기존 TTS / `planScenes()` 체계가 결정
5. **Planning 산출물 없으면 기존 경로 100%** — 코드 변경으로 기존 책이 깨지면 안 됨
6. **파일 누락은 검증 단계에서 BLOCKED** — 런타임 fallback으로 덮지 않음
7. **기존 타입 재사용** — `src/types/index.ts`의 BookFingerprint, SceneBlueprint, SynthesizedBlueprint 등 중복 정의 금지
8. **`sceneId`는 전체 planning layer의 공통 연결 키**

---

## 3. 폴더 구조

```
remotion-book-youtube/
├── generated/                              ← NEW: planning 산출물 루트
│   └── books/
│       └── {book-id}/                      ← 예: atomic-habits/
│           ├── 00-fingerprint.json
│           ├── 01-editorial-outline.json
│           ├── 01-editorial-outline.md     ← auto-generated mirror
│           ├── 02-art-direction.json
│           ├── 02-art-direction.md
│           ├── 03-storyboard.json          ← 핵심 중간 계약
│           ├── 03-storyboard.md
│           ├── 04-asset-inventory.json
│           ├── 05-motion-plan.json
│           ├── 06-blueprints/
│           │   ├── hook-01.blueprint.json
│           │   └── framework-01.blueprint.json
│           └── .validation/
│               ├── schema.json
│               ├── duration.json
│               ├── assets.json
│               ├── blueprints.json
│               └── quality-gate.json
│
├── src/
│   ├── planning/                           ← NEW: planning layer 코드
│   │   ├── types.ts                        ← planning 전용 신규 타입만
│   │   ├── schemas.ts                      ← Zod 스키마 (planning 산출물 검증)
│   │   ├── plan-bridge.ts                  ← planning <-> render 경계
│   │   ├── theme-resolver.ts               ← brand core + book overrides 합성
│   │   ├── blueprint-resolver.ts           ← sceneId -> blueprint 조회
│   │   ├── loaders/
│   │   │   ├── load-book-plan.ts           ← generated/ 읽기
│   │   │   └── save-book-plan.ts           ← generated/ 쓰기 + md mirror
│   │   ├── validators/
│   │   │   ├── validate-fingerprint.ts
│   │   │   ├── validate-outline.ts
│   │   │   ├── validate-art-direction.ts
│   │   │   ├── validate-storyboard.ts      ← 교차 검증 (핵심)
│   │   │   ├── validate-duration.ts        ← 시간 예산 검증
│   │   │   ├── validate-assets.ts
│   │   │   ├── validate-blueprints.ts
│   │   │   └── validate-quality-gate.ts
│   │   └── index.ts                        ← barrel export
│   │
│   ├── design/themes/
│   │   └── resolveBaseTheme.ts             ← NEW: 순수 theme factory (hook 분리)
│   │
│   ├── pipeline/
│   │   └── buildProps.ts                   ← 수정: resolvePlanBridge() 호출
│   │
│   ├── compositions/
│   │   └── LongformComposition.tsx         ← 수정: blueprint 가드 추가
│   │
│   └── types/index.ts                      ← 수정: PlannedSceneWithBlueprint 타입
│
├── content/books/                          ← 기존 유지 (변경 없음)
│   └── atomic-habits.json
│
└── scripts/
    └── validate-plan.ts                    ← NEW: planning 검증 CLI
```

---

## 4. 타입 정의

### 4-1. `src/planning/types.ts` — Planning 전용 신규 타입

기존 `src/types/index.ts`의 타입을 **import하여 재사용**한다. 중복 정의 금지.

```typescript
// 기존 타입 재사용
import type {
  BookFingerprint,
  SceneBlueprint,
  SynthesizedBlueprint,
  BookContent,
  GenreKey,
  FormatKey,
  SceneType,
  TypedScene,
  MotionPresetKey,
  ThemeMode,
  Theme,
} from "@/types";

// ============================================================
// 01. Editorial Outline
// ============================================================
export interface EditorialOutline {
  bookId: string;
  oneLiner: string;
  targetAudience: string;
  hookAngle: string;
  coreMessages: string[]; // 3~5개
  excludedTopics: string[];
  targetDurationSeconds: number;
  toneKeywords: string[];
  narrativeArc:
    | "linear"
    | "problem-solution"
    | "transformation"
    | "framework-driven";
}

// ============================================================
// 02. Book Art Direction
// ============================================================
export interface BookArtDirection {
  bookId: string;
  palette: {
    primary: string; // hex
    secondary: string; // hex
    contrast: "high" | "medium" | "low";
  };
  signalColor: string; // hex
  shapeLanguage: "geometric" | "organic" | "angular" | "minimal" | "mixed";
  textureMood: "grain" | "clean" | "paper" | "noise" | "none";
  visualMetaphors: Array<{
    concept: string;
    metaphor: string;
    usage: string;
  }>;
  layoutBias: "centered" | "asymmetric" | "grid-heavy" | "flow";
  motionCharacter: "precise" | "fluid" | "weighted" | "snappy";
  typographyMood: "editorial" | "technical" | "warm" | "bold";
}

// ============================================================
// 03. Storyboard (핵심 중간 계약)
// ============================================================
export interface StoryboardPlan {
  bookId: string;
  totalScenes: number;
  estimatedDurationSeconds: number;
  scenes: StoryboardScene[];
}

export interface StoryboardScene {
  sceneId: string; // content JSON의 scene.id와 반드시 일치
  order: number;
  purpose: string;
  narrativeGoal: string;
  visualFunction: VisualFunction;
  visualIntent: string;
  layoutMode: string;
  targetDurationSeconds: number; // planning/QA 참조용. 실제 duration은 TTS가 결정
  onScreenText: string[];
  /** 이 씬 → 다음 씬 전환 의도. 실제 transition 구현은 composition 레벨에서 소비 */
  transitionIntent: "cut" | "fade" | "directional" | "morph";

  // blueprint 연결
  renderMode: "preset" | "blueprint";
  presetSceneType?: SceneType; // renderMode=preset일 때 필수
  blueprintId?: string; // renderMode=blueprint일 때 필수. sceneId와 동일 (1차)
}

export type VisualFunction =
  | "hook"
  | "explain"
  | "compare"
  | "reveal-relation"
  | "process"
  | "evidence"
  | "compress-recap"
  | "transition"
  | "framework"
  | "quote"
  | "data";

// ============================================================
// 04. Asset Inventory
// ============================================================
export interface AssetInventory {
  bookId: string;
  required: AssetRequirement[];
  reusable: string[];
}

export interface AssetRequirement {
  id: string;
  type: "svg" | "icon" | "diagram" | "texture" | "cover";
  description: string;
  usedInScenes: string[]; // sceneId 참조
  status: "needed" | "placeholder" | "ready";
  fallbackStrategy: "text-only" | "shape-placeholder" | "generic-library";
}

// ============================================================
// 05. Motion Plan
// ============================================================
export interface MotionPlan {
  bookId: string;
  globalMotionCharacter: MotionPresetKey;
  sceneMotions: SceneMotionPlan[];
}

export interface SceneMotionPlan {
  sceneId: string; // content JSON의 scene.id와 일치
  choreographyType:
    | "sequential-reveal"
    | "accumulation"
    | "comparison-shift"
    | "orbit"
    | "compression"
    | "cascade"
    | "standard-stagger";
  inSceneLoops: boolean;
  activeStateBehavior: "dim-others" | "scale-focus" | "none";
  motionPresetOverride?: MotionPresetKey;
  notes: string;
}

// ============================================================
// Theme Resolver
// ============================================================
export interface BookThemeOverrides {
  signalColor?: string;
  accentColor?: string; // artDirection.palette.primary
  motionCharacter?: BookArtDirection["motionCharacter"];
  // 1차: signal + accent only. surface override는 2차로 보류.
}

// ============================================================
// Plan Bridge
// ============================================================
export interface BookPlan {
  fingerprint: BookFingerprint;
  outline: EditorialOutline;
  artDirection: BookArtDirection;
  storyboard: StoryboardPlan;
  assetInventory: AssetInventory;
  motionPlan: MotionPlan;
  blueprints: Record<string, SceneBlueprint>; // JSON serializable (generated/ SOT)
}

export interface ResolvedScene {
  sceneId: string;
  renderMode: "preset" | "blueprint";
  presetScene?: TypedScene;
  blueprint?: SceneBlueprint;
  order: number;
  targetDurationSeconds: number;
  storyboardEntry?: StoryboardScene; // optional: planning 없는 fallback 경로
}

export interface PlanBridgeResult {
  bookId: string;
  theme: Theme;
  resolvedScenes: ResolvedScene[];
  hasPlan: boolean;
}

// ============================================================
// Validation
// ============================================================
export type ValidationPhase =
  | "schema"
  | "duration"
  | "assets"
  | "blueprints"
  | "quality-gate";

export interface ValidationResult {
  phase: ValidationPhase;
  status: "pass" | "warn" | "fail";
  timestamp: string;
  checks: ValidationCheck[];
}

export interface ValidationCheck {
  id: string;
  level: "BLOCKED" | "WARN" | "INFO";
  passed: boolean;
  message: string;
  sceneId?: string; // sceneId 기준 참조
  context?: Record<string, unknown>;
}
```

### 4-2. `src/types/index.ts` 추가 — PlannedSceneWithBlueprint

```typescript
// 기존 PlannedScene에 blueprint 메타를 intersection으로 추가
export type PlannedSceneWithBlueprint = PlannedScene & {
  _blueprint?: SceneBlueprint;
  _storyboard?: StoryboardScene;
};
```

---

## 5. 핵심 모듈 설계

### 5-1. `plan-bridge.ts` — Planning <-> Render 경계

**역할:** planning 산출물을 로드하고, storyboard의 `renderMode`에 따라 각 씬을 preset/blueprint로 분류한다.

**공개 인터페이스:** `resolvePlanBridge()` 단일 진입점

**동작:**

1. `loadBookPlan(bookId)` 호출 — `generated/books/{bookId}/`에서 산출물 로드
2. 산출물 없으면 `hasPlan: false` → 기존 경로 100% (content JSON scene order 유지)
3. 산출물 있으면:
   - `resolveBookTheme()`으로 book override 적용된 theme 생성
   - content JSON의 scene order를 source of truth로 유지
   - 각 scene에 대해 storyboard에 매칭되면 `renderMode` 적용
   - storyboard에 없는 scene은 자동으로 `renderMode: 'preset'` 처리
4. `renderMode=blueprint`인 씬은 `resolveBlueprint()`로 blueprint 로드

**핵심 규칙:**

- Scene 순서 결정: content JSON (변경 없음)
- Storyboard는 **partial overlay**: 명시된 sceneId만 planning meta 적용
- Storyboard에 없는 scene → 자동 preset fallback (기존 Scene.tsx)

### 5-2. `theme-resolver.ts` — Brand Core + Book Overrides 합성

**합성 계층:**

```
Layer 1: Brand Core (resolveBaseTheme)
  bg, textStrong, textMuted, lineSubtle, premium ← 고정

Layer 2: Genre Variant (기존)
  accent = genreVariants[genre] ← genre별

Layer 3: Book Overrides (1차 범위)
  signal <- artDirection.signalColor (있으면)
  accent <- artDirection.palette.primary (있으면)
  나머지 필드 <- Layer 1~2 유지
```

**구현:** `resolveBaseTheme(mode, genre)` 순수 함수를 `src/design/themes/resolveBaseTheme.ts`에 분리. React hook 규칙 위반 방지.

**Theme 함수 사용 규칙:**

- `resolveBaseTheme()` — `src/planning/`, `src/pipeline/`, resolver 계층에서 사용 (순수 함수)
- `useTheme()` — `src/scenes/`, `src/compositions/` 등 React 컴포넌트 내부에서만 사용 (hook)
- 두 함수는 동일한 Theme 객체를 반환하되, 호출 컨텍스트가 다름

**1차 제한:** signal + accent override만. surface override는 2차.

### 5-3. `blueprint-resolver.ts` — SceneId 기준 Blueprint 조회

**1차 구현:** 단순 파일 조회만.

```
resolveBlueprint(bookId, blueprintId)
  → generated/books/{bookId}/06-blueprints/{blueprintId}.blueprint.json
  → 파일 없으면 throw Error (fail-fast)
```

**Future:** 자동 추천, archetype 매칭 등으로 확장 가능.

### 5-4. `buildProps.ts` 변경

기존 로직 유지. 추가 ~20줄:

1. `resolvePlanBridge()` 호출
2. `hasPlan=true`이면 theme을 book overrides 버전으로 교체
3. planned scenes에 `_blueprint`, `_storyboard` 메타 첨부 (해당 씬만)

### 5-5. `LongformComposition.tsx` 변경

SceneRenderer의 기존 switch문 **앞에** blueprint 가드 추가 (~10줄):

```
if (scene._blueprint) → BlueprintRenderer
else → 기존 switch(scene.type) 그대로
```

기존 14개 scene 분기는 한 줄도 삭제하지 않음.

---

## 6. SceneId Naming Convention

`sceneId`는 전체 planning layer의 **공통 연결 키**이다.

| 위치                               | sceneId 사용                             |
| ---------------------------------- | ---------------------------------------- |
| `content/books/atomic-habits.json` | `scenes[].id` ← 원본 정의                |
| `03-storyboard.json`               | `scenes[].sceneId` ← content와 일치 필수 |
| `05-motion-plan.json`              | `sceneMotions[].sceneId` ← 일치 필수     |
| `04-asset-inventory.json`          | `required[].usedInScenes[]` ← 일치 필수  |
| `06-blueprints/` 파일명            | `{sceneId}.blueprint.json`               |
| storyboard `blueprintId`           | 1차에서는 sceneId와 동일                 |
| `.validation/` 결과                | `checks[].sceneId`로 참조                |

**Atomic-habits 실제 scene IDs:**

| sceneId            | type            | 1차 renderMode |
| ------------------ | --------------- | -------------- |
| `hook-01`          | highlight       | **blueprint**  |
| `cover-01`         | cover           | preset         |
| `insight-compound` | keyInsight      | preset         |
| `chapter-01`       | chapterDivider  | preset         |
| `framework-01`     | framework       | **blueprint**  |
| `insight-identity` | keyInsight      | preset         |
| `compare-01`       | compareContrast | preset         |
| `application-01`   | application     | preset         |
| `quote-01`         | quote           | preset         |
| `insight-recap`    | keyInsight      | preset         |
| `closing-01`       | closing         | preset         |

---

## 7. Storyboard: 핵심 중간 계약

### 7-1. 역할

```
[Planning Layer]                [Render Layer]

fingerprint                     content JSON (scene order = SOT)
  -> outline                         |
    -> artDirection                   |
                                     v
        storyboard.json -----> plan-bridge.ts
              |                      |
              v                      v
        renderMode 분류          buildProps.ts
          |        |                 |
          v        v                 v
       preset   blueprint     LongformComposition
         |        |                 |
         v        v                 v
    Scene.tsx  BlueprintRenderer  SceneRenderer
```

### 7-2. Partial Overlay 규칙

- Storyboard에 명시된 `sceneId` → planning meta + renderMode 적용
- Content JSON에만 있고 storyboard에 없는 scene → 자동으로 `renderMode: 'preset'`
- Storyboard에 있는데 content JSON에 없는 `sceneId` → `validate-storyboard`에서 BLOCKED

### 7-3. Duration 역할 분리

| 필드                                        | 역할                      | Source of Truth |
| ------------------------------------------- | ------------------------- | --------------- |
| `storyboard.scenes[].targetDurationSeconds` | Planning/QA 참조용 추정치 | storyboard      |
| `scene.durationFrames` (content JSON)       | TTS 없는 씬의 기본값      | content JSON    |
| TTS 결과 `durationFrames`                   | 실제 render duration      | TTS pipeline    |
| `planScenes()` resolved duration            | 최종 렌더 프레임 수       | pipeline (기존) |

1차에서 `targetDurationSeconds`는 `validate-duration`의 QA 비교 대상이며, 렌더에 직접 영향을 주지 않는다.

---

## 8. Validation 시스템

### 8-1. Phase 구조와 Validator 매핑

| Phase          | Validator 파일                                                                                             | .validation/ 출력   |
| -------------- | ---------------------------------------------------------------------------------------------------------- | ------------------- |
| `schema`       | `validate-fingerprint.ts` + `validate-outline.ts` + `validate-art-direction.ts` + `validate-storyboard.ts` | `schema.json`       |
| `duration`     | `validate-duration.ts`                                                                                     | `duration.json`     |
| `assets`       | `validate-assets.ts`                                                                                       | `assets.json`       |
| `blueprints`   | `validate-blueprints.ts`                                                                                   | `blueprints.json`   |
| `quality-gate` | `validate-quality-gate.ts`                                                                                 | `quality-gate.json` |

`schema` phase는 4개 validator의 결과를 합산하여 `schema.json`에 저장한다.

### 8-2. 각 Validator 상세

#### `validate-fingerprint.ts`

- [BLOCKED] `genre`가 유효한 GenreKey
- [BLOCKED] `hookStrategy` 비어있지 않음
- [WARN] `visualMotifs` 1개 이상

#### `validate-outline.ts`

- [BLOCKED] `targetDurationSeconds` > 0
- [BLOCKED] `coreMessages` 1~7개
- [BLOCKED] `oneLiner` 비어있지 않음
- [WARN] `toneKeywords` 1개 이상

#### `validate-art-direction.ts`

- [BLOCKED] `palette.primary`, `palette.secondary`가 유효 hex
- [BLOCKED] `signalColor`가 유효 hex
- [BLOCKED] `shapeLanguage`가 허용 enum 내
- [WARN] `visualMetaphors` 1개 이상

#### `validate-storyboard.ts` (교차 검증 핵심)

- [BLOCKED] storyboard의 모든 `sceneId`가 content JSON의 `scene.id`에 존재 (fail-fast)
- [BLOCKED] `renderMode=preset` → `presetSceneType` 필수
- [BLOCKED] `renderMode=blueprint` → `blueprintId` 필수
- [BLOCKED] `blueprintId`가 있으면 `06-blueprints/{blueprintId}.blueprint.json` 존재
- [BLOCKED] scene order가 0부터 연속 (gap 없음)
- [WARN] `estimatedDurationSeconds` vs `outline.targetDurationSeconds` +-20%
- [WARN] `renderMode=blueprint` 씬 수 <= 3 (1차 제한)
- [INFO] content에만 있고 storyboard에 없는 scene 목록 (자동 preset fallback)
- [INFO] renderMode별 씬 수 요약

#### `validate-duration.ts`

- [WARN] storyboard 전체 `targetDurationSeconds` 합산 vs `outline.targetDurationSeconds` +-20%
- [WARN] 개별 씬 `targetDurationSeconds` < 3초 또는 > 120초
- [INFO] 씬별 예상 글자수 (CPS 기반 추정)

#### `validate-assets.ts`

- [WARN] `status: 'needed'` 에셋이 있으면 경고
- [INFO] 에셋 상태별 카운트

#### `validate-blueprints.ts`

- [BLOCKED] 각 blueprint JSON이 SceneBlueprint Zod 스키마 통과
- [BLOCKED] `blueprint.mediaPlan` 존재 (DSGS 절대 규칙)
- [BLOCKED] `blueprint.id` === 파일명 (일관성)
- [WARN] blueprint가 참조하는 element type이 VCLElementType 내인지
- [WARN] SynthesizedBlueprint의 `fallbackPreset`이 유효한 SceneType인지

#### `validate-quality-gate.ts` (1차 최소)

- [INFO] blueprint 씬 수 / 전체 씬 수 비율
- [INFO] planning 산출물 완성도 (6개 중 몇 개 존재)
- [WARN] art direction이 있는데 blueprint가 0개면 경고

### 8-3. CLI 진입점

```bash
npx ts-node scripts/validate-plan.ts generated/books/atomic-habits

# 출력 예시:
# [schema]       PASS  (fingerprint: 3/3, outline: 4/4, art-direction: 4/4, storyboard: 9/9)
# [duration]     PASS  (estimated: 295s, target: 300s, deviation: 1.7%)
# [assets]       WARN  (2 assets status=needed)
# [blueprints]   PASS  (2/2 valid, mediaPlan present)
# [quality-gate] INFO  (2/11 blueprint, 6/6 planning docs)
#
# Results saved to generated/books/atomic-habits/.validation/
```

---

## 9. Fallback 전략 (2단계 분리)

### 9-1. 검증 단계 Fallback (fail-fast)

파일 누락, 스키마 불일치, ID 불일치는 **검증 단계에서 BLOCKED**로 처리한다. 런타임 fallback으로 덮지 않는다.

| 상황                           | 처리                                     | 단계 |
| ------------------------------ | ---------------------------------------- | ---- |
| Blueprint 파일 누락            | BLOCKED (validate-storyboard)            | 검증 |
| Blueprint 스키마 불일치        | BLOCKED (validate-blueprints)            | 검증 |
| SceneId 불일치                 | BLOCKED, fail-fast (validate-storyboard) | 검증 |
| Storyboard에 없는 sceneId 참조 | BLOCKED (validate-storyboard)            | 검증 |
| mediaPlan 누락                 | BLOCKED (validate-blueprints)            | 검증 |

### 9-2. 런타임 단계 — 1차는 fail-fast

1차에서는 검증 통과 후 blueprint 로드 성공 뒤 렌더 중 문제가 나면 **fail-fast**로 처리한다.

| 상황                        | 1차 처리                            | 비고                               |
| --------------------------- | ----------------------------------- | ---------------------------------- |
| BlueprintRenderer 렌더 에러 | fail-fast (렌더 중단)               | 검증 통과했으므로 코드 버그로 간주 |
| 에셋 로드 실패              | 기존 ImageMask/IconWrapper fallback | 기존 fallback 메커니즘 유지        |

**`fallbackPreset`, `fallbackContent`는 타입에 유지하되 실제 분기 로직은 2차에서 구현한다.**

- `SynthesizedBlueprint` 타입의 `fallbackPreset?`, `fallbackContent?` 필드는 그대로 존재
- BlueprintRenderer에서 이 필드를 읽어 graceful degradation하는 로직은 2차 범위

### 9-3. Planning 없는 책 (완전 기존 경로)

```
resolvePlanBridge() → hasPlan: false
  → theme: resolveBaseTheme(mode, genre) 결과
  → resolvedScenes: content JSON 순서 그대로, 전부 renderMode: 'preset'
  → LongformComposition: 기존 SceneRenderer switch문 100%
```

---

## 10. 1차 구현 파일 목록

### 10-1. 신규 파일 (17개)

| #   | 파일                                                | 역할                        | 복잡도 |
| --- | --------------------------------------------------- | --------------------------- | ------ |
| 1   | `src/planning/types.ts`                             | Planning 전용 타입          | 중     |
| 2   | `src/planning/schemas.ts`                           | Zod 스키마 (6개 산출물)     | 중     |
| 3   | `src/planning/plan-bridge.ts`                       | Planning <-> Render 경계    | 중     |
| 4   | `src/planning/theme-resolver.ts`                    | Brand + Book override 합성  | 소     |
| 5   | `src/planning/blueprint-resolver.ts`                | sceneId -> blueprint 조회   | 소     |
| 6   | `src/planning/loaders/load-book-plan.ts`            | generated/ 읽기             | 소     |
| 7   | `src/planning/loaders/save-book-plan.ts`            | generated/ 쓰기 + md mirror | 중     |
| 8   | `src/planning/validators/validate-fingerprint.ts`   |                             | 소     |
| 9   | `src/planning/validators/validate-outline.ts`       |                             | 소     |
| 10  | `src/planning/validators/validate-art-direction.ts` |                             | 소     |
| 11  | `src/planning/validators/validate-storyboard.ts`    | 교차 검증 핵심              | 중     |
| 12  | `src/planning/validators/validate-duration.ts`      | 시간 예산 검증              | 소     |
| 13  | `src/planning/validators/validate-assets.ts`        | 에셋 상태 검증              | 소     |
| 14  | `src/planning/validators/validate-blueprints.ts`    | Blueprint 일관성            | 중     |
| 15  | `src/planning/validators/validate-quality-gate.ts`  | 1차 최소                    | 소     |
| 16  | `src/planning/index.ts`                             | barrel export               | 소     |
| 17  | `scripts/validate-plan.ts`                          | CLI 검증 진입점             | 소     |

### 10-2. 수정 파일 (3개)

| #   | 파일                                       | 변경                             | 범위       |
| --- | ------------------------------------------ | -------------------------------- | ---------- |
| 1   | `src/pipeline/buildProps.ts`               | `resolvePlanBridge()` 호출       | ~20줄 추가 |
| 2   | `src/compositions/LongformComposition.tsx` | SceneRenderer blueprint 가드     | ~10줄 추가 |
| 3   | `src/types/index.ts`                       | `PlannedSceneWithBlueprint` 타입 | ~15줄 추가 |

### 10-3. 신규 인프라 파일 (1개)

| #   | 파일                                    | 역할                           |
| --- | --------------------------------------- | ------------------------------ |
| 1   | `src/design/themes/resolveBaseTheme.ts` | 순수 theme factory (hook 분리) |

### 10-4. 생성 산출물 — atomic-habits (11개)

| #   | 파일                                                                      | 생성 주체             |
| --- | ------------------------------------------------------------------------- | --------------------- |
| 1   | `generated/books/atomic-habits/00-fingerprint.json`                       | Claude Code           |
| 2   | `generated/books/atomic-habits/01-editorial-outline.json`                 | Claude Code           |
| 3   | `generated/books/atomic-habits/01-editorial-outline.md`                   | save-book-plan (auto) |
| 4   | `generated/books/atomic-habits/02-art-direction.json`                     | Claude Code           |
| 5   | `generated/books/atomic-habits/02-art-direction.md`                       | save-book-plan (auto) |
| 6   | `generated/books/atomic-habits/03-storyboard.json`                        | Claude Code           |
| 7   | `generated/books/atomic-habits/03-storyboard.md`                          | save-book-plan (auto) |
| 8   | `generated/books/atomic-habits/04-asset-inventory.json`                   | Claude Code           |
| 9   | `generated/books/atomic-habits/05-motion-plan.json`                       | Claude Code           |
| 10  | `generated/books/atomic-habits/06-blueprints/hook-01.blueprint.json`      | Claude Code           |
| 11  | `generated/books/atomic-habits/06-blueprints/framework-01.blueprint.json` | Claude Code           |

---

## 11. 구현 순서 (의존 관계 기반)

```
Phase 1: 타입 + 스키마 (의존성 없음)
  (1) src/planning/types.ts
  (2) src/planning/schemas.ts
  (3) src/types/index.ts 수정 (PlannedSceneWithBlueprint)

Phase 2: 인프라 (Phase 1 의존)
  (4) src/design/themes/resolveBaseTheme.ts
  (5) src/planning/loaders/load-book-plan.ts
  (6) src/planning/loaders/save-book-plan.ts
  (7) src/planning/theme-resolver.ts
  (8) src/planning/blueprint-resolver.ts

Phase 3: Bridge + Integration (Phase 2 의존)
  (9) src/planning/plan-bridge.ts
  (10) src/pipeline/buildProps.ts 수정
  (11) src/compositions/LongformComposition.tsx 수정

Phase 4: Validation (Phase 1~2 의존, Phase 3와 병렬 가능)
  (12~17) validators 8개 + scripts/validate-plan.ts
  (18) src/planning/index.ts (barrel)

Phase 5: 산출물 생성 + 검증 (Phase 1~4 완료 후)
  (19) atomic-habits planning docs 생성 (Claude Code 대화형)
  (20) hook-01 + framework-01 blueprint 생성
  (21) validate-plan 실행 → .validation/ 결과 확인
  (22) render 실행 → 비교 검증
```

---

## 12. Atomic-Habits 1차 검증 워크플로우

```
Claude Code 생성 -> validate-plan -> 수정 -> 재검증 -> render
```

### Step 1: Planning 생성

Claude Code가 atomic-habits 원본 분석 후 6개 planning 산출물 생성.
`save-book-plan.ts`가 JSON 저장 + MD mirror 자동 생성.

### Step 2: Planning 검증

```bash
npx ts-node scripts/validate-plan.ts generated/books/atomic-habits
```

BLOCKED 항목 → Claude Code가 수정 → 재검증 반복.

### Step 3: 기존 Content 검증 (변경 없음)

```bash
npm run validate -- content/books/atomic-habits.json
```

### Step 4: Render

```bash
npm run make:video content/books/atomic-habits.json
```

buildProps 내부:

1. `resolvePlanBridge()` → `hasPlan: true`
2. Theme에 book overrides 적용 (signal + accent)
3. `hook-01` → `_blueprint` 첨부
4. `framework-01` → `_blueprint` 첨부
5. 나머지 9개 씬 → 기존 경로

### Step 5: 비교 검증

- Planning 없이 렌더한 영상 vs planning 있이 렌더한 영상
- `hook-01` 씬: BlueprintRenderer 경로 (시각적 차이 확인)
- `framework-01` 씬: BlueprintRenderer 경로 (시각적 차이 확인)
- 나머지 9개 씬: theme override (signal/accent)만 달라짐
- 전체 영상 길이 변화 없음 (TTS가 duration source of truth)

---

## 13. 1차 구현 후 검증 체크리스트

### 코드 검증

- [ ] `npm run validate -- content/books/atomic-habits.json` 기존 통과
- [ ] `npx ts-node scripts/validate-plan.ts generated/books/atomic-habits` 전체 통과
- [ ] Planning 없는 책 (miracle-morning 등) 기존 렌더 동일 작동

### 렌더 검증

- [ ] atomic-habits longform 렌더 성공
- [ ] `hook-01` 씬이 BlueprintRenderer 경로로 렌더됨
- [ ] `framework-01` 씬이 BlueprintRenderer 경로로 렌더됨
- [ ] 나머지 9개 씬이 기존 Scene.tsx로 정상 렌더됨
- [ ] Theme override (signal/accent) 색상이 전체 씬에 적용됨
- [ ] 전체 영상 길이가 기존과 +-5% 이내

### Fallback 검증

- [ ] `generated/books/atomic-habits/` 삭제 후 렌더 → 기존과 동일
- [ ] Blueprint 파일 1개 삭제 후 `validate-plan` → BLOCKED 에러
- [ ] Storyboard에 없는 sceneId 추가 → fail-fast 에러

### 산출물 검증

- [ ] 6개 planning JSON 모두 스키마 통과
- [ ] MD mirror가 JSON과 내용 일치
- [ ] `.validation/` 결과 파일 5개 존재
- [ ] git diff: `generated/` 폴더에만 변경, `src/` 변경은 최소

---

## 14. 2차 이후 확장 방향

| 항목            | 2차                         | 3차+                                        |
| --------------- | --------------------------- | ------------------------------------------- |
| Blueprint 씬 수 | 3~5개                       | 전체 가능                                   |
| Theme override  | surface, textureMood 추가   | shapeLanguage → component 분기              |
| Motion          | choreography preset         | in-scene loops, active/dimmed states        |
| Asset           | placeholder → SVG 자동 생성 | AI 이미지 생성 연동                         |
| Generator       | Claude Code 대화형          | CLI 자동화 (npm run plan)                   |
| Archetype       | 없음                        | habits, psychology, business 등 starter kit |
| Storyboard      | partial overlay             | full scene order control                    |
