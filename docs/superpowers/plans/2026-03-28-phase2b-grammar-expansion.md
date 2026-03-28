# Phase 2B-1: Grammar Expansion — Recipe & Choreography Sprint

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Composed path 지원 family를 3개에서 10개로 확장하여, 기존 registry 자산만으로 대부분의 씬이 composed path를 사용할 수 있게 한다.

**Architecture:** Phase 2A에서 만든 CompositionFactory + familyRecipes 구조 위에 7개 새 recipe를 추가한다. 각 recipe는 content type의 실제 필드를 VCLElement[]로 매핑한다. split-reveal choreography 1개만 신규 생성하고, 나머지는 기존 layout/choreography/primitive를 재사용한다.

**Tech Stack:** TypeScript, Vitest, 기존 VCL registry (layouts, choreography, primitiveRegistry)

---

## Registry Reality Check

**사용 가능한 layout:** center-focus, split-two, split-compare, radial, timeline-h, grid-n, grid-expand
**사용 가능한 choreography:** reveal-sequence, stagger-clockwise, path-trace (+ split-reveal: Task 1에서 추가)
**사용 가능한 primitive:** headline, body-text, label, caption, number-display, quote-text, icon, divider, flow-step, timeline-node, cycle-connector, card-stack, layer-stack, kinetic-text, word-highlight, animated-path, node-activation, image, shape, color-block, texture-overlay

## Family → Recipe Bootstrap Mapping

> **주의:** 아래 매핑은 Phase 2B-1에서 지원하는 **bootstrap mapping**이며, family와 content type의 장기적 관계를 고정하는 canonical mapping이 아니다. 향후 Interpretation Engine(Phase 3)이 family → layout/choreography를 동적으로 선택할 수 있어야 한다.

| Family                | Content Type                    | Layout        | Choreography      | Key Primitives                               | Sub-modes          | Task |
| --------------------- | ------------------------------- | ------------- | ----------------- | -------------------------------------------- | ------------------ | ---- |
| closing-synthesis     | ClosingContent                  | center-focus  | reveal-sequence   | headline, label                              | —                  | 2    |
| structural-bridge     | ChapterDividerContent           | center-focus  | reveal-sequence   | headline, body-text, divider, number-display | —                  | 2    |
| opening-hook          | CoverContent, HighlightContent  | center-focus  | reveal-sequence   | headline, caption, image, body-text          | cover \| highlight | 3    |
| reflective-anchor     | QuoteContent, SplitQuoteContent | center-focus  | reveal-sequence   | quote-text, caption, divider                 | single \| split    | 3    |
| mechanism-explanation | FrameworkContent                | radial\*      | stagger-clockwise | headline, body-text                          | —                  | 4    |
| tension-comparison    | CompareContrastContent          | split-compare | split-reveal      | label, body-text                             | —                  | 5    |
| evidence-stack        | DataContent, ListRevealContent  | grid-expand   | stagger-clockwise | headline, body-text                          | data \| list       | 5    |

\* mechanism-explanation의 radial + stagger-clockwise는 초기 bootstrap grammar이며, family의 장기적 표현 범위를 제한하지 않는다. 향후 flow, timeline, causal-chain 등 다양한 grammar로 확장 가능.

## File Structure

```
src/renderer/choreography/
├── splitReveal.ts                        (NEW — split-reveal choreography)
├── index.ts                              (MODIFY — register split-reveal)

src/composition/familyRecipes/
├── closingSynthesis.ts                   (NEW)
├── structuralBridge.ts                   (NEW)
├── openingHook.ts                        (NEW)
├── reflectiveAnchor.ts                   (NEW)
├── mechanismExplanation.ts               (NEW)
├── tensionComparison.ts                  (NEW)
├── evidenceStack.ts                      (NEW)
├── index.ts                              (MODIFY — register all 7)

src/composition/__tests__/
├── familyRecipes-phase2b.test.ts         (NEW — all 7 recipe tests)
├── splitReveal.test.ts                   (NEW — choreography test)
├── integration-phase2b.test.ts           (NEW — E2E with all families)

src/pipeline/buildProps.ts                (MODIFY — expand COMPOSED_FAMILIES)
```

---

### Task 1: split-reveal Choreography

**Files:**

- Create: `src/renderer/choreography/splitReveal.ts`
- Modify: `src/renderer/choreography/index.ts`
- Test: `src/composition/__tests__/splitReveal.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/composition/__tests__/splitReveal.test.ts
import { describe, it, expect } from "vitest";
import { splitReveal } from "@/renderer/choreography/splitReveal";
import type { VCLElement } from "@/types";

const makeElement = (id: string): VCLElement => ({
  id,
  type: "body-text",
  props: { text: id },
});

describe("splitReveal choreography", () => {
  it("staggers left elements before right elements", () => {
    const elements: VCLElement[] = [
      makeElement("left-label"),
      makeElement("left-content"),
      makeElement("right-label"),
      makeElement("right-content"),
    ];

    const timings = splitReveal(elements, 150, "smooth");

    expect(timings).toHaveLength(4);
    // First half (left) starts before second half (right)
    expect(timings[0].delayFrames).toBeLessThan(timings[2].delayFrames);
    expect(timings[1].delayFrames).toBeLessThan(timings[3].delayFrames);
    // All have positive duration
    timings.forEach((t) => expect(t.durationFrames).toBeGreaterThan(0));
  });

  it("handles odd number of elements", () => {
    const elements = [makeElement("a"), makeElement("b"), makeElement("c")];
    const timings = splitReveal(elements, 120, "smooth");
    expect(timings).toHaveLength(3);
  });

  it("handles single element", () => {
    const elements = [makeElement("solo")];
    const timings = splitReveal(elements, 90, "smooth");
    expect(timings).toHaveLength(1);
    expect(timings[0].delayFrames).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/composition/__tests__/splitReveal.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement splitReveal choreography**

```typescript
// src/renderer/choreography/splitReveal.ts
import type { VCLElement, MotionPresetKey } from "@/types";
import type { ChoreographyTiming } from "./types";

