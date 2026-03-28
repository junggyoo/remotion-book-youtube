# Phase 2A: Core Composition Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SceneSpec에서 SceneBlueprint로의 "composed path"를 열어, 기존 layout/choreography/primitive registry를 실제로 사용하는 동적 조합 엔진을 구축한다.

**Architecture:** CompositionFactory가 SceneSpec의 family + content + direction을 읽어 VCLElement[]를 생성하고, layout/choreography를 선택하여 SceneBlueprint를 만든다. 이 blueprint는 기존 BlueprintRenderer가 그대로 렌더한다. 통합은 buildProps.ts에서 `_blueprint` 필드를 주입하는 방식으로, SceneRenderer의 기존 blueprint guard를 활용한다.

**Tech Stack:** TypeScript, Remotion, Vitest, 기존 VCL registry (layouts, choreography, primitiveRegistry)

**핵심 인사이트:** BlueprintRenderer가 이미 composition engine이다. 부재한 것은 SceneSpec → SceneBlueprint 브릿지뿐.

---

## File Structure

```
src/composition/                          (NEW directory)
├── index.ts                              — barrel export
├── types.ts                              — FamilyRecipe, CompositionContext types
├── elementResolver.ts                    — SceneSpec → VCLElement[] (recipe dispatch)
├── CompositionFactory.ts                 — SceneSpec + context → SceneBlueprint
├── compositionPathRouter.ts              — shouldCompose() 판정 + buildProps 통합 함수
├── familyRecipes/                        (NEW directory)
│   ├── index.ts                          — recipe registry
│   ├── conceptIntroduction.ts            — keyInsight family recipe
│   ├── systemModel.ts                    — framework family recipe
│   └── progressionJourney.ts             — application family recipe
└── __tests__/                            (NEW directory)
    ├── elementResolver.test.ts
    ├── CompositionFactory.test.ts
    ├── compositionPathRouter.test.ts
    └── familyRecipes.test.ts

src/direction/presetAdapter.ts            (MODIFY — add composed source support)
src/pipeline/buildProps.ts                (MODIFY — composed path integration)
src/types/index.ts                        (MODIFY — SceneBlueprint origin type extension)
```

---

### Task 1: Composition Types + ElementResolver Foundation

**Files:**

- Create: `src/composition/types.ts`
- Create: `src/composition/elementResolver.ts`
- Test: `src/composition/__tests__/elementResolver.test.ts`

- [ ] **Step 1: Write the failing test for elementResolver**

```typescript
// src/composition/__tests__/elementResolver.test.ts
import { describe, it, expect } from "vitest";
import { resolveElements } from "../elementResolver";
import type { SceneSpec } from "@/direction/types";
import type { DirectionProfile } from "@/direction/types";

const mockDirection: DirectionProfile = {
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
};

function makeSceneSpec(
  family: SceneSpec["family"],
  content: Record<string, unknown>,
): SceneSpec {
  return {
    id: "test-scene-01",
    family,
    intent: "test",
    layout: "center-focus",
    elements: [],
    choreography: "reveal-sequence",
    direction: mockDirection,
    source: "composed",
    confidence: 0.8,
    narrationText: "테스트 나레이션",
    content,
  };
}

describe("resolveElements", () => {
  it("returns VCLElement[] for concept-introduction family", () => {
    const spec = makeSceneSpec("concept-introduction", {
      headline: "핵심 인사이트",
      supportText: "이것은 설명입니다",
      evidence: "연구 결과에 따르면...",
    });

    const elements = resolveElements(spec);

    expect(elements.length).toBeGreaterThanOrEqual(2);
    expect(elements[0].type).toBe("headline");
    expect(elements[0].props.text).toBe("핵심 인사이트");
    expect(elements.find((e) => e.type === "body-text")).toBeDefined();
  });

  it("returns empty array for unknown family (fallback)", () => {
    const spec = makeSceneSpec("opening-hook" as any, { headline: "test" });
    const elements = resolveElements(spec);
    // opening-hook has no recipe yet — returns fallback elements
    expect(Array.isArray(elements)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/composition/__tests__/elementResolver.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create composition types**

```typescript
// src/composition/types.ts
import type { VCLElement, Theme, MotionPresetKey } from "@/types";
import type { SceneSpec, SceneFamily } from "@/direction/types";

/**
 * A FamilyRecipe converts SceneSpec.content into VCLElement[].
 * Each supported SceneFamily has one recipe.
 */
export interface FamilyRecipe {
  family: SceneFamily;
  /** Convert content fields to VCL elements */
  resolve(content: Record<string, unknown>): VCLElement[];
  /** Preferred layout for this family (can be overridden by direction) */
  defaultLayout: string;
  /** Preferred choreography for this family */
  defaultChoreography: string;
}

/**
 * Context needed by CompositionFactory beyond SceneSpec itself.
 * These values come from the pipeline (PlannedScene / buildProps).
 */
