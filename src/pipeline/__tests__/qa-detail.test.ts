import { describe, it, expect } from "vitest";
import { calculateBudget, extractSceneComposition } from "../durationBudget";

describe("QA-13A detailed feedback", () => {
  it("identifies scenes below minChars with gap and sentence estimate", () => {
    const scenes = [
      {
        id: "hook-01",
        type: "highlight",
        narrationText: "짧은 훅",
        content: {},
      },
      {
        id: "cover-01",
        type: "cover",
        narrationText: "짧은 커버",
        content: {},
      },
      {
        id: "framework-01",
        type: "framework",
        narrationText: "짧은 프레임워크",
        content: { items: [{}, {}, {}] },
      },
    ];

    const composition = extractSceneComposition(scenes);
    const budget = calculateBudget(300, composition);

    const shortfalls: {
      sceneId: string;
      actual: number;
      min: number;
      gap: number;
      sentences: number;
    }[] = [];

    for (const sb of budget.scenes) {
      const scene = scenes.find((s) => s.id === sb.sceneId);
      const actual = scene?.narrationText?.length ?? 0;
      if (actual < sb.minChars) {
        const gap = sb.minChars - actual;
        shortfalls.push({
          sceneId: sb.sceneId,
          actual,
          min: sb.minChars,
          gap,
          sentences: Math.ceil(gap / 25),
        });
      }
    }

    expect(shortfalls.length).toBeGreaterThan(0);
    // framework with 3 items: base 40 + 3*45 = 175 minChars
    const fw = shortfalls.find((s) => s.sceneId === "framework-01");
    expect(fw).toBeDefined();
    expect(fw!.min).toBe(175);
    expect(fw!.sentences).toBeGreaterThan(0);
  });
});
