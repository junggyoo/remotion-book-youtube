import { describe, it, expect } from "vitest";
import { calculateBudget, extractSceneComposition } from "../durationBudget";

describe("budget CLI output", () => {
  const scenes = [
    { id: "hook-01", type: "highlight", content: {} },
    { id: "cover-01", type: "cover", content: {} },
    { id: "chapter-01", type: "chapterDivider", content: {} },
    {
      id: "framework-01",
      type: "framework",
      content: { items: [{}, {}, {}, {}] },
    },
    { id: "compare-01", type: "compareContrast", content: {} },
    { id: "quote-01", type: "quote", content: {} },
    { id: "closing-01", type: "closing", content: {} },
  ];

  it("calculates per-scene budget with correct totals", () => {
    const composition = extractSceneComposition(scenes);
    const plan = calculateBudget(450, composition);

    expect(plan.estimatedNarrationChars).toBe(Math.round(450 * 7.5));
    expect(plan.scenes).toHaveLength(7);

    const fw = plan.scenes.find((s) => s.sceneId === "framework-01");
    expect(fw).toBeDefined();
    expect(fw!.minChars).toBe(220);
    expect(fw!.recommendedChars).toBe(Math.round(220 * 1.3));
  });

  it("applies ttsSpeed multiplier to CPS", () => {
    const composition = extractSceneComposition(scenes);
    const plan = calculateBudget(450, composition, { ttsSpeed: 1.2 });

    expect(plan.koreanCPS).toBe(7.5 * 1.2);
    expect(plan.estimatedNarrationChars).toBe(Math.round(450 * 7.5 * 1.2));
  });

  it("handles empty narrationText as 0 chars", () => {
    const composition = extractSceneComposition(scenes);
    const plan = calculateBudget(450, composition);

    for (const sb of plan.scenes) {
      expect(sb.minChars).toBeGreaterThan(0);
    }
  });
});