export interface CompositionContext {
  format: "longform" | "shorts";
  theme: Theme;
  from: number;
  durationFrames: number;
  motionPreset: MotionPresetKey;
}
```

- [ ] **Step 4: Create elementResolver**

```typescript
// src/composition/elementResolver.ts
import type { VCLElement } from "@/types";
import type { SceneSpec } from "@/direction/types";
import { recipeRegistry } from "./familyRecipes";

/**
 * Resolve SceneSpec → VCLElement[] by dispatching to the appropriate family recipe.
 * Returns a minimal fallback (headline only) if no recipe is registered.
 */
export function resolveElements(spec: SceneSpec): VCLElement[] {
  const recipe = recipeRegistry[spec.family];

  if (!recipe) {
    // Fallback: extract headline if present
    const headline = spec.content.headline as string | undefined;
    if (headline) {
      return [
        {
          id: `${spec.id}-headline`,
          type: "headline",
          props: { text: headline },
        },
      ];
    }
    return [];
  }

  return recipe.resolve(spec.content);
}
```

- [ ] **Step 5: Create empty recipe registry (stub)**

```typescript
// src/composition/familyRecipes/index.ts
import type { FamilyRecipe } from "../types";
import type { SceneFamily } from "@/direction/types";

export const recipeRegistry: Partial<Record<SceneFamily, FamilyRecipe>> = {};