const STAGGER_MAP: Record<string, number> = {
  gentle: 8,
  smooth: 6,
  snappy: 4,
  heavy: 5,
  dramatic: 7,
  wordReveal: 4,
  punchy: 3,
};

/**
 * Split-reveal: first half of elements enter, then second half.
 * Designed for split layouts (left/right, before/after).
 * Within each half, elements stagger with preset-based delay.
 */
export function splitReveal(
  elements: VCLElement[],
  totalDuration: number,
  preset: MotionPresetKey,
  _config?: Record<string, unknown>,
): ChoreographyTiming[] {
  const stagger = STAGGER_MAP[preset] ?? 5;
  const midIndex = Math.ceil(elements.length / 2);
  const secondHalfDelay = midIndex * stagger + 12; // gap between halves

  return elements.map((_, i) => {
    const isSecondHalf = i >= midIndex;
    const localIndex = isSecondHalf ? i - midIndex : i;
    const delayFrames = isSecondHalf
      ? secondHalfDelay + localIndex * stagger
      : localIndex * stagger;

    return {
      delayFrames,
      durationFrames: Math.max(totalDuration - delayFrames, 30),
    };
  });
}
```

- [ ] **Step 4: Register in choreography index**

In `src/renderer/choreography/index.ts`, add:

```typescript
// Add import
import { splitReveal } from "./splitReveal";

// Add export
export { splitReveal };

// Add to registry
export const choreographyRegistry: Record<string, ChoreographyFunction> = {
  "reveal-sequence": revealSequence,
  "stagger-clockwise": staggerClockwise,
  "path-trace": pathTrace,
  "split-reveal": splitReveal, // NEW
};
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/composition/__tests__/splitReveal.test.ts`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add src/renderer/choreography/splitReveal.ts src/renderer/choreography/index.ts src/composition/__tests__/splitReveal.test.ts
git commit -m "feat(choreography): split-reveal — left-then-right stagger for split layouts"
```

---

### Task 2: Simple Recipes — closing-synthesis + structural-bridge

**Files:**

- Create: `src/composition/familyRecipes/closingSynthesis.ts`
- Create: `src/composition/familyRecipes/structuralBridge.ts`
- Modify: `src/composition/familyRecipes/index.ts`
- Test: `src/composition/__tests__/familyRecipes-phase2b.test.ts` (start file)

- [ ] **Step 1: Write failing tests**

```typescript
// src/composition/__tests__/familyRecipes-phase2b.test.ts
import { describe, it, expect } from "vitest";
import { closingSynthesisRecipe } from "../familyRecipes/closingSynthesis";
import { structuralBridgeRecipe } from "../familyRecipes/structuralBridge";
import type { RecipeHints } from "../types";

const h: RecipeHints = { sceneId: "test" };

describe("closingSynthesisRecipe", () => {
  it("creates recap + cta elements", () => {
    const elements = closingSynthesisRecipe.resolve(
      {
        recapStatement: "오늘의 핵심은 습관의 복리입니다.",
        ctaText: "구독과 좋아요!",
      },
      h,
    );
    expect(elements.length).toBe(2);
    expect(elements[0]).toMatchObject({
      type: "headline",
      props: { text: "오늘의 핵심은 습관의 복리입니다." },
    });
    expect(elements[1]).toMatchObject({
      type: "label",
      props: { text: "구독과 좋아요!" },
    });
  });

  it("creates recap only when no cta", () => {
    const elements = closingSynthesisRecipe.resolve(
      { recapStatement: "핵심 요약" },
      h,
    );
    expect(elements.length).toBe(1);
  });

  it("returns empty when no recapStatement", () => {
    expect(closingSynthesisRecipe.resolve({}, h)).toHaveLength(0);
  });

  it("has correct defaults", () => {
    expect(closingSynthesisRecipe.family).toBe("closing-synthesis");
    expect(closingSynthesisRecipe.defaultLayout).toBe("center-focus");
  });
});

describe("structuralBridgeRecipe", () => {
  it("creates divider + chapter number + title elements", () => {
    const elements = structuralBridgeRecipe.resolve(
      { chapterNumber: 3, chapterTitle: "환경의 힘" },
      h,
    );
    expect(elements.length).toBe(3);
    expect(elements[0]).toMatchObject({ type: "divider" });
    expect(elements[1]).toMatchObject({
      type: "number-display",
      props: { value: 3 },
    });
    expect(elements[2]).toMatchObject({
      type: "headline",
      props: { text: "환경의 힘" },
    });
  });

  it("adds subtitle when present", () => {
    const elements = structuralBridgeRecipe.resolve(
      {
        chapterNumber: 1,
        chapterTitle: "시작",
        chapterSubtitle: "습관의 기초",
      },
      h,
    );
    expect(elements.length).toBe(4);
    expect(elements[3]).toMatchObject({
      type: "body-text",
      props: { text: "습관의 기초" },
    });
  });

  it("returns empty when no chapterTitle", () => {
    expect(structuralBridgeRecipe.resolve({}, h)).toHaveLength(0);
  });

  it("has correct defaults", () => {
    expect(structuralBridgeRecipe.family).toBe("structural-bridge");
    expect(structuralBridgeRecipe.defaultLayout).toBe("center-focus");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/composition/__tests__/familyRecipes-phase2b.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Implement closingSynthesis recipe**

```typescript
// src/composition/familyRecipes/closingSynthesis.ts
import type { VCLElement, LayoutType, ChoreographyType } from "@/types";
import type { FamilyRecipe, RecipeHints } from "../types";

