import { describe, it, expect } from "vitest";
import { adaptPresetToSceneSpec } from "@/direction/presetAdapter";
import { tryComposeScene } from "../compositionPathRouter";
import { recipeRegistry } from "../familyRecipes";
import type { CompositionContext } from "../types";
import type { SceneFamily } from "@/direction/types";
import { getDirectionProfile } from "@/direction/profiles";
import { useTheme } from "@/design/themes/useTheme";

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const dir = getDirectionProfile("analytical");
const testTheme = useTheme("dark", "psychology");

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
  theme: testTheme,
  from: 0,
  durationFrames: 750,
  motionPreset: "heavy",
};

// ─── Success cases ────────────────────────────────────────────────────────────

// 1. closing → closing-synthesis
describe("closing → closing-synthesis composed path", () => {
  it("produces 2 elements (recapStatement + ctaText), layout:center-focus", () => {
    const spec = adaptPresetToSceneSpec(
      {
        id: "p2b-closing-01",
        type: "closing",
        narrationText: "오늘 딱 하나만 기억하세요.",
        content: {
          recapStatement: "작은 습관이 삶을 바꾼다",
          ctaText: "지금 시작하세요",
        },
      },
      dir,
      "framework",
      { composedFamilies: families },
    );

    expect(spec.source).toBe("composed");
    expect(spec.family).toBe("closing-synthesis");

    const blueprint = tryComposeScene(spec, ctx);

    expect(blueprint).not.toBeNull();
    expect(blueprint!.origin).toBe("composed");
    expect(blueprint!.elements).toHaveLength(2);
    expect(blueprint!.layout).toBe("center-focus");
  });
});

// 2. chapterDivider → structural-bridge
describe("chapterDivider → structural-bridge composed path", () => {
  it("produces 3 elements (divider + number + headline), layout:center-focus", () => {
    const spec = adaptPresetToSceneSpec(
      {
        id: "p2b-chap-01",
        type: "chapterDivider",
        narrationText: "2장입니다.",
        content: {
          chapterNumber: 2,
          chapterTitle: "정체성 기반 습관",
        },
      },
      dir,
      "framework",
      { composedFamilies: families },
    );

    expect(spec.source).toBe("composed");
    expect(spec.family).toBe("structural-bridge");

    const blueprint = tryComposeScene(spec, ctx);

    expect(blueprint).not.toBeNull();
    expect(blueprint!.origin).toBe("composed");
    expect(blueprint!.elements).toHaveLength(3);
    expect(blueprint!.layout).toBe("center-focus");
  });
});

// 3. cover → opening-hook
describe("cover → opening-hook composed path", () => {
  it("produces 2+ elements (title + author + optional coverImageUrl), layout:center-focus", () => {
    const spec = adaptPresetToSceneSpec(
      {
        id: "p2b-cover-01",
        type: "cover",
        narrationText: "아토믹 해빗",
        content: {
          title: "아토믹 해빗",
          author: "제임스 클리어",
          coverImageUrl: "covers/atomic-habits.png",
        },
      },
      dir,
      "framework",
      { composedFamilies: families },
    );

    expect(spec.source).toBe("composed");
    expect(spec.family).toBe("opening-hook");

    const blueprint = tryComposeScene(spec, ctx);

    expect(blueprint).not.toBeNull();
    expect(blueprint!.origin).toBe("composed");
    expect(blueprint!.elements.length).toBeGreaterThanOrEqual(2);
    expect(blueprint!.layout).toBe("center-focus");
  });
});

// 4. quote → reflective-anchor
describe("quote → reflective-anchor composed path", () => {
  it("produces 2 elements (quoteText + attribution), layout:center-focus", () => {
    const spec = adaptPresetToSceneSpec(
      {
        id: "p2b-quote-01",
        type: "quote",
        narrationText: "습관은 정체성에서 시작된다.",
        content: {
          quoteText: "당신이 반복하는 것이 곧 당신이다.",
          attribution: "제임스 클리어",
        },
      },
      dir,
      "framework",
      { composedFamilies: families },
    );

    expect(spec.source).toBe("composed");
    expect(spec.family).toBe("reflective-anchor");

    const blueprint = tryComposeScene(spec, ctx);

    expect(blueprint).not.toBeNull();
    expect(blueprint!.origin).toBe("composed");
    expect(blueprint!.elements).toHaveLength(2);
    expect(blueprint!.layout).toBe("center-focus");
  });
});

