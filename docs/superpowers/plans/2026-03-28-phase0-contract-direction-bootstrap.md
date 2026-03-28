# Phase 0: Contract First + Direction Bootstrap — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 프리셋 생산 경로를 유지한 채, 모든 씬이 SceneSpec과 DirectionProfile을 통과하도록 만든다. 동일 preset이라도 direction 차이로 시각적 변주가 재현되어야 한다.

**Architecture:** 5-Layer 아키텍처의 타입 계약(SceneSpec, DirectionProfile, SceneFamily)을 먼저 정의하고, PresetAdapter로 기존 9개 프리셋을 새 계약으로 변환한다. Interpretation Layer는 heuristic bootstrap 수준(genre→direction, structure→family)으로 제한한다.

**Tech Stack:** TypeScript 5, Remotion 4, Vitest, Zod

**Spec:** `docs/superpowers/specs/2026-03-28-editorial-motion-system-design.md`

**완료 조건:** 모든 기존 preset scene이 SceneSpec으로 변환되고, 최소 2개 이상의 direction profile 차이를 실제 렌더 결과로 확인할 수 있어야 한다.

---

## File Structure

### 새로 생성하는 파일

| File                                                      | Responsibility                                                                                                           |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `src/direction/types.ts`                                  | SceneFamily, DirectionProfileName, DirectionParams, DirectionProfile, SceneSpec, CompositionPath, GapCandidate 타입 정의 |
| `src/direction/profiles.ts`                               | 7개 direction profile 기본값 테이블 + resolveDirection()                                                                 |
| `src/direction/presetAdapter.ts`                          | 기존 SceneType → SceneSpec 변환 어댑터                                                                                   |
| `src/direction/interpretationBootstrap.ts`                | genre→direction, structure→family heuristic 매핑                                                                         |
| `src/direction/directionResolver.ts`                      | DirectionParams → Remotion motion/timing 파라미터 resolver                                                               |
| `src/direction/__tests__/profiles.test.ts`                | direction profile 기본값 테스트                                                                                          |
| `src/direction/__tests__/presetAdapter.test.ts`           | preset → SceneSpec 변환 테스트                                                                                           |
| `src/direction/__tests__/interpretationBootstrap.test.ts` | heuristic 매핑 테스트                                                                                                    |
| `src/direction/__tests__/directionResolver.test.ts`       | resolver 출력 테스트                                                                                                     |

### 수정하는 파일

| File                             | Change                                              |
| -------------------------------- | --------------------------------------------------- |
| `src/types/index.ts`             | SceneFamily, DirectionProfileName 등 re-export 추가 |
| `src/pipeline/buildProps.ts`     | direction 주입 경로 추가                            |
| `src/scenes/KeyInsightScene.tsx` | direction-aware motion 적용 (첫 번째 대상)          |
| `src/scenes/FrameworkScene.tsx`  | direction-aware motion 적용 (두 번째 대상)          |

---

## Task 1: Direction 타입 계약 정의

**Files:**

- Create: `src/direction/types.ts`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Write the failing test — SceneFamily 타입 존재 확인**

```typescript
// src/direction/__tests__/profiles.test.ts
import { describe, it, expect } from "vitest";
import type {
  SceneFamily,
  DirectionProfileName,
  DirectionParams,
  SceneSpec,
} from "../types";

describe("Direction types", () => {
  it("SceneFamily includes all 11 families", () => {
    const families: SceneFamily[] = [
      "opening-hook",
      "concept-introduction",
      "mechanism-explanation",
      "system-model",
      "tension-comparison",
      "progression-journey",
      "transformation-shift",
      "evidence-stack",
      "reflective-anchor",
      "structural-bridge",
      "closing-synthesis",
    ];
    expect(families).toHaveLength(11);
  });

  it("DirectionProfileName includes all 7 profiles", () => {
    const profiles: DirectionProfileName[] = [
      "analytical",
      "systematic",
      "contemplative",
      "persuasive",
      "urgent",
      "inspirational",
      "investigative",
    ];
    expect(profiles).toHaveLength(7);
  });

  it("DirectionParams has required numeric fields", () => {
    const params: DirectionParams = {
      pacing: 0.5,
      energy: 0.5,
      emphasisDensity: 0.5,
      holdRatio: 0.25,
      revealPattern: "sequential",
      transitionTension: 0.3,
      subtitleCadence: "steady",
    };
    expect(params.pacing).toBeGreaterThanOrEqual(0);
    expect(params.pacing).toBeLessThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/direction/__tests__/profiles.test.ts`
Expected: FAIL — Cannot find module `../types`

- [ ] **Step 3: Write the type definitions**

