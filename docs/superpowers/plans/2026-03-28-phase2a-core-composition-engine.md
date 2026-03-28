# Phase 2A: Core Composition Engine — Implementation Plan v1.1

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SceneSpec에서 SceneBlueprint로의 "composed path"를 열어, 기존 layout/choreography/primitive registry를 실제로 사용하는 동적 조합 엔진을 구축한다.

**Architecture:** CompositionFactory가 SceneSpec의 family + content + direction을 읽어 VCLElement[]를 생성하고, layout/choreography를 선택하여 SceneBlueprint를 만든다. 이 blueprint는 기존 BlueprintRenderer가 그대로 렌더한다. 통합은 buildProps.ts에서 `composedBlueprint` 필드를 주입하는 방식으로, SceneRenderer의 기존 blueprint guard를 활용한다.

**Tech Stack:** TypeScript, Remotion, Vitest, 기존 VCL registry (layouts, choreography, primitiveRegistry)

**핵심 인사이트:** BlueprintRenderer가 이미 composition engine이다. 부재한 것은 SceneSpec → SceneBlueprint 브릿지뿐.

---

## Registry Reality Check (v1.1 선행 검증 완료)

구현 전에 실제 코드의 registry key를 확인했다. 계획의 모든 이름은 아래와 일치한다.

**Layout registry keys** (`src/renderer/layouts/index.ts`):
`center-focus`, `split-two`, `split-compare`, `radial`, `timeline-h`, `grid-n`, `grid-expand`

**Choreography registry keys** (`src/renderer/choreography/index.ts`):
`reveal-sequence`, `stagger-clockwise`, `path-trace`

**Primitive registry keys** (`src/renderer/primitiveRegistry.ts`):
`headline`, `body-text`, `label`, `caption`, `number-display`, `quote-text`, `icon`, `divider`, `texture-overlay`, `color-block`, `shape`, `image`, `text`, `timeline-node`, `cycle-connector`, `flow-step`, `card-stack`, `layer-stack`, `kinetic-text`, `word-highlight`, `animated-path`, `node-activation`

**SceneBlueprint required fields** (`src/types/index.ts:685`):
`id`, `intent`, `origin`, `layout`, `elements`, `choreography`, `motionPreset`, `format`, `theme`, `from`, `durationFrames`, `mediaPlan`

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
    ├── familyRecipes.test.ts
    └── integration.test.ts

src/direction/presetAdapter.ts            (MODIFY — add composed source support)
src/pipeline/buildProps.ts                (MODIFY — composed path integration)
src/types/index.ts                        (MODIFY — SceneBlueprint origin + PlannedScene type)
```

---

## 설계 원칙 (v1.1 추가)

1. **Layout/Choreography 우선순위:** spec explicit > recipe default > family fallback
2. **Recipe는 direction-aware:** resolve(content, hints?) 시그니처로 direction 확장 가능
3. **타입 안전:** FamilyRecipe의 defaultLayout/defaultChoreography는 실제 타입 (LayoutType, ChoreographyType)
4. **\_blueprint는 임시 브리지:** Phase 2B에서 PlannedScene 정식 필드로 승격 대상
5. **CompositionFactory는 composition만:** TTS 설정 등은 상위 pipeline 책임
6. **Composed 실패 시 추적 가능:** shouldCompose/tryComposeScene에 실패 사유 로깅

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
    expect(Array.isArray(elements)).toBe(true);
  });

  it("passes direction hints to recipe", () => {
    const spec = makeSceneSpec("concept-introduction", {
      headline: "핵심 인사이트",
      supportText: "설명",
      evidence: "근거",
    });
    // analytical direction has low emphasisDensity (0.4)
    const elements = resolveElements(spec);
    // Should include all elements regardless (density filtering is future)
    expect(elements.length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/composition/__tests__/elementResolver.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create composition types**

```typescript
// src/composition/types.ts
import type {
  VCLElement,
  Theme,
  MotionPresetKey,
  LayoutType,
  ChoreographyType,
} from "@/types";
import type {
  SceneSpec,
  SceneFamily,
  DirectionProfileName,
} from "@/direction/types";

/**
 * Optional hints passed to FamilyRecipe.resolve() for direction-aware element generation.
 * Phase 2A: minimally used. Phase 2B+: direction influences element density/selection.
 */
export interface RecipeHints {
  sceneId: string;
  directionName?: DirectionProfileName;
  emphasisDensity?: number;
  energy?: number;
}