// 5. framework (no bookStructure) → mechanism-explanation
describe("framework (no bookStructure) → mechanism-explanation composed path", () => {
  it("produces headline + items in radial layout", () => {
    const spec = adaptPresetToSceneSpec(
      {
        id: "p2b-fw-mech-01",
        type: "framework",
        narrationText: "습관 루프를 설명합니다.",
        content: {
          frameworkLabel: "습관 루프",
          items: [
            { title: "신호", description: "행동을 유발하는 자극" },
            { title: "열망", description: "변화를 원하는 동기" },
            { title: "반응", description: "실제 행동" },
          ],
        },
      },
      dir,
      undefined, // no bookStructure → mechanism-explanation
      { composedFamilies: families },
    );

    expect(spec.source).toBe("composed");
    expect(spec.family).toBe("mechanism-explanation");

    const blueprint = tryComposeScene(spec, ctx);

    expect(blueprint).not.toBeNull();
    expect(blueprint!.origin).toBe("composed");
    expect(blueprint!.layout).toBe("radial");
    // 1 headline + 3 items = 4 elements
    expect(blueprint!.elements).toHaveLength(4);
  });
});

// 6. compareContrast → tension-comparison
describe("compareContrast → tension-comparison composed path", () => {
  it("produces split-compare layout with split-reveal choreography", () => {
    const spec = adaptPresetToSceneSpec(
      {
        id: "p2b-compare-01",
        type: "compareContrast",
        narrationText: "결과 지향 vs 시스템 지향",
        content: {
          leftLabel: "결과 지향",
          leftContent: "목표에 집중한다",
          rightLabel: "시스템 지향",
          rightContent: "과정을 신뢰한다",
        },
      },
      dir,
      "framework",
      { composedFamilies: families },
    );

    expect(spec.source).toBe("composed");
    expect(spec.family).toBe("tension-comparison");

    const blueprint = tryComposeScene(spec, ctx);

    expect(blueprint).not.toBeNull();
    expect(blueprint!.origin).toBe("composed");
    expect(blueprint!.layout).toBe("split-compare");
    expect(blueprint!.choreography).toBe("split-reveal");
  });
});

// 7. data → evidence-stack
describe("data → evidence-stack composed path", () => {
  it("produces grid-expand layout with dataLabel headline + data items", () => {
    const spec = adaptPresetToSceneSpec(
      {
        id: "p2b-data-01",
        type: "data",
        narrationText: "통계로 보는 습관의 힘",
        content: {
          dataLabel: "습관의 복리 효과",
          data: [
            { label: "1% 개선 × 365일", value: "37.78배" },
            { label: "1% 퇴보 × 365일", value: "0.03배" },
          ],
        },
      },
      dir,
      "framework",
      { composedFamilies: families },
    );

    expect(spec.source).toBe("composed");
    expect(spec.family).toBe("evidence-stack");

    const blueprint = tryComposeScene(spec, ctx);

    expect(blueprint).not.toBeNull();
    expect(blueprint!.origin).toBe("composed");
    expect(blueprint!.layout).toBe("grid-expand");
    // 1 headline + 2 data items = 3 elements
    expect(blueprint!.elements).toHaveLength(3);
  });
});

// ─── Failure / fallback cases ─────────────────────────────────────────────────

// 8. quote with no quoteText → composed source but tryComposeScene returns null
describe("quote with no quoteText → null", () => {
  it("spec is composed source but blueprint is null (no quoteText)", () => {
    const spec = adaptPresetToSceneSpec(
      {
        id: "p2b-quote-empty",
        type: "quote",
        narrationText: "",
        content: {
          attribution: "Anonymous",
          // no quoteText
        },
      },
      dir,
      "framework",
      { composedFamilies: families },
    );

    expect(spec.source).toBe("composed");

    const blueprint = tryComposeScene(spec, ctx);
    expect(blueprint).toBeNull();
  });
});

// 9. compareContrast with empty content → null
describe("compareContrast with empty content → null", () => {
  it("spec is composed source but blueprint is null (no leftLabel/rightLabel)", () => {
    const spec = adaptPresetToSceneSpec(
      {
        id: "p2b-compare-empty",
        type: "compareContrast",
        narrationText: "",
        content: {},
      },
      dir,
      "framework",
      { composedFamilies: families },
    );

    expect(spec.source).toBe("composed");

    const blueprint = tryComposeScene(spec, ctx);
    expect(blueprint).toBeNull();
  });
});

// 10. data with dataLabel but empty data array → null
describe("data with dataLabel but empty data array → null", () => {
  it("spec is composed source but blueprint is null (dataLabel + empty data[])", () => {
    const spec = adaptPresetToSceneSpec(
      {
        id: "p2b-data-empty",
        type: "data",
        narrationText: "",
        content: {
          dataLabel: "Statistics",
          data: [],
        },
      },
      dir,
      "framework",
      { composedFamilies: families },
    );

    expect(spec.source).toBe("composed");

    const blueprint = tryComposeScene(spec, ctx);
    expect(blueprint).toBeNull();
  });
});

// ─── Registry count ───────────────────────────────────────────────────────────

// 11. recipeRegistry has exactly 10 families registered
describe("recipeRegistry count", () => {
  it("has exactly 10 families registered", () => {
    const registeredFamilies = Object.keys(recipeRegistry);
    expect(registeredFamilies).toHaveLength(10);
  });
});