```typescript
// src/direction/types.ts
import type {
  SceneType,
  LayoutType,
  ChoreographyType,
  MotionPresetKey,
  VCLElement,
  GenreKey,
  SceneContent,
  Beat,
} from "@/types";

// ─── Scene Family ───────────────────────────────────────────
export type SceneFamily =
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

// ─── Direction ──────────────────────────────────────────────
export type DirectionProfileName =
  | "analytical"
  | "systematic"
  | "contemplative"
  | "persuasive"
  | "urgent"
  | "inspirational"
  | "investigative";

export interface DirectionParams {
  pacing: number; // 0(느림) ~ 1(빠름)
  energy: number; // 0(차분) ~ 1(격렬)
  emphasisDensity: number; // 0(절제) ~ 1(밀집)
  holdRatio: number; // beat 내 정지 비율
  revealPattern: "sequential" | "parallel" | "layered" | "suspense";
  transitionTension: number; // 0(부드러움) ~ 1(급격함)
  subtitleCadence: "steady" | "syncopated" | "dramatic-pause";
}

export interface DirectionProfile {
  name: DirectionProfileName;
  base: DirectionParams;
}

// ─── Composition Path ───────────────────────────────────────
export type CompositionPath = "preset" | "composed" | "invented";

// ─── Element Spec ───────────────────────────────────────────
export interface ElementSpec {
  id: string;
  primitive: string;
  props: Record<string, unknown>;
  layer: number;
  beatActivationKey: string;
}

// ─── Transition Spec ────────────────────────────────────────
export interface TransitionSpec {
  type: "cut" | "crossfade" | "directional-wipe" | "zoom-bridge" | "hold-fade";
  duration: number;
  tension: number;
  direction?: "left" | "right" | "up" | "down";
}

// ─── Beat Profile ───────────────────────────────────────────
export type BeatRole =
  | "anchor"
  | "evidence"
  | "reveal"
  | "contrast"
  | "escalation"
  | "reflection"
  | "bridge"
  | (string & {});

export interface BeatProfile {
  segments: BeatSegment[];
  timingIntent: "even" | "front-loaded" | "back-loaded" | "climactic";
  emphasisStrategy: "single-peak" | "distributed" | "escalating";
}

export interface BeatSegment {
  id: string;
  role: BeatRole;
  narrationText: string;
  semanticWeight: number;
  emotionalIntensity: number;
  startRatio: number;
  endRatio: number;
  activates: string[];
  emphasisTargets: string[];
  transition: "enter" | "replace" | "emphasis" | "hold" | "exit";
}

// ─── Gap Candidate ──────────────────────────────────────────
export interface GapCandidate {
  sceneId: string;
  family: SceneFamily;
  unmetNeed: string;
  requiredVisualGrammar: string[];
  confidence: number;
}

// ─── SceneSpec — 5-Layer 공통 계약 ──────────────────────────
export interface SceneSpec {
  id: string;
  family: SceneFamily;
  intent: string;

  layout: LayoutType;
  elements: ElementSpec[];
  choreography: ChoreographyType;

  direction: DirectionProfile;
  directionOverrides?: Partial<DirectionParams>;

  beatProfile?: BeatProfile;

  transitionIn?: TransitionSpec;
  transitionOut?: TransitionSpec;

  durationStrategy?: {
    mode: "tts-driven" | "beat-driven" | "hybrid" | "fixed";
    minFrames?: number;
    maxFrames?: number;
  };

  source: CompositionPath;
  confidence: number;
  fallbackPreset?: SceneType;

  narrationText: string;
  content: Record<string, unknown>;

  interpretationMeta?: {
    derivedFrom: string[];
    whyThisFamily?: string;
    whyThisDirection?: string;
  };

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

- [ ] **Step 4: Re-export from src/types/index.ts**

`src/types/index.ts` 파일 끝에 추가:

```typescript
// ─── Direction Layer (Phase 0) ──────────────────────────────
export type {
  SceneFamily,
  DirectionProfileName,
  DirectionParams,
  DirectionProfile,
  CompositionPath,
  ElementSpec,
  TransitionSpec,
  BeatProfile,
  BeatSegment,
  GapCandidate,
  SceneSpec,
} from "@/direction/types";
export type { BeatRole as DirectionBeatRole } from "@/direction/types";
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/direction/__tests__/profiles.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/direction/types.ts src/direction/__tests__/profiles.test.ts src/types/index.ts
git commit -m "feat(direction): SceneSpec, DirectionProfile, SceneFamily 타입 계약 정의"
```

---

## Task 2: Direction Profile 기본값 테이블

**Files:**

- Create: `src/direction/profiles.ts`
- Test: `src/direction/__tests__/profiles.test.ts` (기존 파일에 추가)

- [ ] **Step 1: Write the failing test**

```typescript
// src/direction/__tests__/profiles.test.ts 에 추가
import { DIRECTION_PROFILES, getDirectionProfile } from "../profiles";