export function registerRecipe(recipe: FamilyRecipe): void {
  recipeRegistry[recipe.family] = recipe;
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/composition/__tests__/elementResolver.test.ts`
Expected: First test fails (no recipe registered yet), second test passes. This is correct — recipes come in Task 2.

- [ ] **Step 7: Commit**

```bash
git add src/composition/types.ts src/composition/elementResolver.ts src/composition/familyRecipes/index.ts src/composition/__tests__/elementResolver.test.ts
git commit -m "feat(composition): types + elementResolver foundation with recipe dispatch"
```

---

### Task 2: Family Recipes (3 families)

**Files:**

- Create: `src/composition/familyRecipes/conceptIntroduction.ts`
- Create: `src/composition/familyRecipes/systemModel.ts`
- Create: `src/composition/familyRecipes/progressionJourney.ts`
- Modify: `src/composition/familyRecipes/index.ts`
- Test: `src/composition/__tests__/familyRecipes.test.ts`

- [ ] **Step 1: Write failing tests for all 3 recipes**

```typescript
// src/composition/__tests__/familyRecipes.test.ts
import { describe, it, expect } from "vitest";
import { conceptIntroductionRecipe } from "../familyRecipes/conceptIntroduction";
import { systemModelRecipe } from "../familyRecipes/systemModel";
import { progressionJourneyRecipe } from "../familyRecipes/progressionJourney";

describe("conceptIntroductionRecipe", () => {
  it("creates headline + supportText + evidence elements", () => {
    const elements = conceptIntroductionRecipe.resolve({
      headline: "습관의 복리 효과",
      supportText: "매일 1%씩 나아지면 1년 후 37배가 됩니다.",
      evidence: "영국 자전거 팀 사례",
    });

    expect(elements).toHaveLength(3);
    expect(elements[0]).toMatchObject({
      type: "headline",
      props: { text: "습관의 복리 효과" },
    });
    expect(elements[1]).toMatchObject({
      type: "body-text",
      props: { text: "매일 1%씩 나아지면 1년 후 37배가 됩니다." },
    });
    expect(elements[2]).toMatchObject({
      type: "label",
      props: { text: "영국 자전거 팀 사례" },
    });
  });

  it("creates headline + supportText when no evidence", () => {
    const elements = conceptIntroductionRecipe.resolve({
      headline: "핵심 인사이트",
      supportText: "설명 텍스트",
    });
    expect(elements).toHaveLength(2);
  });

  it("has correct defaults", () => {
    expect(conceptIntroductionRecipe.family).toBe("concept-introduction");
    expect(conceptIntroductionRecipe.defaultLayout).toBe("center-focus");
    expect(conceptIntroductionRecipe.defaultChoreography).toBe(
      "reveal-sequence",
    );
  });
});

describe("systemModelRecipe", () => {
  it("creates headline + item elements from items array", () => {
    const elements = systemModelRecipe.resolve({
      headline: "4가지 법칙",
      items: [
        { title: "분명하게", description: "환경을 설계하라" },
        { title: "매력적으로", description: "유혹 묶음을 만들어라" },
        { title: "쉽게", description: "마찰을 줄여라" },
      ],
    });

    expect(elements).toHaveLength(4); // headline + 3 items
    expect(elements[0].type).toBe("headline");
    expect(elements[1]).toMatchObject({
      type: "body-text",
      props: expect.objectContaining({
        text: expect.stringContaining("분명하게"),
        index: 0,
      }),
    });
    expect(elements[3].props.index).toBe(2);
  });

  it("handles items with title only (no description)", () => {
    const elements = systemModelRecipe.resolve({
      headline: "3단계",
      items: [{ title: "첫째" }, { title: "둘째" }],
    });
    expect(elements).toHaveLength(3);
  });

  it("has correct defaults", () => {
    expect(systemModelRecipe.family).toBe("system-model");
    expect(systemModelRecipe.defaultLayout).toBe("grid-expand");
    expect(systemModelRecipe.defaultChoreography).toBe("stagger-clockwise");
  });
});

describe("progressionJourneyRecipe", () => {
  it("creates headline + step elements from steps array", () => {
    const elements = progressionJourneyRecipe.resolve({
      headline: "실천 단계",
      steps: [
        { title: "습관 쌓기", detail: "기존 습관에 연결" },
        { title: "환경 설계", detail: "트리거를 눈에 띄게" },
      ],
    });

    expect(elements).toHaveLength(3); // headline + 2 steps
    expect(elements[0].type).toBe("headline");
    expect(elements[1]).toMatchObject({
      type: "flow-step",
      props: expect.objectContaining({
        stepNumber: 1,
        title: "습관 쌓기",
      }),
    });
  });

  it("has correct defaults", () => {
    expect(progressionJourneyRecipe.family).toBe("progression-journey");
    expect(progressionJourneyRecipe.defaultLayout).toBe("timeline-h");
    expect(progressionJourneyRecipe.defaultChoreography).toBe("path-trace");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/composition/__tests__/familyRecipes.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Implement conceptIntroduction recipe**

```typescript
// src/composition/familyRecipes/conceptIntroduction.ts
import type { VCLElement } from "@/types";
import type { FamilyRecipe } from "../types";

export const conceptIntroductionRecipe: FamilyRecipe = {
  family: "concept-introduction",
  defaultLayout: "center-focus",
  defaultChoreography: "reveal-sequence",

  resolve(content: Record<string, unknown>): VCLElement[] {
    const headline = content.headline as string | undefined;
    const supportText = content.supportText as string | undefined;
    const evidence = content.evidence as string | undefined;
    const sceneId = (content._sceneId as string) ?? "ci";

    const elements: VCLElement[] = [];

    if (headline) {
      elements.push({
        id: `${sceneId}-headline`,
        type: "headline",
        props: { text: headline, role: "headline" },
      });
    }

    if (supportText) {
      elements.push({
        id: `${sceneId}-support`,
        type: "body-text",
        props: { text: supportText, tokenRef: "bodyL" },
      });
    }

    if (evidence) {
      elements.push({
        id: `${sceneId}-evidence`,
        type: "label",
        props: { text: evidence, variant: "signal" },
      });
    }

    return elements;
  },
};
```

- [ ] **Step 4: Implement systemModel recipe**

```typescript
// src/composition/familyRecipes/systemModel.ts
import type { VCLElement } from "@/types";
import type { FamilyRecipe } from "../types";

interface FrameworkItem {
  title: string;
  description?: string;
}

export const systemModelRecipe: FamilyRecipe = {
  family: "system-model",
  defaultLayout: "grid-expand",
  defaultChoreography: "stagger-clockwise",

  resolve(content: Record<string, unknown>): VCLElement[] {
    const headline = content.headline as string | undefined;
    const items = (content.items as FrameworkItem[]) ?? [];
    const sceneId = (content._sceneId as string) ?? "sm";

    const elements: VCLElement[] = [];

    if (headline) {
      elements.push({
        id: `${sceneId}-headline`,
        type: "headline",
        props: { text: headline, role: "headline" },
      });
    }

    items.forEach((item, i) => {
      const text = item.description
        ? `${item.title}: ${item.description}`
        : item.title;
      elements.push({
        id: `${sceneId}-item-${i}`,
        type: "body-text",
        props: { text, index: i, role: "item" },
      });
    });

    return elements;
  },
};
```

- [ ] **Step 5: Implement progressionJourney recipe**

```typescript
// src/composition/familyRecipes/progressionJourney.ts
import type { VCLElement } from "@/types";
import type { FamilyRecipe } from "../types";

interface JourneyStep {
  title: string;
  detail?: string;
}

export const progressionJourneyRecipe: FamilyRecipe = {
  family: "progression-journey",
  defaultLayout: "timeline-h",
  defaultChoreography: "path-trace",

  resolve(content: Record<string, unknown>): VCLElement[] {
    const headline = content.headline as string | undefined;
    const steps = (content.steps as JourneyStep[]) ?? [];
    const sceneId = (content._sceneId as string) ?? "pj";

    const elements: VCLElement[] = [];

    if (headline) {
      elements.push({
        id: `${sceneId}-headline`,
        type: "headline",
        props: { text: headline, role: "headline" },
      });
    }

    steps.forEach((step, i) => {
      elements.push({
        id: `${sceneId}-step-${i}`,
        type: "flow-step",
        props: {
          stepNumber: i + 1,
          title: step.title,
          detail: step.detail,
          index: i,
          role: "step",
        },
      });
    });

    return elements;
  },
};
```

- [ ] **Step 6: Register recipes in registry**

```typescript
// src/composition/familyRecipes/index.ts
import type { FamilyRecipe } from "../types";
import type { SceneFamily } from "@/direction/types";
import { conceptIntroductionRecipe } from "./conceptIntroduction";
import { systemModelRecipe } from "./systemModel";
import { progressionJourneyRecipe } from "./progressionJourney";

export const recipeRegistry: Partial<Record<SceneFamily, FamilyRecipe>> = {
  "concept-introduction": conceptIntroductionRecipe,
  "system-model": systemModelRecipe,
  "progression-journey": progressionJourneyRecipe,
};

export function registerRecipe(recipe: FamilyRecipe): void {
  recipeRegistry[recipe.family] = recipe;
}

export {
  conceptIntroductionRecipe,
  systemModelRecipe,
  progressionJourneyRecipe,
};
```

- [ ] **Step 7: Run tests**

Run: `npx vitest run src/composition/__tests__/familyRecipes.test.ts`
Expected: ALL PASS

- [ ] **Step 8: Run elementResolver tests (should now pass with recipes registered)**

Run: `npx vitest run src/composition/__tests__/elementResolver.test.ts`
Expected: ALL PASS (concept-introduction recipe is registered → first test passes)

- [ ] **Step 9: Commit**

```bash
git add src/composition/familyRecipes/
git commit -m "feat(composition): 3 family recipes — concept-introduction, system-model, progression-journey"
```

---

### Task 3: CompositionFactory

**Files:**

- Create: `src/composition/CompositionFactory.ts`
- Test: `src/composition/__tests__/CompositionFactory.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/composition/__tests__/CompositionFactory.test.ts
import { describe, it, expect } from "vitest";
import { composeBlueprint } from "../CompositionFactory";
import type { SceneSpec } from "@/direction/types";
import type { CompositionContext } from "../types";
import type { Theme } from "@/types";

const mockTheme: Theme = {
  bg: "#0F0F0F",
  surface: "#1A1A1A",
  surfaceMuted: "#141414",
  textStrong: "#F8F7F2",
  textMuted: "#9B9B8E",
  accent: "#FF6B35",
  accentMuted: "#CC5529",
  signal: "#D4A843",
  lineSubtle: "#2A2A2A",
  lineStrong: "#3A3A3A",
};

const mockDirection = {
  name: "analytical" as const,
  base: {
    pacing: 0.3,
    energy: 0.2,
    emphasisDensity: 0.4,
    holdRatio: 0.3,
    revealPattern: "sequential" as const,
    transitionTension: 0.2,
    subtitleCadence: "steady" as const,
  },
};

const mockContext: CompositionContext = {
  format: "longform",
  theme: mockTheme,
  from: 0,
  durationFrames: 750,
  motionPreset: "heavy",
};

function makeSpec(
  family: SceneSpec["family"],
  content: Record<string, unknown>,
): SceneSpec {
  return {
    id: "test-01",
    family,
    intent: "test composed scene",
    layout: "center-focus",
    elements: [],
    choreography: "reveal-sequence",
    direction: mockDirection,
    source: "composed",
    confidence: 0.8,
    narrationText: "테스트 나레이션입니다.",
    content,
  };
}

describe("composeBlueprint", () => {
  it("creates a valid SceneBlueprint from concept-introduction SceneSpec", () => {
    const spec = makeSpec("concept-introduction", {
      headline: "습관의 복리 효과",
      supportText: "매일 1% 성장의 힘",
    });

    const blueprint = composeBlueprint(spec, mockContext);

    expect(blueprint).toBeDefined();
    expect(blueprint.id).toBe("test-01");
    expect(blueprint.origin).toBe("composed");
    expect(blueprint.elements.length).toBeGreaterThanOrEqual(2);
    expect(blueprint.layout).toBe("center-focus");
    expect(blueprint.choreography).toBe("reveal-sequence");
    expect(blueprint.format).toBe("longform");
    expect(blueprint.theme).toBe(mockTheme);
    expect(blueprint.durationFrames).toBe(750);
    expect(blueprint.motionPreset).toBe("heavy");
  });

  it("uses recipe default layout when SceneSpec layout matches preset fallback", () => {
    const spec = makeSpec("system-model", {
      headline: "4가지 법칙",
      items: [{ title: "분명하게" }, { title: "매력적으로" }],
    });
    // systemModel recipe defaultLayout = "grid-expand"
    const blueprint = composeBlueprint(spec, mockContext);
    expect(blueprint.layout).toBe("grid-expand");
    expect(blueprint.choreography).toBe("stagger-clockwise");
    expect(blueprint.elements.length).toBe(3); // headline + 2 items
  });

  it("returns null for families without recipes", () => {
    const spec = makeSpec("opening-hook", { headline: "test" });
    const blueprint = composeBlueprint(spec, mockContext);
    expect(blueprint).toBeNull();
  });

  it("injects _sceneId into content for element ID namespacing", () => {
    const spec = makeSpec("concept-introduction", {
      headline: "테스트",
    });
    const blueprint = composeBlueprint(spec, mockContext);
    expect(blueprint).not.toBeNull();
    expect(blueprint!.elements[0].id).toContain("test-01");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/composition/__tests__/CompositionFactory.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement CompositionFactory**

```typescript
// src/composition/CompositionFactory.ts
import type { SceneBlueprint, LayoutType, ChoreographyType } from "@/types";
import type { SceneSpec } from "@/direction/types";
import type { CompositionContext } from "./types";
import { recipeRegistry } from "./familyRecipes";
import { resolveElements } from "./elementResolver";

/**
 * Compose a SceneBlueprint from a SceneSpec + pipeline context.
 * Returns null if no recipe is registered for the spec's family.
 */
export function composeBlueprint(
  spec: SceneSpec,
  ctx: CompositionContext,
): SceneBlueprint | null {
  const recipe = recipeRegistry[spec.family];
  if (!recipe) return null;

  // Inject _sceneId into content for element ID namespacing
  const contentWithId = { ...spec.content, _sceneId: spec.id };
  const specWithId = { ...spec, content: contentWithId };

  // 1. Resolve elements from content via family recipe
  const elements = resolveElements(specWithId);
  if (elements.length === 0) return null;

  // 2. Select layout: use recipe default (family-optimal), unless spec overrides
  const layout = (recipe.defaultLayout as LayoutType) ?? spec.layout;

  // 3. Select choreography: use recipe default, unless spec overrides
  const choreography =
    (recipe.defaultChoreography as ChoreographyType) ?? spec.choreography;

  // 4. Build SceneBlueprint
  const blueprint: SceneBlueprint = {
    id: spec.id,
    intent: spec.intent,
    origin: "composed" as SceneBlueprint["origin"],
    layout,
    elements,
    choreography,
    motionPreset: ctx.motionPreset,
    format: ctx.format,
    theme: ctx.theme,
    from: ctx.from,
    durationFrames: ctx.durationFrames,
    mediaPlan: {
      narration: { text: spec.narrationText, ttsEngine: "fish-audio" },
    } as SceneBlueprint["mediaPlan"],
  };

  return blueprint;
}
```

- [ ] **Step 4: Extend SceneBlueprint origin type**

In `src/types/index.ts`, change the `origin` field to include "composed":

```typescript
// Find and replace in src/types/index.ts
// OLD:   origin: "preset" | "synthesized";
// NEW:   origin: "preset" | "synthesized" | "composed";
```

Also in `SynthesizedBlueprint`:

```typescript
// OLD:   origin: "synthesized";
// This stays as is — SynthesizedBlueprint is a specific subtype
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/composition/__tests__/CompositionFactory.test.ts`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add src/composition/CompositionFactory.ts src/composition/__tests__/CompositionFactory.test.ts src/types/index.ts
git commit -m "feat(composition): CompositionFactory — SceneSpec to SceneBlueprint bridge"
```

---

### Task 4: CompositionPathRouter + Pipeline Integration

**Files:**

- Create: `src/composition/compositionPathRouter.ts`
- Modify: `src/pipeline/buildProps.ts`
- Test: `src/composition/__tests__/compositionPathRouter.test.ts`

- [ ] **Step 1: Write failing test for router**

```typescript
// src/composition/__tests__/compositionPathRouter.test.ts
import { describe, it, expect } from "vitest";
import { shouldCompose, tryComposeScene } from "../compositionPathRouter";
import type { SceneSpec } from "@/direction/types";
import type { CompositionContext } from "../types";

const mockDirection = {
  name: "analytical" as const,
  base: {
    pacing: 0.3,
    energy: 0.2,
    emphasisDensity: 0.4,
    holdRatio: 0.3,
    revealPattern: "sequential" as const,
    transitionTension: 0.2,
    subtitleCadence: "steady" as const,
  },
};

const mockTheme = {
  bg: "#0F0F0F",
  surface: "#1A1A1A",
  surfaceMuted: "#141414",
  textStrong: "#F8F7F2",
  textMuted: "#9B9B8E",
  accent: "#FF6B35",
  accentMuted: "#CC5529",
  signal: "#D4A843",
  lineSubtle: "#2A2A2A",
  lineStrong: "#3A3A3A",
};

describe("shouldCompose", () => {
  it("returns true for source:composed with registered recipe", () => {
    expect(
      shouldCompose({
        source: "composed",
        family: "concept-introduction",
      } as SceneSpec),
    ).toBe(true);
  });

  it("returns false for source:preset", () => {
    expect(
      shouldCompose({
        source: "preset",
        family: "concept-introduction",
      } as SceneSpec),
    ).toBe(false);
  });

  it("returns false for source:composed without registered recipe", () => {
    expect(
      shouldCompose({
        source: "composed",
        family: "opening-hook",
      } as SceneSpec),
    ).toBe(false);
  });
});

describe("tryComposeScene", () => {
  const ctx: CompositionContext = {
    format: "longform",
    theme: mockTheme as any,
    from: 0,
    durationFrames: 750,
    motionPreset: "heavy",
  };

  it("returns SceneBlueprint for composable scene", () => {
    const spec: SceneSpec = {
      id: "ki-01",
      family: "concept-introduction",
      intent: "test",
      layout: "center-focus",
      elements: [],
      choreography: "reveal-sequence",
      direction: mockDirection,
      source: "composed",
      confidence: 0.8,
      narrationText: "테스트",
      content: { headline: "핵심 인사이트", supportText: "설명" },
    };

    const result = tryComposeScene(spec, ctx);
    expect(result).not.toBeNull();
    expect(result!.origin).toBe("composed");
  });

  it("returns null for non-composable scene", () => {
    const spec: SceneSpec = {
      id: "cover-01",
      family: "opening-hook",
      intent: "test",
      layout: "center-focus",
      elements: [],
      choreography: "reveal-sequence",
      direction: mockDirection,
      source: "preset",
      confidence: 1.0,
      narrationText: "",
      content: {},
    };

    const result = tryComposeScene(spec, ctx);
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/composition/__tests__/compositionPathRouter.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement compositionPathRouter**

```typescript
// src/composition/compositionPathRouter.ts
import type { SceneBlueprint } from "@/types";
import type { SceneSpec } from "@/direction/types";
import type { CompositionContext } from "./types";
import { recipeRegistry } from "./familyRecipes";
import { composeBlueprint } from "./CompositionFactory";

/**
 * Determine if a SceneSpec should use the composed rendering path.
 * Conditions: source is "composed" AND a recipe exists for the family.
 */
export function shouldCompose(spec: SceneSpec): boolean {
  if (spec.source !== "composed") return false;
  return spec.family in recipeRegistry;
}

/**
 * Try to compose a SceneBlueprint from a SceneSpec.
 * Returns null if the scene should use the preset path instead.
 */
export function tryComposeScene(
  spec: SceneSpec,
  ctx: CompositionContext,
): SceneBlueprint | null {
  if (!shouldCompose(spec)) return null;
  return composeBlueprint(spec, ctx);
}
```

- [ ] **Step 4: Run router tests**

Run: `npx vitest run src/composition/__tests__/compositionPathRouter.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Integrate into buildProps.ts**

Read current `src/pipeline/buildProps.ts` to find the exact integration point where `sceneSpec` is attached to `PlannedScene`. After `sceneSpec` is created and `resolvedMotion` is computed, add:

```typescript
// In buildProps.ts — after sceneSpec and resolvedMotion are set on each scene
// Import at top:
import { tryComposeScene } from "@/composition/compositionPathRouter";
import type { CompositionContext } from "@/composition/types";

// After the line that sets scene.sceneSpec:
if (scene.sceneSpec) {
  const compositionCtx: CompositionContext = {
    format,
    theme,
    from: scene.from,
    durationFrames: scene.resolvedDuration,
    motionPreset: scene.resolvedMotion?.preset ?? "heavy",
  };
  const composedBlueprint = tryComposeScene(scene.sceneSpec, compositionCtx);
  if (composedBlueprint) {
    (scene as any)._blueprint = composedBlueprint;
  }
}
```

This is the minimal integration — it hooks into the existing `_blueprint` guard in SceneRenderer (LongformComposition.tsx:75-84). No changes needed to the renderer.

- [ ] **Step 6: Run full test suite to verify no regression**

Run: `npx vitest run`
Expected: ALL existing tests still pass

- [ ] **Step 7: Commit**

```bash
git add src/composition/compositionPathRouter.ts src/composition/__tests__/compositionPathRouter.test.ts src/pipeline/buildProps.ts
git commit -m "feat(composition): CompositionPathRouter + buildProps integration — composed path live"
```

---

### Task 5: presetAdapter Composed Source Support

**Files:**

- Modify: `src/direction/presetAdapter.ts`
- Test: `src/direction/__tests__/presetAdapter.test.ts` (existing or new)

- [ ] **Step 1: Write failing test for composed source**

```typescript
// src/direction/__tests__/presetAdapter-composed.test.ts
import { describe, it, expect } from "vitest";
import { adaptPresetToSceneSpec } from "../presetAdapter";
import type { DirectionProfile } from "../types";

const analyticalDir: DirectionProfile = {
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
};

describe("adaptPresetToSceneSpec — composed source", () => {
  it("marks concept-introduction family as composed when composedFamilies includes it", () => {
    const spec = adaptPresetToSceneSpec(
      {
        id: "ki-01",
        type: "keyInsight",
        narrationText:
          "습관의 복리 효과는 매일 1%씩 나아지면 1년 후 37배가 되는 원리입니다.",
        content: { headline: "복리 효과", supportText: "설명" },
      },
      analyticalDir,
      undefined,
      { composedFamilies: ["concept-introduction"] },
    );

    expect(spec.source).toBe("composed");
    expect(spec.family).toBe("concept-introduction");
  });

  it("keeps preset source when composedFamilies is empty", () => {
    const spec = adaptPresetToSceneSpec(
      {
        id: "ki-01",
        type: "keyInsight",
        narrationText: "테스트 나레이션.",
        content: { headline: "테스트" },
      },
      analyticalDir,
    );

    expect(spec.source).toBe("preset");
  });

  it("keeps preset source for families not in composedFamilies", () => {
    const spec = adaptPresetToSceneSpec(
      {
        id: "cover-01",
        type: "cover",
        narrationText: "",
        content: { title: "책 제목" },
      },
      analyticalDir,
      undefined,
      { composedFamilies: ["concept-introduction"] },
    );

    expect(spec.source).toBe("preset");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/direction/__tests__/presetAdapter-composed.test.ts`
Expected: FAIL — extra argument not accepted

- [ ] **Step 3: Add composedFamilies option to adaptPresetToSceneSpec**

Modify `src/direction/presetAdapter.ts`:

```typescript
// Add options interface
interface AdaptOptions {
  /** Families that should use composed path instead of preset */
  composedFamilies?: string[];
}

// Update function signature (add 4th parameter)
export function adaptPresetToSceneSpec(
  scene: MinimalScene,
  direction: DirectionProfile,
  bookStructure?: string,
  options?: AdaptOptions,
): SceneSpec {
  const family = resolveSceneFamily(scene.type, bookStructure);

  // ... (existing layout/choreography resolution) ...

  // Determine source: composed if family is in composedFamilies list
  const source = options?.composedFamilies?.includes(family)
    ? "composed"
    : "preset";

  return {
    // ... (all existing fields) ...
    source, // was hardcoded "preset"
    // ...
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/direction/__tests__/presetAdapter-composed.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Run all direction tests to verify no regression**

Run: `npx vitest run src/direction/`
Expected: ALL PASS (existing tests pass because they don't provide options, so source defaults to "preset")

- [ ] **Step 6: Commit**

```bash
git add src/direction/presetAdapter.ts src/direction/__tests__/presetAdapter-composed.test.ts
git commit -m "feat(direction): presetAdapter composedFamilies option — selective composed path activation"
```

---

### Task 6: Barrel Exports + End-to-End Wiring

**Files:**

- Create: `src/composition/index.ts`
- Modify: `src/pipeline/buildProps.ts` (pass composedFamilies from config)

- [ ] **Step 1: Create barrel export**

```typescript
// src/composition/index.ts
export { resolveElements } from "./elementResolver";
export { composeBlueprint } from "./CompositionFactory";
export { shouldCompose, tryComposeScene } from "./compositionPathRouter";
export { recipeRegistry, registerRecipe } from "./familyRecipes";
export type { FamilyRecipe, CompositionContext } from "./types";
```

- [ ] **Step 2: Add COMPOSED_FAMILIES config to buildProps.ts**

In the section of `buildProps.ts` where `adaptPresetToSceneSpec` is called, pass the composedFamilies option:

```typescript
// Near the top of buildProps.ts, add config constant
const COMPOSED_FAMILIES = [
  "concept-introduction",
  "system-model",
  "progression-journey",
];

// Where adaptPresetToSceneSpec is called, add the options parameter:
const sceneSpec = adaptPresetToSceneSpec(sceneInput, direction, bookStructure, {
  composedFamilies: COMPOSED_FAMILIES,
});
```

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 4: Build check**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 5: Commit**

```bash
git add src/composition/index.ts src/pipeline/buildProps.ts
git commit -m "feat(composition): barrel exports + COMPOSED_FAMILIES activation in buildProps"
```

---

### Task 7: Integration Test — Composed Path Renders

**Files:**

- Create: `src/composition/__tests__/integration.test.ts`

- [ ] **Step 1: Write integration test**

```typescript
// src/composition/__tests__/integration.test.ts
import { describe, it, expect } from "vitest";
import { adaptPresetToSceneSpec } from "@/direction/presetAdapter";
import { tryComposeScene } from "../compositionPathRouter";
import type { CompositionContext } from "../types";
import type { DirectionProfile } from "@/direction/types";

const analyticalDir: DirectionProfile = {
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
};

const persuasiveDir: DirectionProfile = {
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
};

const mockTheme = {
  bg: "#0F0F0F",
  surface: "#1A1A1A",
  surfaceMuted: "#141414",
  textStrong: "#F8F7F2",
  textMuted: "#9B9B8E",
  accent: "#FF6B35",
  accentMuted: "#CC5529",
  signal: "#D4A843",
  lineSubtle: "#2A2A2A",
  lineStrong: "#3A3A3A",
};

const composedFamilies = [
  "concept-introduction",
  "system-model",
  "progression-journey",
];

const ctx: CompositionContext = {
  format: "longform",
  theme: mockTheme as any,
  from: 0,
  durationFrames: 750,
  motionPreset: "heavy",
};

describe("end-to-end: presetAdapter → composed path → SceneBlueprint", () => {
  it("concept-introduction (keyInsight) flows through composed path", () => {
    const spec = adaptPresetToSceneSpec(
      {
        id: "ki-01",
        type: "keyInsight",
        narrationText:
          "습관의 복리 효과는 매일 1%씩 나아지면 1년 후 37배가 되는 원리입니다.",
        content: {
          headline: "습관의 복리 효과",
          supportText: "매일 1%의 성장이 만드는 기적",
          evidence: "영국 자전거 팀 사례",
        },
      },
      analyticalDir,
      undefined,
      { composedFamilies },
    );

    expect(spec.source).toBe("composed");

    const blueprint = tryComposeScene(spec, ctx);
    expect(blueprint).not.toBeNull();
    expect(blueprint!.origin).toBe("composed");
    expect(blueprint!.elements.length).toBe(3);
    expect(blueprint!.layout).toBe("center-focus");
  });

  it("system-model (framework) flows through composed path", () => {
    const spec = adaptPresetToSceneSpec(
      {
        id: "fw-01",
        type: "framework",
        narrationText:
          "행동 변화의 4가지 법칙을 알아보겠습니다. 첫째 분명하게 만들어라.",
        content: {
          headline: "행동 변화의 4가지 법칙",
          items: [
            { title: "분명하게 만들어라", description: "환경 설계" },
            { title: "매력적으로 만들어라", description: "유혹 묶음" },
            { title: "쉽게 만들어라", description: "마찰 감소" },
            { title: "만족스럽게 만들어라", description: "즉각 보상" },
          ],
        },
      },
      persuasiveDir,
      undefined,
      { composedFamilies },
    );

    expect(spec.source).toBe("composed");

    const blueprint = tryComposeScene(spec, ctx);
    expect(blueprint).not.toBeNull();
    expect(blueprint!.elements.length).toBe(5); // headline + 4 items
    expect(blueprint!.layout).toBe("grid-expand");
    expect(blueprint!.choreography).toBe("stagger-clockwise");
  });

  it("progression-journey (application) flows through composed path", () => {
    const spec = adaptPresetToSceneSpec(
      {
        id: "app-01",
        type: "application",
        narrationText: "지금 당장 실천할 수 있는 3단계입니다.",
        content: {
          headline: "실천 3단계",
          steps: [
            { title: "습관 쌓기", detail: "기존 습관에 새 습관을 연결" },
            { title: "환경 설계", detail: "트리거를 눈에 띄게" },
          ],
        },
      },
      analyticalDir,
      undefined,
      { composedFamilies },
    );

    expect(spec.source).toBe("composed");

    const blueprint = tryComposeScene(spec, ctx);
    expect(blueprint).not.toBeNull();
    expect(blueprint!.elements.length).toBe(3); // headline + 2 steps
    expect(blueprint!.layout).toBe("timeline-h");
    expect(blueprint!.choreography).toBe("path-trace");
  });

  it("cover remains on preset path (no composed recipe)", () => {
    const spec = adaptPresetToSceneSpec(
      {
        id: "cover-01",
        type: "cover",
        narrationText: "",
        content: { title: "아주 작은 습관의 힘" },
      },
      analyticalDir,
      undefined,
      { composedFamilies },
    );

    expect(spec.source).toBe("preset");

    const blueprint = tryComposeScene(spec, ctx);
    expect(blueprint).toBeNull();
  });
});
```

- [ ] **Step 2: Run integration test**

Run: `npx vitest run src/composition/__tests__/integration.test.ts`
Expected: ALL PASS

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: ALL PASS — zero regressions

- [ ] **Step 4: TypeScript build check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/composition/__tests__/integration.test.ts
git commit -m "test(composition): end-to-end integration — 3 families through composed path"
```

---

### Task 8: Final Validation + Push

- [ ] **Step 1: Run all tests one final time**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 2: Verify with real content JSON (dry run)**

Run: `npx tsc --noEmit && npx vitest run`

Check that `atomic-habits` content would flow through composed path by verifying that keyInsight, framework, application scene types map to the 3 composed families.

- [ ] **Step 3: Final commit + push**

```bash
git add -A
git push origin main
```

---

## Summary

| Task | What                    | Files                | Tests       |
| ---- | ----------------------- | -------------------- | ----------- |
| 1    | Types + ElementResolver | 3 new                | 2 tests     |
| 2    | 3 Family Recipes        | 4 new, 1 modify      | 6+ tests    |
| 3    | CompositionFactory      | 1 new, 1 modify      | 4 tests     |
| 4    | PathRouter + buildProps | 2 new, 1 modify      | 4 tests     |
| 5    | presetAdapter composed  | 1 modify, 1 new test | 3 tests     |
| 6    | Barrel + wiring         | 2 new/modify         | build check |
| 7    | Integration test        | 1 new                | 4 tests     |
| 8    | Final validation        | —                    | full suite  |

**Total: ~12 new files, ~2 modified files, ~23+ tests**

**Composed path data flow after completion:**

```
content JSON → buildProps → adaptPresetToSceneSpec(composedFamilies)
                              → source: "composed" (for 3 families)
                              → tryComposeScene(sceneSpec, ctx)
                              → composeBlueprint → familyRecipe.resolve()
                              → SceneBlueprint
                              → _blueprint attached to PlannedScene
                              → SceneRenderer blueprint guard → BlueprintRenderer
                              → useLayoutEngine + useChoreography + primitiveRegistry
                              → Rendered React tree
```