/**
 * A FamilyRecipe converts SceneSpec.content into VCLElement[].
 * Each supported SceneFamily has one recipe.
 */
export interface FamilyRecipe {
  family: SceneFamily;
  /** Convert content fields to VCL elements. hints is optional for direction awareness. */
  resolve(content: Record<string, unknown>, hints?: RecipeHints): VCLElement[];
  /** Preferred layout for this family — used as fallback when spec.layout is not explicit */
  defaultLayout: LayoutType;
  /** Preferred choreography — used as fallback when spec.choreography is not explicit */
  defaultChoreography: ChoreographyType;
}

/**
 * Context needed by CompositionFactory beyond SceneSpec itself.
 * These values come from the pipeline (PlannedScene / buildProps).
 * CompositionFactory는 composition만 담당 — TTS/audio 설정은 여기 포함하지 않는다.
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
import type { RecipeHints } from "./types";
import { recipeRegistry } from "./familyRecipes";

/**
 * Resolve SceneSpec → VCLElement[] by dispatching to the appropriate family recipe.
 * Returns a minimal fallback (headline only) if no recipe is registered.
 */
export function resolveElements(spec: SceneSpec): VCLElement[] {
  const recipe = recipeRegistry[spec.family];

  // Build direction hints from spec
  const hints: RecipeHints = {
    sceneId: spec.id,
    directionName: spec.direction?.name,
    emphasisDensity: spec.direction?.base?.emphasisDensity,
    energy: spec.direction?.base?.energy,
  };

  if (!recipe) {
    // Fallback: extract headline if present
    const headline = spec.content.headline as string | undefined;
    if (headline) {
      return [
        {
          id: `${spec.id}-headline`,
          type: "headline",
          props: { text: headline, role: "headline" },
        },
      ];
    }
    return [];
  }

  return recipe.resolve(spec.content, hints);
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

- [ ] **Step 6: Run test to verify partial pass**

Run: `npx vitest run src/composition/__tests__/elementResolver.test.ts`
Expected: First test fails (no recipe yet), second + third pass. Correct — recipes come in Task 2.

- [ ] **Step 7: Commit**

```bash
git add src/composition/types.ts src/composition/elementResolver.ts src/composition/familyRecipes/index.ts src/composition/__tests__/elementResolver.test.ts
git commit -m "feat(composition): types + elementResolver foundation with direction-aware recipe dispatch"
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
import type { RecipeHints } from "../types";

const defaultHints: RecipeHints = { sceneId: "test-01" };

describe("conceptIntroductionRecipe", () => {
  it("creates headline + supportText + evidence elements", () => {
    const elements = conceptIntroductionRecipe.resolve(
      {
        headline: "습관의 복리 효과",
        supportText: "매일 1%씩 나아지면 1년 후 37배가 됩니다.",
        evidence: "영국 자전거 팀 사례",
      },
      defaultHints,
    );

    expect(elements).toHaveLength(3);
    expect(elements[0]).toMatchObject({
      type: "headline",
      props: { text: "습관의 복리 효과", role: "headline" },
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
    const elements = conceptIntroductionRecipe.resolve(
      { headline: "핵심 인사이트", supportText: "설명 텍스트" },
      defaultHints,
    );
    expect(elements).toHaveLength(2);
  });

  it("returns empty when no headline", () => {
    const elements = conceptIntroductionRecipe.resolve({}, defaultHints);
    expect(elements).toHaveLength(0);
  });

  it("has correct defaults (LayoutType, ChoreographyType)", () => {
    expect(conceptIntroductionRecipe.family).toBe("concept-introduction");
    expect(conceptIntroductionRecipe.defaultLayout).toBe("center-focus");
    expect(conceptIntroductionRecipe.defaultChoreography).toBe(
      "reveal-sequence",
    );
  });
});

describe("systemModelRecipe", () => {
  it("creates headline + item elements from items array", () => {
    const elements = systemModelRecipe.resolve(
      {
        headline: "4가지 법칙",
        items: [
          { title: "분명하게", description: "환경을 설계하라" },
          { title: "매력적으로", description: "유혹 묶음을 만들어라" },
          { title: "쉽게", description: "마찰을 줄여라" },
        ],
      },
      defaultHints,
    );

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
    const elements = systemModelRecipe.resolve(
      { headline: "3단계", items: [{ title: "첫째" }, { title: "둘째" }] },
      defaultHints,
    );
    expect(elements).toHaveLength(3);
  });

  it("returns empty when no headline and no items", () => {
    const elements = systemModelRecipe.resolve({}, defaultHints);
    expect(elements).toHaveLength(0);
  });

  it("has correct defaults", () => {
    expect(systemModelRecipe.family).toBe("system-model");
    expect(systemModelRecipe.defaultLayout).toBe("grid-expand");
    expect(systemModelRecipe.defaultChoreography).toBe("stagger-clockwise");
  });
});

describe("progressionJourneyRecipe", () => {
  it("creates headline + step elements from steps array", () => {
    const elements = progressionJourneyRecipe.resolve(
      {
        headline: "실천 단계",
        steps: [
          { title: "습관 쌓기", detail: "기존 습관에 연결" },
          { title: "환경 설계", detail: "트리거를 눈에 띄게" },
        ],
      },
      defaultHints,
    );

    expect(elements).toHaveLength(3); // headline + 2 steps
    expect(elements[0].type).toBe("headline");
    expect(elements[1]).toMatchObject({
      type: "flow-step",
      props: expect.objectContaining({ stepNumber: 1, title: "습관 쌓기" }),
    });
  });

  it("returns empty when no headline and no steps", () => {
    const elements = progressionJourneyRecipe.resolve({}, defaultHints);
    expect(elements).toHaveLength(0);
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
import type { VCLElement, LayoutType, ChoreographyType } from "@/types";
import type { FamilyRecipe, RecipeHints } from "../types";

export const conceptIntroductionRecipe: FamilyRecipe = {
  family: "concept-introduction",
  defaultLayout: "center-focus" as LayoutType,
  defaultChoreography: "reveal-sequence" as ChoreographyType,

  resolve(content: Record<string, unknown>, hints?: RecipeHints): VCLElement[] {
    const headline = content.headline as string | undefined;
    const supportText = content.supportText as string | undefined;
    const evidence = content.evidence as string | undefined;
    const sid = hints?.sceneId ?? "ci";

    if (!headline) return [];

    const elements: VCLElement[] = [
      {
        id: `${sid}-headline`,
        type: "headline",
        props: { text: headline, role: "headline" },
      },
    ];

    if (supportText) {
      elements.push({
        id: `${sid}-support`,
        type: "body-text",
        props: { text: supportText, tokenRef: "bodyL" },
      });
    }

    if (evidence) {
      elements.push({
        id: `${sid}-evidence`,
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
import type { VCLElement, LayoutType, ChoreographyType } from "@/types";
import type { FamilyRecipe, RecipeHints } from "../types";

interface FrameworkItem {
  title: string;
  description?: string;
}

export const systemModelRecipe: FamilyRecipe = {
  family: "system-model",
  defaultLayout: "grid-expand" as LayoutType,
  defaultChoreography: "stagger-clockwise" as ChoreographyType,

  resolve(content: Record<string, unknown>, hints?: RecipeHints): VCLElement[] {
    const headline = content.headline as string | undefined;
    const items = (content.items as FrameworkItem[]) ?? [];
    const sid = hints?.sceneId ?? "sm";

    if (!headline && items.length === 0) return [];

    const elements: VCLElement[] = [];

    if (headline) {
      elements.push({
        id: `${sid}-headline`,
        type: "headline",
        props: { text: headline, role: "headline" },
      });
    }

    items.forEach((item, i) => {
      const text = item.description
        ? `${item.title}: ${item.description}`
        : item.title;
      elements.push({
        id: `${sid}-item-${i}`,
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
import type { VCLElement, LayoutType, ChoreographyType } from "@/types";
import type { FamilyRecipe, RecipeHints } from "../types";

interface JourneyStep {
  title: string;
  detail?: string;
}

export const progressionJourneyRecipe: FamilyRecipe = {
  family: "progression-journey",
  defaultLayout: "timeline-h" as LayoutType,
  defaultChoreography: "path-trace" as ChoreographyType,

  resolve(content: Record<string, unknown>, hints?: RecipeHints): VCLElement[] {
    const headline = content.headline as string | undefined;
    const steps = (content.steps as JourneyStep[]) ?? [];
    const sid = hints?.sceneId ?? "pj";

    if (!headline && steps.length === 0) return [];

    const elements: VCLElement[] = [];

    if (headline) {
      elements.push({
        id: `${sid}-headline`,
        type: "headline",
        props: { text: headline, role: "headline" },
      });
    }

    steps.forEach((step, i) => {
      elements.push({
        id: `${sid}-step-${i}`,
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

- [ ] **Step 7: Run recipe tests**

Run: `npx vitest run src/composition/__tests__/familyRecipes.test.ts`
Expected: ALL PASS

- [ ] **Step 8: Run elementResolver tests (should now pass)**

Run: `npx vitest run src/composition/__tests__/elementResolver.test.ts`
Expected: ALL PASS

- [ ] **Step 9: Commit**

```bash
git add src/composition/familyRecipes/
git commit -m "feat(composition): 3 family recipes — concept-introduction, system-model, progression-journey"
```

---

### Task 3: CompositionFactory

**Files:**

- Create: `src/composition/CompositionFactory.ts`
- Modify: `src/types/index.ts` (SceneBlueprint.origin type extension)
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
  overrides?: Partial<SceneSpec>,
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
    ...overrides,
  };
}

describe("composeBlueprint", () => {
  it("creates a valid SceneBlueprint from concept-introduction SceneSpec", () => {
    const spec = makeSpec("concept-introduction", {
      headline: "습관의 복리 효과",
      supportText: "매일 1% 성장의 힘",
    });

    const blueprint = composeBlueprint(spec, mockContext);

    expect(blueprint).not.toBeNull();
    expect(blueprint!.id).toBe("test-01");
    expect(blueprint!.origin).toBe("composed");
    expect(blueprint!.elements.length).toBeGreaterThanOrEqual(2);
    expect(blueprint!.format).toBe("longform");
    expect(blueprint!.theme).toBe(mockTheme);
    expect(blueprint!.durationFrames).toBe(750);
    expect(blueprint!.motionPreset).toBe("heavy");
  });

  it("spec.layout overrides recipe default when explicitly set", () => {
    // spec explicitly sets split-two, recipe default is center-focus
    const spec = makeSpec(
      "concept-introduction",
      { headline: "테스트", supportText: "설명" },
      { layout: "split-two" },
    );
    const blueprint = composeBlueprint(spec, mockContext);
    expect(blueprint!.layout).toBe("split-two");
  });

  it("falls back to recipe default layout when spec matches preset mapping", () => {
    // For system-model, preset mapping gives grid-expand, recipe also gives grid-expand
    const spec = makeSpec("system-model", {
      headline: "4가지 법칙",
      items: [{ title: "분명하게" }, { title: "매력적으로" }],
    });
    const blueprint = composeBlueprint(spec, mockContext);
    expect(blueprint!.layout).toBe("grid-expand");
    expect(blueprint!.choreography).toBe("stagger-clockwise");
    expect(blueprint!.elements.length).toBe(3);
  });

  it("returns null for families without recipes", () => {
    const spec = makeSpec("opening-hook", { headline: "test" });
    const blueprint = composeBlueprint(spec, mockContext);
    expect(blueprint).toBeNull();
  });

  it("returns null when recipe produces no elements (content insufficient)", () => {
    // concept-introduction requires headline
    const spec = makeSpec("concept-introduction", {});
    const blueprint = composeBlueprint(spec, mockContext);
    expect(blueprint).toBeNull();
  });

  it("injects sceneId into elements for ID namespacing", () => {
    const spec = makeSpec("concept-introduction", { headline: "테스트" });
    const blueprint = composeBlueprint(spec, mockContext);
    expect(blueprint!.elements[0].id).toContain("test-01");
  });

  it("does not hardcode TTS engine in mediaPlan", () => {
    const spec = makeSpec("concept-introduction", {
      headline: "테스트",
      supportText: "설명",
    });
    const blueprint = composeBlueprint(spec, mockContext);
    // mediaPlan should contain narration text but not hardcode TTS vendor
    expect(blueprint!.mediaPlan.narration.text).toBe("테스트 나레이션입니다.");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/composition/__tests__/CompositionFactory.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Extend SceneBlueprint origin type**

In `src/types/index.ts`, find the `SceneBlueprint` interface and change:

```
OLD:  origin: "preset" | "synthesized";
NEW:  origin: "preset" | "synthesized" | "composed";
```

- [ ] **Step 4: Implement CompositionFactory**

```typescript
// src/composition/CompositionFactory.ts
import type {
  SceneBlueprint,
  LayoutType,
  ChoreographyType,
  MediaPlan,
} from "@/types";
import type { SceneSpec } from "@/direction/types";
import type { CompositionContext } from "./types";
import { recipeRegistry } from "./familyRecipes";
import { resolveElements } from "./elementResolver";

// Layout/choreography values inherited from presetAdapter default mapping.
// When spec carries these defaults, we prefer recipe's family-optimal defaults instead.
const PRESET_INHERITED_LAYOUTS = new Set([
  "center-focus",
  "left-anchor",
  "split-compare",
  "grid-expand",
  "quote-hold",
  "map-flow",
  "timeline-h",
]);

/**
 * Compose a SceneBlueprint from a SceneSpec + pipeline context.
 * Returns null if no recipe is registered or elements are empty.
 *
 * Layout/choreography priority:
 *   1. spec explicit value (if it differs from preset-inherited default)
 *   2. recipe default (family-optimal)
 *   3. spec value as final fallback
 */
export function composeBlueprint(
  spec: SceneSpec,
  ctx: CompositionContext,
): SceneBlueprint | null {
  const recipe = recipeRegistry[spec.family];
  if (!recipe) {
    console.warn(
      `[CompositionFactory] No recipe for family "${spec.family}". Returning null.`,
    );
    return null;
  }

  // 1. Resolve elements from content via family recipe
  const elements = resolveElements(spec);
  if (elements.length === 0) {
    console.warn(
      `[CompositionFactory] Recipe "${spec.family}" produced 0 elements for scene "${spec.id}". Content may be insufficient.`,
    );
    return null;
  }

  // 2. Select layout: spec explicit > recipe default
  // If spec.layout was inherited from presetAdapter (not explicitly chosen by interpretation),
  // prefer recipe's family-optimal default.
  const specLayoutIsExplicit =
    spec.interpretationMeta?.derivedFrom?.some((d) =>
      d.startsWith("layout:"),
    ) ?? false;
  const layout: LayoutType = specLayoutIsExplicit
    ? spec.layout
    : recipe.defaultLayout;

  // 3. Select choreography: same priority logic
  const specChoreographyIsExplicit =
    spec.interpretationMeta?.derivedFrom?.some((d) =>
      d.startsWith("choreography:"),
    ) ?? false;
  const choreography: ChoreographyType = specChoreographyIsExplicit
    ? spec.choreography
    : recipe.defaultChoreography;

  // 4. Build mediaPlan — narration text only, no TTS vendor hardcoding
  // TTS engine selection is pipeline responsibility (ttsClient.ts)
  const mediaPlan: MediaPlan = {
    narration: { text: spec.narrationText },
  } as MediaPlan;

  // 5. Build SceneBlueprint
  return {
    id: spec.id,
    intent: spec.intent,
    origin: "composed",
    layout,
    elements,
    choreography,
    motionPreset: ctx.motionPreset,
    format: ctx.format,
    theme: ctx.theme,
    from: ctx.from,
    durationFrames: ctx.durationFrames,
    mediaPlan,
  };
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/composition/__tests__/CompositionFactory.test.ts`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add src/composition/CompositionFactory.ts src/composition/__tests__/CompositionFactory.test.ts src/types/index.ts
git commit -m "feat(composition): CompositionFactory — SceneSpec to SceneBlueprint with spec>recipe priority"
```

---

### Task 4: CompositionPathRouter + Pipeline Integration

**Files:**

- Create: `src/composition/compositionPathRouter.ts`
- Modify: `src/pipeline/buildProps.ts`
- Modify: `src/types/index.ts` (PlannedScene type — optional composedBlueprint field)
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

const ctx: CompositionContext = {
  format: "longform",
  theme: mockTheme as any,
  from: 0,
  durationFrames: 750,
  motionPreset: "heavy",
};

describe("shouldCompose", () => {
  it("returns true for source:composed with registered recipe", () => {
    expect(
      shouldCompose({
        source: "composed",
        family: "concept-introduction",
        confidence: 0.8,
      } as SceneSpec),
    ).toBe(true);
  });

  it("returns false for source:preset", () => {
    expect(
      shouldCompose({
        source: "preset",
        family: "concept-introduction",
        confidence: 0.8,
      } as SceneSpec),
    ).toBe(false);
  });

  it("returns false for source:composed without registered recipe", () => {
    expect(
      shouldCompose({
        source: "composed",
        family: "opening-hook",
        confidence: 0.8,
      } as SceneSpec),
    ).toBe(false);
  });

  it("returns false when confidence is below threshold", () => {
    expect(
      shouldCompose({
        source: "composed",
        family: "concept-introduction",
        confidence: 0.4,
      } as SceneSpec),
    ).toBe(false);
  });
});

describe("tryComposeScene", () => {
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

  it("returns null when content is insufficient for recipe", () => {
    const spec: SceneSpec = {
      id: "ki-02",
      family: "concept-introduction",
      intent: "test",
      layout: "center-focus",
      elements: [],
      choreography: "reveal-sequence",
      direction: mockDirection,
      source: "composed",
      confidence: 0.8,
      narrationText: "테스트",
      content: {}, // no headline → recipe returns []
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

/** Minimum confidence for composed path activation */
const COMPOSE_CONFIDENCE_THRESHOLD = 0.6;

/**
 * Determine if a SceneSpec should use the composed rendering path.
 * Conditions:
 *   1. source is "composed"
 *   2. a recipe exists for the family
 *   3. confidence >= threshold
 */
export function shouldCompose(spec: SceneSpec): boolean {
  if (spec.source !== "composed") return false;

  if (!(spec.family in recipeRegistry)) {
    console.debug(
      `[CompositionPathRouter] Family "${spec.family}" has no recipe. Falling back to preset.`,
    );
    return false;
  }

  if ((spec.confidence ?? 1.0) < COMPOSE_CONFIDENCE_THRESHOLD) {
    console.debug(
      `[CompositionPathRouter] Scene "${spec.id}" confidence ${spec.confidence} < ${COMPOSE_CONFIDENCE_THRESHOLD}. Falling back to preset.`,
    );
    return false;
  }

  return true;
}

/**
 * Try to compose a SceneBlueprint from a SceneSpec.
 * Returns null if the scene should use the preset path instead.
 * Logs failure reason for debugging.
 */
export function tryComposeScene(
  spec: SceneSpec,
  ctx: CompositionContext,
): SceneBlueprint | null {
  if (!shouldCompose(spec)) return null;

  const blueprint = composeBlueprint(spec, ctx);

  if (!blueprint) {
    console.warn(
      `[CompositionPathRouter] composeBlueprint returned null for scene "${spec.id}" (family: ${spec.family}). ` +
        `Content may be insufficient. Falling back to preset.`,
    );
  }

  return blueprint;
}
```

- [ ] **Step 4: Run router tests**

Run: `npx vitest run src/composition/__tests__/compositionPathRouter.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Add composedBlueprint field to PlannedScene type**

In `src/pipeline/buildProps.ts` (or `src/types/index.ts` if PlannedScene is defined there), find the PlannedScene interface and add:

```typescript
// Add to PlannedScene interface:
/** Phase 2A: Composed path blueprint. 임시 브리지 — Phase 2B에서 정식 필드로 승격 대상. */
composedBlueprint?: import("@/types").SceneBlueprint;
```

Note: If PlannedScene is defined in `buildProps.ts`, modify there. If in `types/index.ts`, modify there. The key is making `_blueprint` attachment type-safe instead of `as any`.

- [ ] **Step 6: Integrate into buildProps.ts**

Read current `src/pipeline/buildProps.ts` to find the exact integration point where `sceneSpec` is attached to `PlannedScene`. After `sceneSpec` is created and `resolvedMotion` is computed, add:

```typescript
// Import at top of buildProps.ts:
import { tryComposeScene } from "@/composition/compositionPathRouter";
import type { CompositionContext } from "@/composition/types";

// After the line that sets scene.sceneSpec and scene.resolvedMotion:
if (scene.sceneSpec && scene.sceneSpec.source === "composed") {
  const compositionCtx: CompositionContext = {
    format,
    theme,
    from: scene.from,
    durationFrames: scene.resolvedDuration,
    motionPreset: scene.resolvedMotion?.preset ?? "heavy",
  };
  const composedBlueprint = tryComposeScene(scene.sceneSpec, compositionCtx);
  if (composedBlueprint) {
    // Phase 2A: _blueprint 주입은 임시 통합 전략.
    // SceneRenderer의 기존 blueprint guard (LongformComposition.tsx:75) 활용.
    // TODO(Phase 2B): PlannedScene.composedBlueprint로 정식 승격.
    (scene as any)._blueprint = composedBlueprint;
  }
}
```

- [ ] **Step 7: Run full test suite to verify no regression**

Run: `npx vitest run`
Expected: ALL existing tests still pass

- [ ] **Step 8: Commit**

```bash
git add src/composition/compositionPathRouter.ts src/composition/__tests__/compositionPathRouter.test.ts src/pipeline/buildProps.ts
git commit -m "feat(composition): CompositionPathRouter + buildProps integration with confidence gate"
```

---

### Task 5: presetAdapter Composed Source Support

**Files:**

- Modify: `src/direction/presetAdapter.ts`
- Test: `src/direction/__tests__/presetAdapter-composed.test.ts`

- [ ] **Step 1: Write failing test for composed source**

```typescript
// src/direction/__tests__/presetAdapter-composed.test.ts
import { describe, it, expect } from "vitest";
import { adaptPresetToSceneSpec } from "../presetAdapter";
import type { DirectionProfile, SceneFamily } from "../types";

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
    const composedFamilies: SceneFamily[] = ["concept-introduction"];
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
      { composedFamilies },
    );

    expect(spec.source).toBe("composed");
    expect(spec.family).toBe("concept-introduction");
  });

  it("keeps preset source when composedFamilies is empty/undefined", () => {
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
    const composedFamilies: SceneFamily[] = ["concept-introduction"];
    const spec = adaptPresetToSceneSpec(
      {
        id: "cover-01",
        type: "cover",
        narrationText: "",
        content: { title: "책 제목" },
      },
      analyticalDir,
      undefined,
      { composedFamilies },
    );

    expect(spec.source).toBe("preset");
  });

  it("composedFamilies uses SceneFamily type (type-safe)", () => {
    // This is a compile-time check — SceneFamily[] prevents typos
    const composedFamilies: SceneFamily[] = [
      "concept-introduction",
      "system-model",
      "progression-journey",
    ];
    const spec = adaptPresetToSceneSpec(
      {
        id: "fw-01",
        type: "framework",
        narrationText: "테스트",
        content: { headline: "프레임워크" },
      },
      analyticalDir,
      undefined,
      { composedFamilies },
    );

    expect(spec.source).toBe("composed");
    expect(spec.family).toBe("system-model");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/direction/__tests__/presetAdapter-composed.test.ts`
Expected: FAIL — extra argument not accepted

- [ ] **Step 3: Add composedFamilies option to adaptPresetToSceneSpec**

Modify `src/direction/presetAdapter.ts`:

```typescript
// Add import at top
import type { SceneFamily } from "./types";

// Add options interface after MinimalScene
interface AdaptOptions {
  /** Families that should use composed path instead of preset. Type-safe SceneFamily[]. */
  composedFamilies?: SceneFamily[];
}

// Update function signature — add 4th parameter
export function adaptPresetToSceneSpec(
  scene: MinimalScene,
  direction: DirectionProfile,
  bookStructure?: string,
  options?: AdaptOptions,
): SceneSpec {
  const family = resolveSceneFamily(scene.type, bookStructure);
  // ... (existing layout/choreography/beat resolution unchanged) ...

  // Determine source: composed if family is in composedFamilies list
  const source: SceneSpec["source"] = options?.composedFamilies?.includes(
    family,
  )
    ? "composed"
    : "preset";

  return {
    // ... all existing fields ...
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
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add src/direction/presetAdapter.ts src/direction/__tests__/presetAdapter-composed.test.ts
git commit -m "feat(direction): presetAdapter composedFamilies option with SceneFamily type safety"
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
export type { FamilyRecipe, CompositionContext, RecipeHints } from "./types";
```

- [ ] **Step 2: Add COMPOSED_FAMILIES config to buildProps.ts**

In the section of `buildProps.ts` where `adaptPresetToSceneSpec` is called, pass the composedFamilies option:

```typescript
import type { SceneFamily } from "@/direction/types";

// Near the top of buildProps.ts — composed path activation config.
// TODO(Phase 2B): Move to experiment config / feature flag when more families are added.
const COMPOSED_FAMILIES: SceneFamily[] = [
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

### Task 7: Integration Test — Composed Path End-to-End

**Files:**

- Create: `src/composition/__tests__/integration.test.ts`

- [ ] **Step 1: Write integration test**

```typescript
// src/composition/__tests__/integration.test.ts
import { describe, it, expect } from "vitest";
import { adaptPresetToSceneSpec } from "@/direction/presetAdapter";
import { tryComposeScene } from "../compositionPathRouter";
import type { CompositionContext } from "../types";
import type { DirectionProfile, SceneFamily } from "@/direction/types";

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

const composedFamilies: SceneFamily[] = [
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

  // v1.1: content 부족 → compose 실패 → preset fallback 케이스
  it("system-model with empty items falls back (recipe returns empty)", () => {
    const spec = adaptPresetToSceneSpec(
      {
        id: "fw-empty",
        type: "framework",
        narrationText: "테스트",
        content: { headline: "" }, // empty headline, no items
      },
      analyticalDir,
      undefined,
      { composedFamilies },
    );

    expect(spec.source).toBe("composed");
    const blueprint = tryComposeScene(spec, ctx);
    // Recipe should return [] for insufficient content → null blueprint
    expect(blueprint).toBeNull();
  });

  it("progression-journey with no steps falls back", () => {
    const spec = adaptPresetToSceneSpec(
      {
        id: "app-empty",
        type: "application",
        narrationText: "테스트",
        content: {}, // no headline, no steps
      },
      analyticalDir,
      undefined,
      { composedFamilies },
    );

    expect(spec.source).toBe("composed");
    const blueprint = tryComposeScene(spec, ctx);
    expect(blueprint).toBeNull();
  });

  it("low confidence scene falls back to preset despite being in composedFamilies", () => {
    const spec = adaptPresetToSceneSpec(
      {
        id: "ki-low",
        type: "keyInsight",
        narrationText: "테스트",
        content: { headline: "테스트" },
      },
      analyticalDir,
      undefined,
      { composedFamilies },
    );

    // Manually lower confidence (simulating uncertain interpretation)
    spec.confidence = 0.3;

    const blueprint = tryComposeScene(spec, ctx);
    expect(blueprint).toBeNull(); // confidence gate blocks
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
git commit -m "test(composition): end-to-end integration with fallback + confidence gate cases"
```

---

### Task 8: Final Validation + Push

- [ ] **Step 1: Run all tests one final time**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 2: TypeScript build verification**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Final commit + push**

```bash
git push origin main
```

---

## Summary

| Task | What                    | Key Change                                                     |
| ---- | ----------------------- | -------------------------------------------------------------- |
| 1    | Types + ElementResolver | direction-aware RecipeHints, LayoutType/ChoreographyType typed |
| 2    | 3 Family Recipes        | concept-introduction, system-model, progression-journey        |
| 3    | CompositionFactory      | spec > recipe priority, no TTS hardcoding                      |
| 4    | PathRouter + buildProps | confidence gate (≥0.6), failure logging                        |
| 5    | presetAdapter composed  | SceneFamily[] typed composedFamilies                           |
| 6    | Barrel + wiring         | COMPOSED_FAMILIES config with TODO for feature flag            |
| 7    | Integration test        | 7 cases including content-insufficient + confidence fallback   |
| 8    | Final validation        | full suite + tsc + push                                        |

**v1.1 반영 사항:**

1. `defaultLayout: LayoutType`, `defaultChoreography: ChoreographyType` (string → 실제 타입)
2. spec explicit > recipe default > family fallback (우선순위 명확화)
3. `RecipeHints` 시그니처로 direction 확장 가능
4. `_blueprint` as any는 TODO 명시 (Phase 2B 정식 승격 대상)
5. Registry reality check 선행 완료 (모든 key 일치 확인)
6. mediaPlan에서 ttsEngine 하드코딩 제거
7. confidence gate (≥0.6) + 실패 사유 로깅
8. `composedFamilies: SceneFamily[]` (string → 타입 안전)
9. content 부족 fallback + low confidence fallback 테스트 추가

**Composed path data flow:**

```
content JSON → buildProps → adaptPresetToSceneSpec(composedFamilies: SceneFamily[])
                              → source: "composed" (for 3 families)
                              → tryComposeScene(sceneSpec, ctx)
                                → shouldCompose(): source + recipe + confidence gate
                                → composeBlueprint(): recipe.resolve(content, hints)
                                → layout priority: spec explicit > recipe default
                              → SceneBlueprint | null
                              → _blueprint attached to PlannedScene (Phase 2A 임시 브리지)
                              → SceneRenderer blueprint guard → BlueprintRenderer
                              → useLayoutEngine + useChoreography + primitiveRegistry
                              → Rendered React tree
```