export const closingSynthesisRecipe: FamilyRecipe = {
  family: "closing-synthesis",
  defaultLayout: "center-focus" as LayoutType,
  defaultChoreography: "reveal-sequence" as ChoreographyType,

  resolve(content: Record<string, unknown>, hints?: RecipeHints): VCLElement[] {
    const recap = content.recapStatement as string | undefined;
    const cta = content.ctaText as string | undefined;
    const sid = hints?.sceneId ?? "cs";

    if (!recap) return [];

    const elements: VCLElement[] = [
      {
        id: `${sid}-recap`,
        type: "headline",
        props: { text: recap, role: "headline" },
      },
    ];

    if (cta) {
      elements.push({
        id: `${sid}-cta`,
        type: "label",
        props: { text: cta, variant: "accent" },
      });
    }

    return elements;
  },
};
```

- [ ] **Step 4: Implement structuralBridge recipe**

```typescript
// src/composition/familyRecipes/structuralBridge.ts
import type { VCLElement, LayoutType, ChoreographyType } from "@/types";
import type { FamilyRecipe, RecipeHints } from "../types";

export const structuralBridgeRecipe: FamilyRecipe = {
  family: "structural-bridge",
  defaultLayout: "center-focus" as LayoutType,
  defaultChoreography: "reveal-sequence" as ChoreographyType,

  resolve(content: Record<string, unknown>, hints?: RecipeHints): VCLElement[] {
    const chapterNumber = content.chapterNumber as number | undefined;
    const chapterTitle = content.chapterTitle as string | undefined;
    const chapterSubtitle = content.chapterSubtitle as string | undefined;
    const sid = hints?.sceneId ?? "sb";

    if (!chapterTitle) return [];

    const elements: VCLElement[] = [
      {
        id: `${sid}-divider`,
        type: "divider",
        props: { orientation: "horizontal" },
      },
    ];

    if (chapterNumber != null) {
      elements.push({
        id: `${sid}-number`,
        type: "number-display",
        props: { value: chapterNumber, variant: "signal" },
      });
    }

    elements.push({
      id: `${sid}-title`,
      type: "headline",
      props: { text: chapterTitle, role: "headline" },
    });

    if (chapterSubtitle) {
      elements.push({
        id: `${sid}-subtitle`,
        type: "body-text",
        props: { text: chapterSubtitle, tokenRef: "bodyM" },
      });
    }

    return elements;
  },
};
```

- [ ] **Step 5: Register both in familyRecipes/index.ts**

Add imports and register:

```typescript
import { closingSynthesisRecipe } from "./closingSynthesis";
import { structuralBridgeRecipe } from "./structuralBridge";

// Add to recipeRegistry:
"closing-synthesis": closingSynthesisRecipe,
"structural-bridge": structuralBridgeRecipe,

// Add to exports
export { closingSynthesisRecipe, structuralBridgeRecipe };
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run src/composition/__tests__/familyRecipes-phase2b.test.ts`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add src/composition/familyRecipes/closingSynthesis.ts src/composition/familyRecipes/structuralBridge.ts src/composition/familyRecipes/index.ts src/composition/__tests__/familyRecipes-phase2b.test.ts
git commit -m "feat(composition): closing-synthesis + structural-bridge recipes"
```

---

### Task 3: opening-hook + reflective-anchor Recipes

**Files:**

- Create: `src/composition/familyRecipes/openingHook.ts`
- Create: `src/composition/familyRecipes/reflectiveAnchor.ts`
- Modify: `src/composition/familyRecipes/index.ts`
- Modify: `src/composition/__tests__/familyRecipes-phase2b.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `src/composition/__tests__/familyRecipes-phase2b.test.ts`:

```typescript
import { openingHookRecipe } from "../familyRecipes/openingHook";
import { reflectiveAnchorRecipe } from "../familyRecipes/reflectiveAnchor";

describe("openingHookRecipe", () => {
  it("creates title + author elements from CoverContent", () => {
    const elements = openingHookRecipe.resolve(
      {
        title: "아주 작은 습관의 힘",
        author: "제임스 클리어",
        coverImageUrl: "covers/atomic.png",
      },
      h,
    );
    expect(elements.length).toBeGreaterThanOrEqual(2);
    expect(elements[0]).toMatchObject({
      type: "headline",
      props: { text: "아주 작은 습관의 힘" },
    });
    expect(elements.find((e) => e.type === "caption")).toBeDefined();
  });

  it("creates mainText element from HighlightContent", () => {
    const elements = openingHookRecipe.resolve(
      { mainText: "당신의 습관이 당신을 만든다" },
      h,
    );
    expect(elements.length).toBeGreaterThanOrEqual(1);
    expect(elements[0]).toMatchObject({ type: "headline" });
  });

  it("returns empty when no title and no mainText", () => {
    expect(openingHookRecipe.resolve({}, h)).toHaveLength(0);
  });

  it("has correct defaults", () => {
    expect(openingHookRecipe.family).toBe("opening-hook");
    expect(openingHookRecipe.defaultLayout).toBe("center-focus");
  });
});

