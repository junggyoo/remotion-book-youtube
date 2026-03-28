import { describe, it, expect } from "vitest";
import { recipeRegistry } from "../familyRecipes";

describe("familyRecipes registry", () => {
  describe("concept-introduction", () => {
    const recipe = recipeRegistry["concept-introduction"]!;

    it("is registered", () => {
      expect(recipe).toBeDefined();
      expect(recipe.family).toBe("concept-introduction");
      expect(recipe.defaultLayout).toBe("center-focus");
      expect(recipe.defaultChoreography).toBe("reveal-sequence");
    });

    it("returns [] if no headline", () => {
      const result = recipe.resolve({}, { sceneId: "test-01" });
      expect(result).toHaveLength(0);
    });

    it("maps headline only", () => {
      const result = recipe.resolve(
        { headline: "Core Idea" },
        { sceneId: "ci-01" },
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "ci-01-headline",
        type: "headline",
        props: { text: "Core Idea", role: "headline" },
      });
    });

    it("maps headline + supportText", () => {
      const result = recipe.resolve(
        { headline: "Core", supportText: "Support detail" },
        { sceneId: "ci-02" },
      );
      expect(result).toHaveLength(2);
      const body = result.find((e) => e.type === "body-text");
      expect(body).toMatchObject({
        id: "ci-02-support",
        type: "body-text",
        props: { text: "Support detail", role: "support" },
      });
    });

    it("maps headline + supportText + evidence", () => {
      const result = recipe.resolve(
        { headline: "Core", supportText: "Support", evidence: "Evidence A" },
        { sceneId: "ci-03" },
      );
      expect(result).toHaveLength(3);
      const label = result.find((e) => e.type === "label");
      expect(label).toMatchObject({
        id: "ci-03-evidence",
        type: "label",
        props: { text: "Evidence A", variant: "signal", role: "evidence" },
      });
    });
  });

  describe("system-model", () => {
    const recipe = recipeRegistry["system-model"]!;

    it("is registered", () => {
      expect(recipe).toBeDefined();
      expect(recipe.family).toBe("system-model");
      expect(recipe.defaultLayout).toBe("grid-expand");
      expect(recipe.defaultChoreography).toBe("stagger-clockwise");
    });

    it("returns [] if no headline AND no items", () => {
      const result = recipe.resolve({}, { sceneId: "sm-00" });
      expect(result).toHaveLength(0);
    });

    it("maps headline only", () => {
      const result = recipe.resolve(
        { headline: "Framework" },
        { sceneId: "sm-01" },
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "sm-01-headline",
        type: "headline",
        props: { text: "Framework", role: "headline" },
      });
    });

    it("maps headline + items", () => {
      const result = recipe.resolve(
        {
          headline: "Framework",
          items: [
            { title: "Item A", description: "Desc A" },
            { title: "Item B", description: "Desc B" },
          ],
        },
        { sceneId: "sm-02" },
      );
      expect(result).toHaveLength(3); // headline + 2 items
      const item0 = result.find((e) => e.id === "sm-02-item-0");
      expect(item0).toMatchObject({
        id: "sm-02-item-0",
        type: "body-text",
        props: { index: 0, role: "item" },
      });
      const item1 = result.find((e) => e.id === "sm-02-item-1");
      expect(item1).toMatchObject({
        id: "sm-02-item-1",
        type: "body-text",
        props: { index: 1, role: "item" },
      });
    });

    it("item props contain title and description in text", () => {
      const result = recipe.resolve(
        {
          headline: "Framework",
          items: [{ title: "A", description: "B" }],
        },
        { sceneId: "sm-03" },
      );
      const item = result.find((e) => e.id === "sm-03-item-0");
      expect(item!.props.text).toContain("A");
      expect(item!.props.text).toContain("B");
    });

    it("works with items but no headline", () => {
      const result = recipe.resolve(
        { items: [{ title: "X", description: "Y" }] },
        { sceneId: "sm-04" },
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("sm-04-item-0");
    });
  });

  describe("progression-journey", () => {
    const recipe = recipeRegistry["progression-journey"]!;

    it("is registered", () => {
      expect(recipe).toBeDefined();
      expect(recipe.family).toBe("progression-journey");
      expect(recipe.defaultLayout).toBe("timeline-h");
      expect(recipe.defaultChoreography).toBe("path-trace");
    });

    it("returns [] if no headline AND no steps", () => {
      const result = recipe.resolve({}, { sceneId: "pj-00" });
      expect(result).toHaveLength(0);
    });

    it("maps headline + steps", () => {
      const result = recipe.resolve(
        {
          headline: "Journey",
          steps: [
            { title: "Step 1", detail: "Detail 1" },
            { title: "Step 2", detail: "Detail 2" },
            { title: "Step 3", detail: "Detail 3" },
          ],
        },
        { sceneId: "pj-01" },
      );
      expect(result).toHaveLength(4); // headline + 3 steps
      const step0 = result.find((e) => e.id === "pj-01-step-0");
      expect(step0).toMatchObject({
        id: "pj-01-step-0",
        type: "flow-step",
        props: {
          stepNumber: 1,
          title: "Step 1",
          detail: "Detail 1",
          index: 0,
          role: "step",
        },
      });
      const step2 = result.find((e) => e.id === "pj-01-step-2");
      expect(step2!.props.stepNumber).toBe(3);
    });

    it("works with steps but no headline", () => {
      const result = recipe.resolve(
        { steps: [{ title: "Only Step", detail: "detail" }] },
        { sceneId: "pj-02" },
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("pj-02-step-0");
      expect(result[0].type).toBe("flow-step");
    });
  });
});
