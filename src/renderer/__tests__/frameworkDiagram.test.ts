import { createFrameworkBlueprint } from "../presetBlueprints/core/framework";
import { mockResolveContext } from "./testHelpers";
import { metaphorToDiagramSpec } from "@/planning/diagramSpec";
import type { FrameworkContent } from "@/types";

// --- Fixtures ---

const CYCLE_CONTENT: FrameworkContent = {
  frameworkLabel: "습관 루프 4법칙",
  items: [
    { number: 1, title: "신호" },
    { number: 2, title: "열망" },
    { number: 3, title: "반응" },
    { number: 4, title: "보상" },
  ],
  showConnectors: true,
  diagramHint: "circular cycle",
};

const NO_DIAGRAM_CONTENT: FrameworkContent = {
  frameworkLabel: "기본 프레임워크",
  items: [
    { number: 1, title: "항목 1" },
    { number: 2, title: "항목 2" },
    { number: 3, title: "항목 3" },
  ],
  showConnectors: true,
};

// --- Tests ---

describe("createFrameworkBlueprint — P2-1f diagram integration", () => {
  it("injects animated-path and node-activation elements when diagramHint is set", () => {
    const blueprint = createFrameworkBlueprint(
      CYCLE_CONTENT,
      mockResolveContext(),
    );
    const types = blueprint.elements.map((el) => el.type);
    expect(types).toContain("animated-path");
    expect(types).toContain("node-activation");
  });

  it("produces no diagram elements when diagramHint is absent", () => {
    const blueprint = createFrameworkBlueprint(
      NO_DIAGRAM_CONTENT,
      mockResolveContext(),
    );
    const types = blueprint.elements.map((el) => el.type);
    expect(types).not.toContain("animated-path");
    expect(types).not.toContain("node-activation");
  });

  it("falls back gracefully for invalid diagramHint", () => {
    const content: FrameworkContent = {
      ...NO_DIAGRAM_CONTENT,
      diagramHint: "nonexistent-diagram-type-xyz",
    };
    const blueprint = createFrameworkBlueprint(content, mockResolveContext());
    const types = blueprint.elements.map((el) => el.type);
    expect(types).not.toContain("animated-path");
    expect(types).not.toContain("node-activation");
    // Should still produce a valid blueprint
    expect(blueprint.elements.length).toBeGreaterThan(0);
  });

  it("suppresses old divider connectors when diagram is present", () => {
    const blueprint = createFrameworkBlueprint(
      CYCLE_CONTENT,
      mockResolveContext(),
    );
    const connectors = blueprint.elements.find(
      (e) => e.id === "framework-connectors",
    );
    expect(connectors).toBeUndefined();
  });

  it("keeps old divider connectors when no diagram (showConnectors=true)", () => {
    const blueprint = createFrameworkBlueprint(
      NO_DIAGRAM_CONTENT,
      mockResolveContext(),
    );
    const connectors = blueprint.elements.find(
      (e) => e.id === "framework-connectors",
    );
    expect(connectors).toBeDefined();
  });

  it("sets diagram element layer to 15 (auxiliary background)", () => {
    const blueprint = createFrameworkBlueprint(
      CYCLE_CONTENT,
      mockResolveContext(),
    );
    const diagramEls = blueprint.elements.filter(
      (el) => el.type === "animated-path" || el.type === "node-activation",
    );
    expect(diagramEls.length).toBeGreaterThan(0);
    for (const el of diagramEls) {
      expect(el.props.layer).toBe(15);
    }
  });

  it("sets diagram element opacity to 0.2", () => {
    const blueprint = createFrameworkBlueprint(
      CYCLE_CONTENT,
      mockResolveContext(),
    );
    const diagramEls = blueprint.elements.filter(
      (el) => el.type === "animated-path" || el.type === "node-activation",
    );
    for (const el of diagramEls) {
      expect(el.props.opacity).toBe(0.2);
    }
  });

  it("does not mutate the cached DiagramSpec from metaphorToDiagramSpec", () => {
    const specBefore = metaphorToDiagramSpec("circular cycle");
    expect(specBefore).toBeTruthy();
    const nodeCountBefore = specBefore!.nodeCount;

    // Create blueprint (which internally calls metaphorToDiagramSpec + spread copy)
    createFrameworkBlueprint(CYCLE_CONTENT, mockResolveContext());

    const specAfter = metaphorToDiagramSpec("circular cycle");
    expect(specAfter!.nodeCount).toBe(nodeCountBefore);
    expect(specAfter!).not.toHaveProperty("nodeLabels");
  });

  it("passes correct node count matching items.length", () => {
    const blueprint = createFrameworkBlueprint(
      CYCLE_CONTENT,
      mockResolveContext(),
    );
    const nodeActivation = blueprint.elements.find(
      (el) => el.type === "node-activation",
    );
    expect(nodeActivation).toBeDefined();
    const nodes = nodeActivation!.props.nodes as Array<{
      label: string;
      cx: number;
      cy: number;
    }>;
    expect(nodes).toHaveLength(CYCLE_CONTENT.items.length);
  });

  it("passes actual item titles as node labels", () => {
    const blueprint = createFrameworkBlueprint(
      CYCLE_CONTENT,
      mockResolveContext(),
    );
    const nodeActivation = blueprint.elements.find(
      (el) => el.type === "node-activation",
    );
    const nodes = nodeActivation!.props.nodes as Array<{ label: string }>;
    const labels = nodes.map((n) => n.label);
    expect(labels).toEqual(["신호", "열망", "반응", "보상"]);
  });
});