describe("Direction profiles", () => {
  it("has 7 profiles", () => {
    expect(Object.keys(DIRECTION_PROFILES)).toHaveLength(7);
  });

  it("all profiles have valid param ranges", () => {
    for (const [name, profile] of Object.entries(DIRECTION_PROFILES)) {
      expect(profile.name).toBe(name);
      expect(profile.base.pacing).toBeGreaterThanOrEqual(0);
      expect(profile.base.pacing).toBeLessThanOrEqual(1);
      expect(profile.base.energy).toBeGreaterThanOrEqual(0);
      expect(profile.base.energy).toBeLessThanOrEqual(1);
      expect(profile.base.holdRatio).toBeGreaterThanOrEqual(0);
      expect(profile.base.holdRatio).toBeLessThanOrEqual(1);
      expect(profile.base.transitionTension).toBeGreaterThanOrEqual(0);
      expect(profile.base.transitionTension).toBeLessThanOrEqual(1);
    }
  });

  it("getDirectionProfile returns correct profile", () => {
    const analytical = getDirectionProfile("analytical");
    expect(analytical.base.pacing).toBe(0.3);
    expect(analytical.base.energy).toBe(0.2);
    expect(analytical.base.revealPattern).toBe("sequential");
  });

  it("contemplative has slowest pacing", () => {
    const contemplative = getDirectionProfile("contemplative");
    const persuasive = getDirectionProfile("persuasive");
    expect(contemplative.base.pacing).toBeLessThan(persuasive.base.pacing);
  });

  it("urgent has highest energy", () => {
    const urgent = getDirectionProfile("urgent");
    for (const [name, profile] of Object.entries(DIRECTION_PROFILES)) {
      if (name !== "urgent") {
        expect(urgent.base.energy).toBeGreaterThanOrEqual(profile.base.energy);
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/direction/__tests__/profiles.test.ts`
Expected: FAIL — Cannot find module `../profiles`

- [ ] **Step 3: Write the profiles implementation**

```typescript
// src/direction/profiles.ts
import type { DirectionProfile, DirectionProfileName } from "./types";

export const DIRECTION_PROFILES: Record<
  DirectionProfileName,
  DirectionProfile
> = {
  analytical: {
    name: "analytical",
    base: {
      pacing: 0.3,
      energy: 0.2,
      emphasisDensity: 0.4,
      holdRatio: 0.3,
      revealPattern: "sequential",
      transitionTension: 0.2,
      subtitleCadence: "steady",
    },
  },
  systematic: {
    name: "systematic",
    base: {
      pacing: 0.4,
      energy: 0.3,
      emphasisDensity: 0.5,
      holdRatio: 0.25,
      revealPattern: "parallel",
      transitionTension: 0.3,
      subtitleCadence: "steady",
    },
  },
  contemplative: {
    name: "contemplative",
    base: {
      pacing: 0.2,
      energy: 0.15,
      emphasisDensity: 0.2,
      holdRatio: 0.5,
      revealPattern: "layered",
      transitionTension: 0.15,
      subtitleCadence: "dramatic-pause",
    },
  },
  persuasive: {
    name: "persuasive",
    base: {
      pacing: 0.7,
      energy: 0.7,
      emphasisDensity: 0.7,
      holdRatio: 0.15,
      revealPattern: "sequential",
      transitionTension: 0.6,
      subtitleCadence: "syncopated",
    },
  },
  urgent: {
    name: "urgent",
    base: {
      pacing: 0.85,
      energy: 0.85,
      emphasisDensity: 0.8,
      holdRatio: 0.1,
      revealPattern: "sequential",
      transitionTension: 0.8,
      subtitleCadence: "syncopated",
    },
  },
  inspirational: {
    name: "inspirational",
    base: {
      pacing: 0.4,
      energy: 0.5,
      emphasisDensity: 0.4,
      holdRatio: 0.35,
      revealPattern: "layered",
      transitionTension: 0.3,
      subtitleCadence: "steady",
    },
  },
  investigative: {
    name: "investigative",
    base: {
      pacing: 0.35,
      energy: 0.4,
      emphasisDensity: 0.5,
      holdRatio: 0.3,
      revealPattern: "suspense",
      transitionTension: 0.5,
      subtitleCadence: "dramatic-pause",
    },
  },
};

export function getDirectionProfile(
  name: DirectionProfileName,
): DirectionProfile {
  return DIRECTION_PROFILES[name];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/direction/__tests__/profiles.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/direction/profiles.ts src/direction/__tests__/profiles.test.ts
git commit -m "feat(direction): 7개 direction profile 기본값 테이블"
```

---

## Task 3: Interpretation Bootstrap — Heuristic 매핑

**Files:**

- Create: `src/direction/interpretationBootstrap.ts`
- Create: `src/direction/__tests__/interpretationBootstrap.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/direction/__tests__/interpretationBootstrap.test.ts
import { describe, it, expect } from "vitest";
import {
  resolveDirectionFromFingerprint,
  resolveSceneFamily,
} from "../interpretationBootstrap";
import type { SceneType } from "@/types";

describe("interpretationBootstrap", () => {
  describe("resolveDirectionFromFingerprint", () => {
    it("psychology genre → analytical", () => {
      const result = resolveDirectionFromFingerprint({
        genre: "psychology",
        structure: "framework",
        emotionalTone: ["disciplined"],
      });
      expect(result.name).toBe("analytical");
    });

    it("selfHelp genre → persuasive", () => {
      const result = resolveDirectionFromFingerprint({
        genre: "selfHelp",
        structure: "framework",
        emotionalTone: ["uplifting"],
      });
      expect(result.name).toBe("persuasive");
    });

    it("business genre → systematic", () => {
      const result = resolveDirectionFromFingerprint({
        genre: "business",
        structure: "argument",
        emotionalTone: ["disciplined"],
      });
      expect(result.name).toBe("systematic");
    });

    it("philosophy genre → contemplative", () => {
      const result = resolveDirectionFromFingerprint({
        genre: "philosophy",
        structure: "narrative",
        emotionalTone: ["reflective"],
      });
      expect(result.name).toBe("contemplative");
    });

    it("science genre → investigative", () => {
      const result = resolveDirectionFromFingerprint({
        genre: "science",
        structure: "framework",
        emotionalTone: ["disciplined"],
      });
      expect(result.name).toBe("investigative");
    });

    it("emotionalTone override: urgent tone → urgent direction", () => {
      const result = resolveDirectionFromFingerprint({
        genre: "selfHelp",
        structure: "framework",
        emotionalTone: ["urgent"],
      });
      expect(result.name).toBe("urgent");
    });

    it("emotionalTone override: hopeful tone → inspirational direction", () => {
      const result = resolveDirectionFromFingerprint({
        genre: "business",
        structure: "framework",
        emotionalTone: ["hopeful"],
      });
      expect(result.name).toBe("inspirational");
    });
  });

  describe("resolveSceneFamily", () => {
    it("cover → opening-hook (always first)", () => {
      expect(resolveSceneFamily("cover")).toBe("opening-hook");
    });

    it("highlight → opening-hook", () => {
      expect(resolveSceneFamily("highlight")).toBe("opening-hook");
    });

    it("keyInsight → concept-introduction", () => {
      expect(resolveSceneFamily("keyInsight")).toBe("concept-introduction");
    });

    it("framework with structure=framework → system-model", () => {
      expect(resolveSceneFamily("framework", "framework")).toBe("system-model");
    });

    it("framework with structure=narrative → mechanism-explanation", () => {
      expect(resolveSceneFamily("framework", "narrative")).toBe(
        "mechanism-explanation",
      );
    });

    it("compareContrast → tension-comparison", () => {
      expect(resolveSceneFamily("compareContrast")).toBe("tension-comparison");
    });

    it("application → progression-journey", () => {
      expect(resolveSceneFamily("application")).toBe("progression-journey");
    });

    it("quote → reflective-anchor", () => {
      expect(resolveSceneFamily("quote")).toBe("reflective-anchor");
    });

    it("chapterDivider → structural-bridge", () => {
      expect(resolveSceneFamily("chapterDivider")).toBe("structural-bridge");
    });

    it("closing → closing-synthesis", () => {
      expect(resolveSceneFamily("closing")).toBe("closing-synthesis");
    });

    it("data → evidence-stack", () => {
      expect(resolveSceneFamily("data")).toBe("evidence-stack");
    });

    it("timeline → progression-journey", () => {
      expect(resolveSceneFamily("timeline")).toBe("progression-journey");
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/direction/__tests__/interpretationBootstrap.test.ts`
Expected: FAIL — Cannot find module `../interpretationBootstrap`

- [ ] **Step 3: Write the implementation**

```typescript
// src/direction/interpretationBootstrap.ts
import type { GenreKey, SceneType } from "@/types";
import type {
  DirectionProfile,
  DirectionProfileName,
  SceneFamily,
} from "./types";
import { getDirectionProfile } from "./profiles";

// ─── Genre → Direction 기본 매핑 ────────────────────────────
const GENRE_DIRECTION_MAP: Record<GenreKey, DirectionProfileName> = {
  psychology: "analytical",
  selfHelp: "persuasive",
  business: "systematic",
  philosophy: "contemplative",
  science: "investigative",
  ai: "systematic",
};

// ─── EmotionalTone override ─────────────────────────────────
const TONE_DIRECTION_OVERRIDE: Record<string, DirectionProfileName> = {
  urgent: "urgent",
  hopeful: "inspirational",
  reflective: "contemplative",
  provocative: "persuasive",
  intense: "urgent",
  calm: "contemplative",
};

interface FingerprintHint {
  genre: GenreKey;
  structure: string;
  emotionalTone: string[];
}

export function resolveDirectionFromFingerprint(
  hint: FingerprintHint,
): DirectionProfile {
  // 1. emotionalTone override 우선 (첫 번째 매칭)
  for (const tone of hint.emotionalTone) {
    if (TONE_DIRECTION_OVERRIDE[tone]) {
      return getDirectionProfile(TONE_DIRECTION_OVERRIDE[tone]);
    }
  }

  // 2. genre 기본 매핑
  const profileName = GENRE_DIRECTION_MAP[hint.genre] ?? "systematic";
  return getDirectionProfile(profileName);
}

// ─── SceneType → SceneFamily 매핑 ───────────────────────────
const SCENE_FAMILY_MAP: Record<string, SceneFamily> = {
  cover: "opening-hook",
  highlight: "opening-hook",
  keyInsight: "concept-introduction",
  compareContrast: "tension-comparison",
  application: "progression-journey",
  quote: "reflective-anchor",
  chapterDivider: "structural-bridge",
  closing: "closing-synthesis",
  data: "evidence-stack",
  timeline: "progression-journey",
  listReveal: "evidence-stack",
  splitQuote: "reflective-anchor",
  transition: "structural-bridge",
};

export function resolveSceneFamily(
  sceneType: SceneType | string,
  bookStructure?: string,
): SceneFamily {
  // framework는 책 구조에 따라 분기
  if (sceneType === "framework") {
    return bookStructure === "framework"
      ? "system-model"
      : "mechanism-explanation";
  }

  return SCENE_FAMILY_MAP[sceneType] ?? "concept-introduction";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/direction/__tests__/interpretationBootstrap.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/direction/interpretationBootstrap.ts src/direction/__tests__/interpretationBootstrap.test.ts
git commit -m "feat(direction): interpretation bootstrap — genre→direction, sceneType→family heuristic"
```

---

## Task 4: PresetAdapter — 기존 씬을 SceneSpec으로 변환

**Files:**

- Create: `src/direction/presetAdapter.ts`
- Create: `src/direction/__tests__/presetAdapter.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/direction/__tests__/presetAdapter.test.ts
import { describe, it, expect } from "vitest";
import { adaptPresetToSceneSpec } from "../presetAdapter";
import type { DirectionProfile } from "../types";
import { getDirectionProfile } from "../profiles";

const mockDirection = getDirectionProfile("analytical");

describe("PresetAdapter", () => {
  it("converts keyInsight scene to SceneSpec", () => {
    const scene = {
      id: "insight-01",
      type: "keyInsight" as const,
      narrationText: "테스트 나레이션",
      content: {
        headline: "테스트 헤드라인",
        supportText: "테스트 서포트",
        underlineKeyword: "테스트",
        useSignalBar: true,
      },
    };

    const spec = adaptPresetToSceneSpec(scene, mockDirection, "framework");
    expect(spec.id).toBe("insight-01");
    expect(spec.family).toBe("concept-introduction");
    expect(spec.source).toBe("preset");
    expect(spec.direction.name).toBe("analytical");
    expect(spec.layout).toBe("center-focus");
    expect(spec.confidence).toBe(1.0);
    expect(spec.narrationText).toBe("테스트 나레이션");
  });

  it("converts framework scene with structure=framework to system-model", () => {
    const scene = {
      id: "fw-01",
      type: "framework" as const,
      narrationText: "프레임워크 나레이션",
      content: {
        frameworkLabel: "FEED",
        items: [{ number: 1, title: "Focus", description: "집중" }],
      },
    };

    const spec = adaptPresetToSceneSpec(scene, mockDirection, "framework");
    expect(spec.family).toBe("system-model");
  });

  it("preserves fallbackPreset as the original scene type", () => {
    const scene = {
      id: "quote-01",
      type: "quote" as const,
      narrationText: "인용문",
      content: { quoteText: "테스트", attribution: "저자" },
    };

    const spec = adaptPresetToSceneSpec(scene, mockDirection);
    expect(spec.fallbackPreset).toBe("quote");
    expect(spec.family).toBe("reflective-anchor");
  });

  it("sets interpretationMeta with derivedFrom", () => {
    const scene = {
      id: "cover-01",
      type: "cover" as const,
      narrationText: "커버",
      content: { title: "책", author: "저자", coverImageUrl: "" },
    };

    const spec = adaptPresetToSceneSpec(scene, mockDirection);
    expect(spec.interpretationMeta).toBeDefined();
    expect(spec.interpretationMeta!.derivedFrom).toContain("preset:cover");
    expect(spec.interpretationMeta!.whyThisFamily).toContain("opening-hook");
  });

  it("sets durationStrategy to tts-driven when narration exists", () => {
    const scene = {
      id: "insight-02",
      type: "keyInsight" as const,
      narrationText: "나레이션 있음",
      content: { headline: "헤드라인", supportText: "서포트" },
    };

    const spec = adaptPresetToSceneSpec(scene, mockDirection);
    expect(spec.durationStrategy?.mode).toBe("tts-driven");
  });

  it("sets durationStrategy to fixed when no narration", () => {
    const scene = {
      id: "transition-01",
      type: "transition" as const,
      narrationText: "",
      content: { label: "다음 챕터", style: "fade" },
    };

    const spec = adaptPresetToSceneSpec(scene, mockDirection);
    expect(spec.durationStrategy?.mode).toBe("fixed");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/direction/__tests__/presetAdapter.test.ts`
Expected: FAIL — Cannot find module `../presetAdapter`

- [ ] **Step 3: Write the implementation**

```typescript
// src/direction/presetAdapter.ts
import type { SceneType, LayoutArchetype } from "@/types";
import type { SceneSpec, DirectionProfile } from "./types";
import { resolveSceneFamily } from "./interpretationBootstrap";

// scene-catalog.json의 layoutArchetype 매핑 (읽기 전용 참조)
const PRESET_LAYOUT_MAP: Record<string, string> = {
  cover: "center-focus",
  chapterDivider: "left-anchor",
  keyInsight: "center-focus",
  compareContrast: "split-compare",
  quote: "quote-hold",
  framework: "grid-expand",
  application: "map-flow",
  data: "grid-expand",
  closing: "center-focus",
  highlight: "center-focus",
  timeline: "timeline-h",
  listReveal: "grid-expand",
  splitQuote: "split-compare",
  transition: "center-focus",
};

const PRESET_CHOREOGRAPHY_MAP: Record<string, string> = {
  cover: "reveal-sequence",
  chapterDivider: "reveal-sequence",
  keyInsight: "reveal-sequence",
  compareContrast: "split-reveal",
  quote: "reveal-sequence",
  framework: "stagger-clockwise",
  application: "reveal-sequence",
  data: "reveal-sequence",
  closing: "reveal-sequence",
  highlight: "reveal-sequence",
  timeline: "path-trace",
  listReveal: "stagger-clockwise",
  splitQuote: "split-reveal",
  transition: "reveal-sequence",
};

interface MinimalScene {
  id: string;
  type: SceneType | string;
  narrationText: string;
  content: Record<string, unknown>;
}

export function adaptPresetToSceneSpec(
  scene: MinimalScene,
  direction: DirectionProfile,
  bookStructure?: string,
): SceneSpec {
  const family = resolveSceneFamily(scene.type, bookStructure);
  const layout = (PRESET_LAYOUT_MAP[scene.type] ?? "center-focus") as any;
  const choreography = (PRESET_CHOREOGRAPHY_MAP[scene.type] ??
    "reveal-sequence") as any;

  return {
    id: scene.id,
    family,
    intent: `${family} via preset ${scene.type}`,

    layout,
    elements: [], // Phase 2에서 채움
    choreography,

    direction,
    durationStrategy: {
      mode: scene.narrationText ? "tts-driven" : "fixed",
    },

    source: "preset",
    confidence: 1.0,
    fallbackPreset: scene.type as SceneType,

    narrationText: scene.narrationText,
    content: scene.content,

    interpretationMeta: {
      derivedFrom: [`preset:${scene.type}`, `direction:${direction.name}`],
      whyThisFamily: `${scene.type} → ${family} (preset adapter default mapping)`,
      whyThisDirection: `${direction.name} (book-level direction from interpretation bootstrap)`,
    },

    constraintHints: {
      accentBudget: 2,
      subtitleMode: "standard",
    },

    brandValidation: {
      status: "pending",
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/direction/__tests__/presetAdapter.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/direction/presetAdapter.ts src/direction/__tests__/presetAdapter.test.ts
git commit -m "feat(direction): PresetAdapter — 기존 씬을 SceneSpec으로 변환"
```

---

## Task 5: Direction Resolver — DirectionParams → Remotion 파라미터

**Files:**

- Create: `src/direction/directionResolver.ts`
- Create: `src/direction/__tests__/directionResolver.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/direction/__tests__/directionResolver.test.ts
import { describe, it, expect } from "vitest";
import { resolveMotionParams } from "../directionResolver";
import { getDirectionProfile } from "../profiles";
import type { MotionPresetKey } from "@/types";

describe("directionResolver", () => {
  describe("resolveMotionParams", () => {
    it("analytical direction → heavy/smooth presets, longer durations", () => {
      const profile = getDirectionProfile("analytical");
      const resolved = resolveMotionParams(profile.base);

      expect(resolved.enterPreset).toBe("heavy");
      expect(resolved.emphasisPreset).toBe("smooth");
      expect(resolved.holdFrames).toBeGreaterThan(0);
      expect(resolved.transitionFrames).toBeGreaterThan(0);
    });

    it("persuasive direction → snappy/punchy presets, shorter durations", () => {
      const profile = getDirectionProfile("persuasive");
      const resolved = resolveMotionParams(profile.base);

      expect(resolved.enterPreset).toBe("snappy");
      expect(resolved.emphasisPreset).toBe("punchy");
      expect(resolved.holdFrames).toBeLessThan(
        resolveMotionParams(getDirectionProfile("analytical").base).holdFrames,
      );
    });

    it("contemplative direction → dramatic/gentle presets, longest hold", () => {
      const profile = getDirectionProfile("contemplative");
      const resolved = resolveMotionParams(profile.base);

      expect(resolved.enterPreset).toBe("dramatic");
      expect(resolved.emphasisPreset).toBe("gentle");
    });

    it("all resolved presets are valid MotionPresetKeys", () => {
      const validPresets: MotionPresetKey[] = [
        "gentle",
        "smooth",
        "snappy",
        "heavy",
        "dramatic",
        "wordReveal",
        "punchy",
      ];
      for (const profileName of [
        "analytical",
        "systematic",
        "contemplative",
        "persuasive",
        "urgent",
        "inspirational",
        "investigative",
      ] as const) {
        const resolved = resolveMotionParams(
          getDirectionProfile(profileName).base,
        );
        expect(validPresets).toContain(resolved.enterPreset);
        expect(validPresets).toContain(resolved.emphasisPreset);
      }
    });

    it("holdFrames scales with holdRatio (30fps, 150 frame scene)", () => {
      const analytical = resolveMotionParams(
        getDirectionProfile("analytical").base,
        150,
      );
      const urgent = resolveMotionParams(
        getDirectionProfile("urgent").base,
        150,
      );

      expect(analytical.holdFrames).toBeGreaterThan(urgent.holdFrames);
    });

    it("directionOverrides merge into base params", () => {
      const base = getDirectionProfile("analytical").base;
      const resolved = resolveMotionParams(base, 150, { energy: 0.9 });

      // energy 0.9 override → snappier preset
      const resolvedBase = resolveMotionParams(base, 150);
      expect(resolved.enterPreset).not.toBe(resolvedBase.enterPreset);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/direction/__tests__/directionResolver.test.ts`
Expected: FAIL — Cannot find module `../directionResolver`

- [ ] **Step 3: Write the implementation**

```typescript
// src/direction/directionResolver.ts
import type { MotionPresetKey } from "@/types";
import type { DirectionParams } from "./types";

export interface ResolvedMotionParams {
  enterPreset: MotionPresetKey;
  emphasisPreset: MotionPresetKey;
  holdFrames: number;
  transitionFrames: number;
  staggerDelay: number; // frames between staggered elements
}

const DEFAULT_SCENE_FRAMES = 150; // 5 seconds at 30fps

/**
 * DirectionParams → Remotion motion/timing resolver.
 *
 * DirectionParams는 렌더러에 직접 전달되는 raw values가 아니라
 * 이 resolver의 입력 파라미터다. Resolver가 실제 preset/frame 값으로 변환한다.
 */
export function resolveMotionParams(
  base: DirectionParams,
  sceneDurationFrames: number = DEFAULT_SCENE_FRAMES,
  overrides?: Partial<DirectionParams>,
): ResolvedMotionParams {
  const params: DirectionParams = overrides ? { ...base, ...overrides } : base;

  return {
    enterPreset: resolveEnterPreset(params),
    emphasisPreset: resolveEmphasisPreset(params),
    holdFrames: Math.round(sceneDurationFrames * params.holdRatio * 0.3),
    transitionFrames: resolveTransitionFrames(params.transitionTension),
    staggerDelay: resolveStaggerDelay(params.pacing),
  };
}

function resolveEnterPreset(params: DirectionParams): MotionPresetKey {
  const score = params.energy * 0.6 + params.pacing * 0.4;

  if (score < 0.25) return "dramatic"; // very slow, low energy
  if (score < 0.4) return "heavy"; // moderate slow
  if (score < 0.55) return "smooth"; // balanced
  if (score < 0.7) return "snappy"; // fast
  return "punchy"; // very fast, high energy
}

function resolveEmphasisPreset(params: DirectionParams): MotionPresetKey {
  if (params.emphasisDensity < 0.3) return "gentle";
  if (params.emphasisDensity < 0.5) return "smooth";
  if (params.emphasisDensity < 0.7) return "snappy";
  return "punchy";
}

function resolveTransitionFrames(tension: number): number {
  // tension 0 → 24f (smooth), tension 1 → 6f (cut-like)
  return Math.round(24 - tension * 18);
}

function resolveStaggerDelay(pacing: number): number {
  // pacing 0 → 8f delay, pacing 1 → 2f delay
  return Math.round(8 - pacing * 6);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/direction/__tests__/directionResolver.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/direction/directionResolver.ts src/direction/__tests__/directionResolver.test.ts
git commit -m "feat(direction): DirectionParams → Remotion motion resolver"
```

---

## Task 6: Pipeline 통합 — buildProps에 direction 주입

**Files:**

- Modify: `src/pipeline/buildProps.ts`
- Create: `src/direction/index.ts` (barrel export)

- [ ] **Step 1: Create barrel export**

```typescript
// src/direction/index.ts
export type {
  SceneFamily,
  DirectionProfileName,
  DirectionParams,
  DirectionProfile,
  CompositionPath,
  SceneSpec,
  BeatProfile,
  BeatSegment,
  GapCandidate,
  ElementSpec,
  TransitionSpec,
  BeatRole,
} from "./types";

export { DIRECTION_PROFILES, getDirectionProfile } from "./profiles";
export {
  resolveDirectionFromFingerprint,
  resolveSceneFamily,
} from "./interpretationBootstrap";
export { adaptPresetToSceneSpec } from "./presetAdapter";
export { resolveMotionParams } from "./directionResolver";
export type { ResolvedMotionParams } from "./directionResolver";
```

- [ ] **Step 2: Read current buildProps.ts to understand integration point**

Run: `cat src/pipeline/buildProps.ts` 확인 후 적절한 위치에 direction 주입.

핵심 변경: `buildCompositionProps()` 내에서 scenes를 반환하기 전에 direction 정보를 `PlannedScene`에 부착한다.

- [ ] **Step 3: Modify buildProps.ts — direction 주입**

`src/pipeline/buildProps.ts`에 import 추가 및 `buildCompositionProps` 함수 수정:

```typescript
// 기존 imports 아래 추가:
import {
  resolveDirectionFromFingerprint,
  adaptPresetToSceneSpec,
  resolveMotionParams,
} from "@/direction";
import type {
  DirectionProfile,
  SceneSpec,
  ResolvedMotionParams,
} from "@/direction";

// PlannedScene 타입 확장:
export type PlannedScene = TypedScene & {
  from: number;
  resolvedDuration: number;
  tts?: TTSResult;
  subtitles?: SubtitleEntry[];
  // Phase 0 additions:
  sceneSpec?: SceneSpec;
  resolvedMotion?: ResolvedMotionParams;
};
```

`buildCompositionProps` 함수 내에서 scenes 루프 후 direction을 주입:

```typescript
// planScenes() 호출 후, return 직전에 추가:
const fingerprintHint = {
  genre: (book.metadata.genre ?? "selfHelp") as GenreKey,
  structure: planResult?.fingerprint?.structure ?? "framework",
  emotionalTone: planResult?.fingerprint?.emotionalTone ?? [],
};
const bookDirection = resolveDirectionFromFingerprint(fingerprintHint);

const directionEnrichedScenes = planned.map((scene) => {
  const spec = adaptPresetToSceneSpec(
    {
      id: scene.id,
      type: scene.type,
      narrationText: scene.narrationText ?? "",
      content: scene.content as any,
    },
    bookDirection,
    fingerprintHint.structure,
  );
  const resolvedMotion = resolveMotionParams(
    bookDirection.base,
    scene.resolvedDuration,
  );
  return { ...scene, sceneSpec: spec, resolvedMotion };
});
```

- [ ] **Step 4: Run existing tests to verify no regression**

Run: `npx vitest run`
Expected: All existing tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/direction/index.ts src/pipeline/buildProps.ts
git commit -m "feat(direction): buildProps에 direction 주입 경로 연결"
```

---

## Task 7: KeyInsightScene에 direction-aware motion 적용

**Files:**

- Modify: `src/scenes/KeyInsightScene.tsx`

이 Task는 direction이 실제 렌더에 영향을 미치는 첫 번째 적용. analytical(느린 reveal) vs persuasive(빠른 punch)가 같은 keyInsight에서 다르게 보여야 한다.

- [ ] **Step 1: Read KeyInsightScene.tsx의 현재 motion 로직 확인**

Run: `grep -n "spring\|interpolate\|motionPreset\|enterProgress" src/scenes/KeyInsightScene.tsx | head -20`

현재 enter animation에서 사용하는 spring config / motion preset을 파악한다.

- [ ] **Step 2: Modify KeyInsightScene — resolvedMotion props 수용**

KeyInsightScene의 props에 `resolvedMotion?` 추가. 존재하면 해당 preset으로 enter animation의 spring config를 교체한다.

핵심 변경:

```typescript
// props 인터페이스에 추가
resolvedMotion?: {
  enterPreset: MotionPresetKey;
  emphasisPreset: MotionPresetKey;
  holdFrames: number;
  staggerDelay: number;
};

// enter animation에서:
const enterConfig = resolvedMotion
  ? motionPresets.presets[resolvedMotion.enterPreset].config
  : motionPresets.presets.heavy.config; // 기존 기본값

const STAGGER = resolvedMotion?.staggerDelay ?? motionPresets.defaults.staggerFrames;
```

- [ ] **Step 3: LongformComposition에서 resolvedMotion 전달 확인**

`src/compositions/LongformComposition.tsx`에서 PlannedScene의 `resolvedMotion`을 KeyInsightScene에 전달하는지 확인. 필요하면 props 전달 추가.

- [ ] **Step 4: Remotion Studio에서 시각 확인**

Run: `npm run preview`

같은 keyInsight 씬을:

1. analytical direction (heavy enter, smooth emphasis, long hold)
2. persuasive direction (snappy enter, punchy emphasis, short hold)

으로 렌더해서 차이가 보이는지 확인.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/KeyInsightScene.tsx src/compositions/LongformComposition.tsx
git commit -m "feat(direction): KeyInsightScene direction-aware motion 적용"
```

---

## Task 8: FrameworkScene에 direction-aware motion 적용

**Files:**

- Modify: `src/scenes/FrameworkScene.tsx`

Task 7과 동일한 패턴을 FrameworkScene에 적용. framework는 stagger reveal이 핵심이므로 direction에 따른 staggerDelay 차이가 크게 느껴져야 한다.

- [ ] **Step 1: Read FrameworkScene.tsx의 현재 stagger 로직 확인**

Run: `grep -n "stagger\|STAGGER\|spring\|enterProgress" src/scenes/FrameworkScene.tsx | head -20`

- [ ] **Step 2: Modify FrameworkScene — resolvedMotion 수용**

Task 7과 동일한 패턴:

```typescript
const enterConfig = resolvedMotion
  ? motionPresets.presets[resolvedMotion.enterPreset].config
  : motionPresets.presets.heavy.config;

const STAGGER =
  resolvedMotion?.staggerDelay ?? motionPresets.defaults.staggerFrames;
```

- [ ] **Step 3: LongformComposition에서 resolvedMotion 전달 확인**

- [ ] **Step 4: Remotion Studio에서 시각 확인**

Run: `npm run preview`

framework 씬의 item stagger reveal이 direction에 따라 다른 속도로 나오는지 확인.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/FrameworkScene.tsx
git commit -m "feat(direction): FrameworkScene direction-aware stagger 적용"
```

---

## Task 9: 통합 검증 — 2개 direction profile로 렌더 비교

**Files:** (no new files)

이 Task가 Phase 0의 **완료 조건 검증**이다.

- [ ] **Step 1: 기존 atomic-habits를 analytical direction으로 렌더**

content JSON의 genre가 "selfHelp"이므로 기본 direction은 "persuasive".
테스트를 위해 일시적으로 genre를 "psychology"로 변경 → "analytical" direction 적용.

Run: `npm run preview`에서 AtomicHabits composition의 keyInsight, framework 씬 시각 확인.

- [ ] **Step 2: genre를 원래대로 복원하여 persuasive direction으로 렌더**

Run: `npm run preview`에서 같은 씬이 다르게 보이는지 확인.

**확인 항목:**

- [ ] enter animation 속도 차이 (analytical: heavy → persuasive: snappy)
- [ ] stagger delay 차이 (analytical: 8f → persuasive: 3f)
- [ ] emphasis 강도 차이 (analytical: smooth → persuasive: punchy)

- [ ] **Step 3: 전체 테스트 통과 확인**

Run: `npx vitest run`
Expected: All PASS

- [ ] **Step 4: Commit all remaining changes**

```bash
git add -A
git commit -m "feat(direction): Phase 0 완료 — direction profile에 따른 시각적 변주 확인"
```

---

## Task 10: content-composer 스킬 업데이트

**Files:**

- Modify: `.claude/skills/content-composer/SKILL.md`

- [ ] **Step 1: SKILL.md에 SceneSpec/Direction 참조 추가**

Step 2-2 (씬 구성 결정) 섹션에 SceneFamily 참조를 추가:

```markdown
### 2-2. SceneFamily 기반 씬 구성

BookFingerprint를 기반으로 SceneFamily를 결정한다.
`src/direction/interpretationBootstrap.ts`의 매핑을 참조.

| BookFingerprint.genre | 기본 Direction | SceneFamily 가중치                           |
| --------------------- | -------------- | -------------------------------------------- |
| psychology            | analytical     | mechanism-explanation↑, tension-comparison↑  |
| selfHelp              | persuasive     | progression-journey↑, evidence-stack↑        |
| business              | systematic     | tension-comparison↑, system-model↑           |
| philosophy            | contemplative  | reflective-anchor↑, concept-introduction↑    |
| science               | investigative  | mechanism-explanation↑, progression-journey↑ |
```

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/content-composer/SKILL.md
git commit -m "docs: content-composer 스킬에 SceneFamily/Direction 참조 추가"
```

---

## Dependency Graph

```
Task 1 (타입) ──→ Task 2 (프로파일) ──→ Task 3 (해석 bootstrap)
                                            │
                                            ▼
                      Task 4 (PresetAdapter) ──→ Task 6 (buildProps 통합)
                                                      │
Task 5 (Resolver) ──────────────────────────────────→ │
                                                      ▼
                                            Task 7 (KeyInsight 적용)
                                                      │
                                            Task 8 (Framework 적용)
                                                      │
                                            Task 9 (통합 검증)
                                                      │
                                            Task 10 (스킬 업데이트)
```

Tasks 1→2→3→4, 5 are parallelizable after Task 1. Tasks 6→7→8→9→10 are sequential.