describe("reflectiveAnchorRecipe", () => {
  it("creates quote + attribution from QuoteContent", () => {
    const elements = reflectiveAnchorRecipe.resolve(
      {
        quoteText: "변화는 정체성에서 시작된다.",
        attribution: "제임스 클리어",
      },
      h,
    );
    expect(elements.length).toBe(2);
    expect(elements[0]).toMatchObject({
      type: "quote-text",
      props: { text: "변화는 정체성에서 시작된다." },
    });
    expect(elements[1]).toMatchObject({
      type: "caption",
      props: { text: "제임스 클리어" },
    });
  });

  it("handles SplitQuoteContent with left/right quotes", () => {
    const elements = reflectiveAnchorRecipe.resolve(
      {
        leftQuote: "실패는 배움이다",
        leftAttribution: "A",
        rightQuote: "실패는 끝이다",
        rightAttribution: "B",
      },
      h,
    );
    expect(elements.length).toBe(5); // left-quote, left-attr, divider, right-quote, right-attr
  });

  it("returns empty when no quote fields", () => {
    expect(reflectiveAnchorRecipe.resolve({}, h)).toHaveLength(0);
  });

  it("has correct defaults", () => {
    expect(reflectiveAnchorRecipe.family).toBe("reflective-anchor");
    expect(reflectiveAnchorRecipe.defaultLayout).toBe("center-focus");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/composition/__tests__/familyRecipes-phase2b.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Implement openingHook recipe**

```typescript
// src/composition/familyRecipes/openingHook.ts
import type { VCLElement, LayoutType, ChoreographyType } from "@/types";
import type { FamilyRecipe, RecipeHints } from "../types";

export const openingHookRecipe: FamilyRecipe = {
  family: "opening-hook",
  defaultLayout: "center-focus" as LayoutType,
  defaultChoreography: "reveal-sequence" as ChoreographyType,

  resolve(content: Record<string, unknown>, hints?: RecipeHints): VCLElement[] {
    const sid = hints?.sceneId ?? "oh";

    // CoverContent path
    const title = content.title as string | undefined;
    if (title) {
      const elements: VCLElement[] = [
        {
          id: `${sid}-title`,
          type: "headline",
          props: { text: title, role: "headline" },
        },
      ];

      const author = content.author as string | undefined;
      if (author) {
        elements.push({
          id: `${sid}-author`,
          type: "caption",
          props: { text: author },
        });
      }

      const subtitle = content.subtitle as string | undefined;
      if (subtitle) {
        elements.push({
          id: `${sid}-subtitle`,
          type: "body-text",
          props: { text: subtitle, tokenRef: "bodyM" },
        });
      }

      const coverImageUrl = content.coverImageUrl as string | undefined;
      if (coverImageUrl) {
        elements.push({
          id: `${sid}-cover`,
          type: "image",
          props: { src: coverImageUrl },
        });
      }

      return elements;
    }

    // HighlightContent path
    const mainText = content.mainText as string | undefined;
    if (mainText) {
      const elements: VCLElement[] = [
        {
          id: `${sid}-main`,
          type: "headline",
          props: { text: mainText, role: "headline" },
        },
      ];

      const subText = content.subText as string | undefined;
      if (subText) {
        elements.push({
          id: `${sid}-sub`,
          type: "body-text",
          props: { text: subText, tokenRef: "bodyL" },
        });
      }

      return elements;
    }

    return [];
  },
};
```

- [ ] **Step 4: Implement reflectiveAnchor recipe**

```typescript
// src/composition/familyRecipes/reflectiveAnchor.ts
import type { VCLElement, LayoutType, ChoreographyType } from "@/types";
import type { FamilyRecipe, RecipeHints } from "../types";

export const reflectiveAnchorRecipe: FamilyRecipe = {
  family: "reflective-anchor",
  defaultLayout: "center-focus" as LayoutType,
  defaultChoreography: "reveal-sequence" as ChoreographyType,

  resolve(content: Record<string, unknown>, hints?: RecipeHints): VCLElement[] {
    const sid = hints?.sceneId ?? "ra";

    // QuoteContent path
    const quoteText = content.quoteText as string | undefined;
    if (quoteText) {
      const elements: VCLElement[] = [
        {
          id: `${sid}-quote`,
          type: "quote-text",
          props: {
            text: quoteText,
            useSerif: (content.useSerif as boolean) ?? false,
          },
        },
      ];

      const attribution = content.attribution as string | undefined;
      if (attribution) {
        elements.push({
          id: `${sid}-attribution`,
          type: "caption",
          props: { text: attribution },
        });
      }

      return elements;
    }

    // SplitQuoteContent path
    const leftQuote = content.leftQuote as string | undefined;
    const rightQuote = content.rightQuote as string | undefined;
    if (leftQuote && rightQuote) {
      const elements: VCLElement[] = [
        {
          id: `${sid}-left-quote`,
          type: "quote-text",
          props: { text: leftQuote },
        },
        {
          id: `${sid}-left-attr`,
          type: "caption",
          props: { text: (content.leftAttribution as string) ?? "" },
        },
        {
          id: `${sid}-divider`,
          type: "divider",
          props: { orientation: "vertical" },
        },
        {
          id: `${sid}-right-quote`,
          type: "quote-text",
          props: { text: rightQuote },
        },
        {
          id: `${sid}-right-attr`,
          type: "caption",
          props: { text: (content.rightAttribution as string) ?? "" },
        },
      ];
      return elements;
    }

    return [];
  },
};
```

- [ ] **Step 5: Register both in familyRecipes/index.ts**

Add imports and register:

```typescript
import { openingHookRecipe } from "./openingHook";
import { reflectiveAnchorRecipe } from "./reflectiveAnchor";

// Add to recipeRegistry:
"opening-hook": openingHookRecipe,
"reflective-anchor": reflectiveAnchorRecipe,

// Add to exports
export { openingHookRecipe, reflectiveAnchorRecipe };
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run src/composition/__tests__/familyRecipes-phase2b.test.ts`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add src/composition/familyRecipes/openingHook.ts src/composition/familyRecipes/reflectiveAnchor.ts src/composition/familyRecipes/index.ts src/composition/__tests__/familyRecipes-phase2b.test.ts
git commit -m "feat(composition): opening-hook + reflective-anchor recipes"
```

---

### Task 4: mechanism-explanation Recipe

**Files:**

- Create: `src/composition/familyRecipes/mechanismExplanation.ts`
- Modify: `src/composition/familyRecipes/index.ts`
- Modify: `src/composition/__tests__/familyRecipes-phase2b.test.ts`

- [ ] **Step 1: Add failing test**

Append to `src/composition/__tests__/familyRecipes-phase2b.test.ts`:

```typescript
import { mechanismExplanationRecipe } from "../familyRecipes/mechanismExplanation";

describe("mechanismExplanationRecipe", () => {
  it("creates headline + item elements in radial layout", () => {
    const elements = mechanismExplanationRecipe.resolve(
      {
        frameworkLabel: "습관 루프",
        items: [
          { title: "신호", description: "트리거가 되는 단서" },
          { title: "열망", description: "변화에 대한 동기" },
          { title: "반응", description: "실제 행동" },
          { title: "보상", description: "행동을 강화" },
        ],
      },
      h,
    );

    expect(elements.length).toBe(5); // headline + 4 items
    expect(elements[0]).toMatchObject({
      type: "headline",
      props: { text: "습관 루프", role: "headline" },
    });
    expect(elements[1]).toMatchObject({
      type: "body-text",
      props: expect.objectContaining({ index: 0 }),
    });
  });

  it("handles items without descriptions", () => {
    const elements = mechanismExplanationRecipe.resolve(
      { frameworkLabel: "모델", items: [{ title: "A" }, { title: "B" }] },
      h,
    );
    expect(elements.length).toBe(3);
  });

  it("uses frameworkLabel as headline (not headline field)", () => {
    const elements = mechanismExplanationRecipe.resolve(
      { frameworkLabel: "라벨", headline: "다른 값", items: [{ title: "X" }] },
      h,
    );
    // frameworkLabel takes priority for mechanism-explanation
    expect(elements[0].props.text).toBe("라벨");
  });

  it("returns empty when no label and no items", () => {
    expect(mechanismExplanationRecipe.resolve({}, h)).toHaveLength(0);
  });

  it("has correct defaults (radial + stagger-clockwise)", () => {
    expect(mechanismExplanationRecipe.family).toBe("mechanism-explanation");
    expect(mechanismExplanationRecipe.defaultLayout).toBe("radial");
    expect(mechanismExplanationRecipe.defaultChoreography).toBe(
      "stagger-clockwise",
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/composition/__tests__/familyRecipes-phase2b.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement mechanismExplanation recipe**

```typescript
// src/composition/familyRecipes/mechanismExplanation.ts
import type { VCLElement, LayoutType, ChoreographyType } from "@/types";
import type { FamilyRecipe, RecipeHints } from "../types";

interface MechanismItem {
  title: string;
  description?: string;
}

export const mechanismExplanationRecipe: FamilyRecipe = {
  family: "mechanism-explanation",
  defaultLayout: "radial" as LayoutType,
  defaultChoreography: "stagger-clockwise" as ChoreographyType,

  resolve(content: Record<string, unknown>, hints?: RecipeHints): VCLElement[] {
    // FrameworkContent uses frameworkLabel (not headline)
    const label =
      (content.frameworkLabel as string) ?? (content.headline as string);
    const items = (content.items as MechanismItem[]) ?? [];
    const sid = hints?.sceneId ?? "me";

    if (!label && items.length === 0) return [];

    const elements: VCLElement[] = [];

    if (label) {
      elements.push({
        id: `${sid}-headline`,
        type: "headline",
        props: { text: label, role: "headline" },
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

- [ ] **Step 4: Register in familyRecipes/index.ts**

```typescript
import { mechanismExplanationRecipe } from "./mechanismExplanation";

// Add to recipeRegistry:
"mechanism-explanation": mechanismExplanationRecipe,

// Add to exports
export { mechanismExplanationRecipe };
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/composition/__tests__/familyRecipes-phase2b.test.ts`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add src/composition/familyRecipes/mechanismExplanation.ts src/composition/familyRecipes/index.ts src/composition/__tests__/familyRecipes-phase2b.test.ts
git commit -m "feat(composition): mechanism-explanation recipe (radial + stagger-clockwise)"
```

---

### Task 5: tension-comparison + evidence-stack Recipes

**Files:**

- Create: `src/composition/familyRecipes/tensionComparison.ts`
- Create: `src/composition/familyRecipes/evidenceStack.ts`
- Modify: `src/composition/familyRecipes/index.ts`
- Modify: `src/composition/__tests__/familyRecipes-phase2b.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `src/composition/__tests__/familyRecipes-phase2b.test.ts`:

```typescript
import { tensionComparisonRecipe } from "../familyRecipes/tensionComparison";
import { evidenceStackRecipe } from "../familyRecipes/evidenceStack";

describe("tensionComparisonRecipe", () => {
  it("creates left/right comparison elements", () => {
    const elements = tensionComparisonRecipe.resolve(
      {
        leftLabel: "일반적인 접근",
        leftContent: "목표를 세우고 의지력에 의존한다",
        rightLabel: "습관 기반 접근",
        rightContent: "시스템을 만들고 환경을 설계한다",
      },
      h,
    );

    expect(elements.length).toBe(4);
    expect(elements[0]).toMatchObject({
      type: "label",
      props: { text: "일반적인 접근" },
    });
    expect(elements[1]).toMatchObject({
      type: "body-text",
      props: { text: "목표를 세우고 의지력에 의존한다" },
    });
    expect(elements[2]).toMatchObject({
      type: "label",
      props: { text: "습관 기반 접근" },
    });
    expect(elements[3]).toMatchObject({
      type: "body-text",
      props: { text: "시스템을 만들고 환경을 설계한다" },
    });
  });

  it("returns empty when no left/right content", () => {
    expect(tensionComparisonRecipe.resolve({}, h)).toHaveLength(0);
  });

  it("has correct defaults (split-compare + split-reveal)", () => {
    expect(tensionComparisonRecipe.family).toBe("tension-comparison");
    expect(tensionComparisonRecipe.defaultLayout).toBe("split-compare");
    expect(tensionComparisonRecipe.defaultChoreography).toBe("split-reveal");
  });
});

describe("evidenceStackRecipe", () => {
  it("creates headline + data items from DataContent", () => {
    const elements = evidenceStackRecipe.resolve(
      {
        dataLabel: "성공률 비교",
        data: [
          { label: "습관 기반", value: 85 },
          { label: "의지력 기반", value: 23 },
        ],
      },
      h,
    );

    expect(elements.length).toBe(3); // headline + 2 data items
    expect(elements[0]).toMatchObject({
      type: "headline",
      props: { text: "성공률 비교" },
    });
    expect(elements[1]).toMatchObject({
      type: "body-text",
      props: expect.objectContaining({ index: 0 }),
    });
  });

  it("creates headline + list items from ListRevealContent", () => {
    const elements = evidenceStackRecipe.resolve(
      {
        listLabel: "핵심 근거 3가지",
        items: [
          { text: "영국 자전거팀 사례" },
          { text: "습관 쌓기 연구" },
          { text: "2분 규칙 실험" },
        ],
      },
      h,
    );

    expect(elements.length).toBe(4); // headline + 3 items
    expect(elements[0]).toMatchObject({ type: "headline" });
  });

  it("returns empty when no dataLabel and no listLabel", () => {
    expect(evidenceStackRecipe.resolve({}, h)).toHaveLength(0);
  });

  it("has correct defaults (grid-expand + stagger-clockwise)", () => {
    expect(evidenceStackRecipe.family).toBe("evidence-stack");
    expect(evidenceStackRecipe.defaultLayout).toBe("grid-expand");
    expect(evidenceStackRecipe.defaultChoreography).toBe("stagger-clockwise");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/composition/__tests__/familyRecipes-phase2b.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Implement tensionComparison recipe**

```typescript
// src/composition/familyRecipes/tensionComparison.ts
import type { VCLElement, LayoutType, ChoreographyType } from "@/types";
import type { FamilyRecipe, RecipeHints } from "../types";

export const tensionComparisonRecipe: FamilyRecipe = {
  family: "tension-comparison",
  defaultLayout: "split-compare" as LayoutType,
  defaultChoreography: "split-reveal" as ChoreographyType,

  resolve(content: Record<string, unknown>, hints?: RecipeHints): VCLElement[] {
    const leftLabel = content.leftLabel as string | undefined;
    const leftContent = content.leftContent as string | undefined;
    const rightLabel = content.rightLabel as string | undefined;
    const rightContent = content.rightContent as string | undefined;
    const sid = hints?.sceneId ?? "tc";

    if (!leftLabel && !rightLabel) return [];

    const elements: VCLElement[] = [];

    if (leftLabel) {
      elements.push({
        id: `${sid}-left-label`,
        type: "label",
        props: { text: leftLabel, variant: "default" },
      });
    }
    if (leftContent) {
      elements.push({
        id: `${sid}-left-content`,
        type: "body-text",
        props: { text: leftContent, tokenRef: "bodyL" },
      });
    }
    if (rightLabel) {
      elements.push({
        id: `${sid}-right-label`,
        type: "label",
        props: { text: rightLabel, variant: "accent" },
      });
    }
    if (rightContent) {
      elements.push({
        id: `${sid}-right-content`,
        type: "body-text",
        props: { text: rightContent, tokenRef: "bodyL" },
      });
    }

    return elements;
  },
};
```

- [ ] **Step 4: Implement evidenceStack recipe**

```typescript
// src/composition/familyRecipes/evidenceStack.ts
import type { VCLElement, LayoutType, ChoreographyType } from "@/types";
import type { FamilyRecipe, RecipeHints } from "../types";

interface DataItem {
  label: string;
  value: number | string;
}

interface ListItem {
  text: string;
}

export const evidenceStackRecipe: FamilyRecipe = {
  family: "evidence-stack",
  defaultLayout: "grid-expand" as LayoutType,
  defaultChoreography: "stagger-clockwise" as ChoreographyType,

  resolve(content: Record<string, unknown>, hints?: RecipeHints): VCLElement[] {
    const sid = hints?.sceneId ?? "es";

    // DataContent path
    const dataLabel = content.dataLabel as string | undefined;
    const data = content.data as DataItem[] | undefined;
    if (dataLabel && data && data.length > 0) {
      const elements: VCLElement[] = [
        {
          id: `${sid}-headline`,
          type: "headline",
          props: { text: dataLabel, role: "headline" },
        },
      ];
      data.forEach((item, i) => {
        const text =
          typeof item.value === "number"
            ? `${item.label}: ${item.value}`
            : `${item.label}: ${item.value}`;
        elements.push({
          id: `${sid}-data-${i}`,
          type: "body-text",
          props: { text, index: i, role: "item" },
        });
      });
      return elements;
    }

    // ListRevealContent path
    const listLabel = content.listLabel as string | undefined;
    const items = content.items as ListItem[] | undefined;
    if (listLabel && items && items.length > 0) {
      const elements: VCLElement[] = [
        {
          id: `${sid}-headline`,
          type: "headline",
          props: { text: listLabel, role: "headline" },
        },
      ];
      items.forEach((item, i) => {
        elements.push({
          id: `${sid}-item-${i}`,
          type: "body-text",
          props: { text: item.text, index: i, role: "item" },
        });
      });
      return elements;
    }

    return [];
  },
};
```

- [ ] **Step 5: Register both in familyRecipes/index.ts**

```typescript
import { tensionComparisonRecipe } from "./tensionComparison";
import { evidenceStackRecipe } from "./evidenceStack";

// Add to recipeRegistry:
"tension-comparison": tensionComparisonRecipe,
"evidence-stack": evidenceStackRecipe,

// Add to exports
export { tensionComparisonRecipe, evidenceStackRecipe };
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run src/composition/__tests__/familyRecipes-phase2b.test.ts`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add src/composition/familyRecipes/tensionComparison.ts src/composition/familyRecipes/evidenceStack.ts src/composition/familyRecipes/index.ts src/composition/__tests__/familyRecipes-phase2b.test.ts
git commit -m "feat(composition): tension-comparison + evidence-stack recipes"
```

---

### Task 6: Expand COMPOSED_FAMILIES + Integration Tests

**Files:**

- Modify: `src/pipeline/buildProps.ts` (expand COMPOSED_FAMILIES list)
- Create: `src/composition/__tests__/integration-phase2b.test.ts`

- [ ] **Step 1: Expand COMPOSED_FAMILIES in buildProps.ts**

Find the `COMPOSED_FAMILIES` constant and expand it:

```typescript
const COMPOSED_FAMILIES: SceneFamily[] = [
  // Phase 2A
  "concept-introduction",
  "system-model",
  "progression-journey",
  // Phase 2B
  "closing-synthesis",
  "structural-bridge",
  "opening-hook",
  "reflective-anchor",
  "mechanism-explanation",
  "tension-comparison",
  "evidence-stack",
];
```

- [ ] **Step 2: Write integration tests**

```typescript
// src/composition/__tests__/integration-phase2b.test.ts
import { describe, it, expect } from "vitest";
import { adaptPresetToSceneSpec } from "@/direction/presetAdapter";
import { tryComposeScene } from "../compositionPathRouter";
import type { CompositionContext } from "../types";
import type { DirectionProfile, SceneFamily } from "@/direction/types";

const dir: DirectionProfile = {
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

const theme = {
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

const families: SceneFamily[] = [
  "concept-introduction",
  "system-model",
  "progression-journey",
  "closing-synthesis",
  "structural-bridge",
  "opening-hook",
  "reflective-anchor",
  "mechanism-explanation",
  "tension-comparison",
  "evidence-stack",
];

const ctx: CompositionContext = {
  format: "longform",
  theme: theme as any,
  from: 0,
  durationFrames: 750,
  motionPreset: "heavy",
};

describe("Phase 2B: all 10 families through composed path", () => {
  it("closing (closing-synthesis)", () => {
    const spec = adaptPresetToSceneSpec(
      {
        id: "cl-01",
        type: "closing",
        narrationText: "마무리",
        content: { recapStatement: "핵심 요약", ctaText: "구독!" },
      },
      dir,
      undefined,
      { composedFamilies: families },
    );
    expect(spec.source).toBe("composed");
    const bp = tryComposeScene(spec, ctx);
    expect(bp).not.toBeNull();
    expect(bp!.elements.length).toBe(2);
  });

  it("chapterDivider (structural-bridge)", () => {
    const spec = adaptPresetToSceneSpec(
      {
        id: "cd-01",
        type: "chapterDivider",
        narrationText: "다음 챕터",
        content: { chapterNumber: 2, chapterTitle: "환경의 힘" },
      },
      dir,
      undefined,
      { composedFamilies: families },
    );
    expect(spec.source).toBe("composed");
    const bp = tryComposeScene(spec, ctx);
    expect(bp).not.toBeNull();
    expect(bp!.elements.length).toBe(3);
  });

  it("cover (opening-hook)", () => {
    const spec = adaptPresetToSceneSpec(
      {
        id: "cv-01",
        type: "cover",
        narrationText: "",
        content: {
          title: "아주 작은 습관의 힘",
          author: "제임스 클리어",
          coverImageUrl: "covers/atomic.png",
        },
      },
      dir,
      undefined,
      { composedFamilies: families },
    );
    expect(spec.source).toBe("composed");
    const bp = tryComposeScene(spec, ctx);
    expect(bp).not.toBeNull();
    expect(bp!.elements.length).toBeGreaterThanOrEqual(2);
  });

  it("quote (reflective-anchor)", () => {
    const spec = adaptPresetToSceneSpec(
      {
        id: "qt-01",
        type: "quote",
        narrationText: "인용",
        content: {
          quoteText: "변화는 정체성에서 시작된다.",
          attribution: "제임스 클리어",
        },
      },
      dir,
      undefined,
      { composedFamilies: families },
    );
    expect(spec.source).toBe("composed");
    const bp = tryComposeScene(spec, ctx);
    expect(bp).not.toBeNull();
    expect(bp!.elements.length).toBe(2);
  });

  it("framework without bookStructure (mechanism-explanation)", () => {
    const spec = adaptPresetToSceneSpec(
      {
        id: "fw-01",
        type: "framework",
        narrationText: "설명",
        content: {
          frameworkLabel: "습관 루프",
          items: [{ title: "신호" }, { title: "열망" }],
        },
      },
      dir,
      undefined,
      { composedFamilies: families },
    );
    // framework without bookStructure → mechanism-explanation
    expect(spec.family).toBe("mechanism-explanation");
    expect(spec.source).toBe("composed");
    const bp = tryComposeScene(spec, ctx);
    expect(bp).not.toBeNull();
    expect(bp!.layout).toBe("radial");
  });

  it("compareContrast (tension-comparison)", () => {
    const spec = adaptPresetToSceneSpec(
      {
        id: "cc-01",
        type: "compareContrast",
        narrationText: "비교",
        content: {
          leftLabel: "A",
          leftContent: "내용A",
          rightLabel: "B",
          rightContent: "내용B",
        },
      },
      dir,
      undefined,
      { composedFamilies: families },
    );
    expect(spec.source).toBe("composed");
    const bp = tryComposeScene(spec, ctx);
    expect(bp).not.toBeNull();
    expect(bp!.layout).toBe("split-compare");
    expect(bp!.choreography).toBe("split-reveal");
  });

  it("data (evidence-stack)", () => {
    const spec = adaptPresetToSceneSpec(
      {
        id: "dt-01",
        type: "data",
        narrationText: "데이터",
        content: { dataLabel: "성공률", data: [{ label: "A", value: 85 }] },
      },
      dir,
      undefined,
      { composedFamilies: families },
    );
    expect(spec.source).toBe("composed");
    const bp = tryComposeScene(spec, ctx);
    expect(bp).not.toBeNull();
    expect(bp!.layout).toBe("grid-expand");
  });

  it("total composed families count = 10", () => {
    expect(families.length).toBe(10);
  });

  // Compose failure/fallback cases (content insufficient)
  it("quote with no quoteText falls back", () => {
    const spec = adaptPresetToSceneSpec(
      { id: "qt-fail", type: "quote", narrationText: "인용", content: {} },
      dir,
      undefined,
      { composedFamilies: families },
    );
    expect(spec.source).toBe("composed");
    const bp = tryComposeScene(spec, ctx);
    expect(bp).toBeNull();
  });

  it("compareContrast with no left/right falls back", () => {
    const spec = adaptPresetToSceneSpec(
      {
        id: "cc-fail",
        type: "compareContrast",
        narrationText: "비교",
        content: {},
      },
      dir,
      undefined,
      { composedFamilies: families },
    );
    expect(spec.source).toBe("composed");
    const bp = tryComposeScene(spec, ctx);
    expect(bp).toBeNull();
  });

  it("data with dataLabel but empty data array falls back", () => {
    const spec = adaptPresetToSceneSpec(
      {
        id: "dt-fail",
        type: "data",
        narrationText: "데이터",
        content: { dataLabel: "라벨", data: [] },
      },
      dir,
      undefined,
      { composedFamilies: families },
    );
    expect(spec.source).toBe("composed");
    const bp = tryComposeScene(spec, ctx);
    expect(bp).toBeNull();
  });
});
```

- [ ] **Step 3: Run integration tests**

Run: `npx vitest run src/composition/__tests__/integration-phase2b.test.ts`
Expected: ALL PASS

- [ ] **Step 4: Run full composition test suite**

Run: `npx vitest run src/composition/`
Expected: ALL PASS

- [ ] **Step 5: TypeScript check**

Run: `npx tsc --noEmit 2>&1 | grep -c "composition\|choreography"`
Expected: 0 (no errors in our files)

- [ ] **Step 6: Commit + push**

```bash
git add src/pipeline/buildProps.ts src/composition/__tests__/integration-phase2b.test.ts
git commit -m "feat(composition): Phase 2B complete — 10/11 families composed, split-reveal choreography"
git push origin main
```

---

## Summary

| Task | What                                      | New Files | Tests |
| ---- | ----------------------------------------- | --------- | ----- |
| 1    | split-reveal choreography                 | 1         | 3     |
| 2    | closing-synthesis + structural-bridge     | 2         | 8     |
| 3    | opening-hook + reflective-anchor          | 2         | 8     |
| 4    | mechanism-explanation                     | 1         | 5     |
| 5    | tension-comparison + evidence-stack       | 2         | 8     |
| 6    | COMPOSED_FAMILIES expansion + integration | 0         | 11    |

**Total: 8 new files, 3 modified files, ~43 tests**

**Result: 10 out of 11 families composed.** Only `transformation-shift` has no content type mapping (no recipe needed until content type exists).

```
Before Phase 2B:  3/11 families composed (27%)
After Phase 2B:  10/11 families composed (91%)
```

> **Scope clarification:** This sprint increases composed-path **coverage**, not final scene sophistication. Visual refinement, family-specific direction tuning, and expanded layout/choreography vocabulary remain follow-up work (Phase 2B-2, Phase 3).
