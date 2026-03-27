import { describe, it, expect } from "vitest";
import { metaphorToDiagramSpec, extractDiagramSpecs } from "../diagramSpec";
import type { BookArtDirection } from "../types";
import { DiagramSpecSchema } from "../schemas";

// ---------------------------------------------------------------------------
// metaphorToDiagramSpec — individual pattern tests
// ---------------------------------------------------------------------------

describe("metaphorToDiagramSpec", () => {
  it("matches circular cycle pattern via regex", () => {
    const result = metaphorToDiagramSpec(
      "circular multi-step cycle with directional arrows",
    );
    expect(result).not.toBeNull();
    expect(result!.diagramType).toBe("cycle");
    expect(result!.connectionPattern).toBe("cyclic");
    expect(result!.animationHint).toBe("path-draw");
    expect(result!.sourceMetaphor).toBe(
      "circular multi-step cycle with directional arrows",
    );
  });

  it("matches feedback loop variant", () => {
    const result = metaphorToDiagramSpec("feedback loop of reinforcement");
    expect(result).not.toBeNull();
    expect(result!.diagramType).toBe("cycle");
  });

  it("matches exponential curve pattern", () => {
    const result = metaphorToDiagramSpec(
      "exponential growth curve showing compound effects",
    );
    expect(result).not.toBeNull();
    expect(result!.diagramType).toBe("flow");
    expect(result!.animationHint).toBe("fill-progress");
  });

  it("matches iceberg pattern", () => {
    const result = metaphorToDiagramSpec(
      "iceberg model of visible vs hidden habits",
    );
    expect(result).not.toBeNull();
    expect(result!.diagramType).toBe("split");
    expect(result!.connectionPattern).toBe("layered");
    expect(result!.animationHint).toBe("node-activate");
  });

  it("matches side-by-side contrasting panels", () => {
    const result = metaphorToDiagramSpec(
      "side-by-side contrasting panels with divider",
    );
    expect(result).not.toBeNull();
    expect(result!.diagramType).toBe("split");
    expect(result!.animationHint).toBe("split-reveal");
  });

  it("returns null for non-diagram metaphors", () => {
    expect(
      metaphorToDiagramSpec(
        "large serif typography with subtle texture overlay",
      ),
    ).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(metaphorToDiagramSpec("")).toBeNull();
  });

  it("is case-insensitive", () => {
    const result = metaphorToDiagramSpec("CIRCULAR MULTI-STEP CYCLE");
    expect(result).not.toBeNull();
    expect(result!.diagramType).toBe("cycle");
  });

  it("matches via keyword fallback when regex misses", () => {
    const result = metaphorToDiagramSpec("rotating wheel of habits");
    expect(result).not.toBeNull();
    expect(result!.diagramType).toBe("cycle");
  });
});

// ---------------------------------------------------------------------------
// extractDiagramSpecs — batch conversion with atomic-habits fixture
// ---------------------------------------------------------------------------

/** Test fixture matching atomic-habits art direction structure (no hardcoded colors). */
function createTestArtDirection(): BookArtDirection {
  return {
    bookId: "atomic-habits-2024",
    palette: {
      primary: "tok-primary",
      secondary: "tok-secondary",
      contrast: "high",
    },
    signalColor: "tok-signal",
    shapeLanguage: "geometric",
    textureMood: "grain",
    visualMetaphors: [
      {
        concept: "structured framework",
        metaphor: "circular multi-step cycle with directional arrows",
        usage: "framework scene",
      },
      {
        concept: "split comparison",
        metaphor: "side-by-side contrasting panels with divider",
        usage: "compareContrast scene",
      },
      {
        concept: "quote emphasis",
        metaphor: "large serif typography with subtle texture overlay",
        usage: "quote scene",
      },
    ],
    layoutBias: "grid-heavy",
    motionCharacter: "precise",
    typographyMood: "warm",
  } as BookArtDirection;
}

describe("extractDiagramSpecs", () => {
  it("returns 2 matches for atomic-habits art direction", () => {
    const results = extractDiagramSpecs(createTestArtDirection());
    expect(results).toHaveLength(2);
  });

  it("matches cycle and split, not typography", () => {
    const results = extractDiagramSpecs(createTestArtDirection());
    const concepts = results.map((r) => r.metaphorConcept);
    expect(concepts).toContain("structured framework");
    expect(concepts).toContain("split comparison");
    expect(concepts).not.toContain("quote emphasis");
  });

  it("uses metaphorConcept not index for identification", () => {
    const results = extractDiagramSpecs(createTestArtDirection());
    const cycle = results.find(
      (r) => r.metaphorConcept === "structured framework",
    );
    expect(cycle).toBeDefined();
    expect(cycle!.spec.diagramType).toBe("cycle");
    expect(cycle!.spec.animationHint).toBe("path-draw");
  });

  it("handles empty visualMetaphors", () => {
    const empty = { ...createTestArtDirection(), visualMetaphors: [] };
    expect(extractDiagramSpecs(empty)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Zod schema validation
// ---------------------------------------------------------------------------

describe("DiagramSpecSchema", () => {
  it("validates a correct spec", () => {
    const valid = {
      diagramType: "cycle",
      connectionPattern: "cyclic",
      animationHint: "path-draw",
      layoutHint: "circular",
      sourceMetaphor: "circular multi-step cycle",
    };
    expect(() => DiagramSpecSchema.parse(valid)).not.toThrow();
  });

  it("rejects invalid diagramType", () => {
    const invalid = {
      diagramType: "invalid",
      connectionPattern: "cyclic",
      animationHint: "path-draw",
      sourceMetaphor: "test",
    };
    expect(() => DiagramSpecSchema.parse(invalid)).toThrow();
  });

  it("allows optional fields", () => {
    const minimal = {
      diagramType: "flow",
      connectionPattern: "linear",
      animationHint: "fill-progress",
      sourceMetaphor: "growth curve",
    };
    const result = DiagramSpecSchema.parse(minimal);
    expect(result.layoutHint).toBeUndefined();
    expect(result.nodeCount).toBeUndefined();
  });
});
