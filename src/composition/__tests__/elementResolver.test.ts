import { describe, it, expect, beforeEach } from "vitest";
import { resolveElements } from "../elementResolver";
import { recipeRegistry } from "../familyRecipes";
import type { SceneSpec } from "@/direction/types";
import { getDirectionProfile } from "@/direction/profiles";

// Helper to build a minimal SceneSpec
function makeSpec(
  overrides: Partial<SceneSpec> & { id: string; family: SceneSpec["family"] },
): SceneSpec {
  return {
    intent: "test",
    layout: "center-focus",
    elements: [],
    choreography: "reveal-sequence",
    direction: getDirectionProfile("analytical"),
    source: "composed",
    confidence: 1,
    narrationText: "",
    content: {},
    ...overrides,
  };
}

describe("resolveElements", () => {
  describe("no recipe registered for family", () => {
    it("returns headline element if content.headline exists", () => {
      const spec = makeSpec({
        id: "fallback-01",
        family: "opening-hook",
        content: { headline: "Hello World" },
      });
      // Remove any registered recipe for opening-hook
      const saved = recipeRegistry["opening-hook"];
      delete recipeRegistry["opening-hook"];

      const result = resolveElements(spec);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("fallback-01-headline");
      expect(result[0].type).toBe("headline");
      expect(result[0].props.text).toBe("Hello World");
      expect(result[0].props.role).toBe("headline");

      if (saved) recipeRegistry["opening-hook"] = saved;
    });

    it("returns [] if no headline in content", () => {
      const spec = makeSpec({
        id: "fallback-02",
        family: "opening-hook",
        content: {},
      });
      const saved = recipeRegistry["opening-hook"];
      delete recipeRegistry["opening-hook"];

      const result = resolveElements(spec);
      expect(result).toHaveLength(0);

      if (saved) recipeRegistry["opening-hook"] = saved;
    });
  });

  describe("with registered recipe", () => {
    it("delegates to recipe.resolve and returns its output", () => {
      const spec = makeSpec({
        id: "ki-01",
        family: "concept-introduction",
        content: { headline: "Test Headline" },
      });

      const result = resolveElements(spec);
      // concept-introduction recipe should handle this
      expect(result.length).toBeGreaterThan(0);
      const headline = result.find((e) => e.type === "headline");
      expect(headline).toBeDefined();
      expect(headline!.id).toBe("ki-01-headline");
    });

    it("passes direction hints to recipe", () => {
      const spec = makeSpec({
        id: "sys-01",
        family: "system-model",
        direction: getDirectionProfile("persuasive"),
        content: {
          headline: "Framework",
          items: [
            { title: "Item A", description: "Desc A" },
            { title: "Item B", description: "Desc B" },
          ],
        },
      });

      const result = resolveElements(spec);
      expect(result.length).toBeGreaterThanOrEqual(3); // headline + 2 items
    });
  });
});
