// ============================================================
// SceneSynthesizer — Unit Tests
// ============================================================

import { describe, it, expect } from "vitest";
import { synthesizeGaps } from "../sceneSynthesizer";
import type { SynthesizerContext } from "../sceneSynthesizer";
import { useTheme } from "@/design/themes/useTheme";
import {
  miracleMorningGaps,
  saversWheelGap,
  morningTimelineGap,
  miracleMorningFingerprint,
} from "./miracleMorning.fixture";

// ---------------------------------------------------------------------------
// Shared context
// ---------------------------------------------------------------------------

const theme = useTheme("dark", "selfHelp");

const ctx: SynthesizerContext = {
  format: "longform",
  theme,
  from: 0,
  durationFrames: 180,
  narrationText: "",
  emotionalTones: miracleMorningFingerprint.emotionalTone,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("synthesizeGaps", () => {
  it("converts SceneGap[] to SynthesizedBlueprint[]", () => {
    const blueprints = synthesizeGaps(miracleMorningGaps, ctx);
    expect(blueprints).toHaveLength(2);
  });

  it("all blueprints have origin synthesized", () => {
    const blueprints = synthesizeGaps(miracleMorningGaps, ctx);
    for (const bp of blueprints) {
      expect(bp.origin).toBe("synthesized");
    }
  });

  it("all blueprints have fallbackPreset and fallbackContent", () => {
    const blueprints = synthesizeGaps(miracleMorningGaps, ctx);
    for (const bp of blueprints) {
      expect(bp.fallbackPreset).toBeDefined();
      expect(bp.fallbackContent).toBeDefined();
    }
  });

  it("all blueprints have complete mediaPlan", () => {
    const blueprints = synthesizeGaps(miracleMorningGaps, ctx);
    for (const bp of blueprints) {
      expect(bp.mediaPlan).toBeDefined();
      expect(bp.mediaPlan.narrationText).toBeDefined();
      expect(bp.mediaPlan.captionPlan).toBeDefined();
      expect(bp.mediaPlan.captionPlan.maxCharsPerLine).toBe(28);
      expect(bp.mediaPlan.captionPlan.maxLines).toBe(2);
      expect(bp.mediaPlan.audioPlan).toBeDefined();
      expect(bp.mediaPlan.assetPlan).toBeDefined();
    }
  });

  it("all blueprints have synthesisConfidence", () => {
    const blueprints = synthesizeGaps(miracleMorningGaps, ctx);
    for (const bp of blueprints) {
      expect(bp.synthesisConfidence).toBeDefined();
      expect(bp.synthesisConfidence).toBeGreaterThan(0);
      expect(bp.synthesisConfidence).toBeLessThanOrEqual(1);
    }
  });

  it("all blueprints have non-empty elements", () => {
    const blueprints = synthesizeGaps(miracleMorningGaps, ctx);
    for (const bp of blueprints) {
      expect(bp.elements.length).toBeGreaterThan(0);
    }
  });
});

describe("SAVERS wheel gap → radial layout", () => {
  it("resolves to radial layout", () => {
    const [savers] = synthesizeGaps([saversWheelGap], ctx);
    expect(savers.layout).toBe("radial");
  });

  it("uses stagger-clockwise choreography", () => {
    const [savers] = synthesizeGaps([saversWheelGap], ctx);
    expect(savers.choreography).toBe("stagger-clockwise");
  });

  it("has high confidence (cyclic-flow + motif-wheel)", () => {
    const [savers] = synthesizeGaps([saversWheelGap], ctx);
    // cyclic-flow=1.0, motif-wheel=0.9 → best is 1.0
    expect(savers.synthesisConfidence).toBeGreaterThanOrEqual(0.9);
  });

  it("lifecycle is candidate-promotable (must + high confidence)", () => {
    const [savers] = synthesizeGaps([saversWheelGap], ctx);
    expect(savers.lifecycle).toBe("candidate-promotable");
  });

  it("fallback is framework preset", () => {
    const [savers] = synthesizeGaps([saversWheelGap], ctx);
    expect(savers.fallbackPreset).toBe("framework");
  });

  it("elements include radial center and orbit nodes", () => {
    const [savers] = synthesizeGaps([saversWheelGap], ctx);
    const center = savers.elements.find((e) => e.id === "synth-radial-center");
    expect(center).toBeDefined();
    expect(center!.props.text).toBe("SAVERS");

    const nodes = savers.elements.filter((e) =>
      e.id.startsWith("synth-radial-node-"),
    );
    expect(nodes).toHaveLength(6); // 6 SAVERS items

    const connectors = savers.elements.filter((e) =>
      e.id.startsWith("synth-radial-conn-"),
    );
    expect(connectors).toHaveLength(6); // cyclic: 6 connections
  });
});

describe("Morning timeline gap → timeline-h layout", () => {
  it("resolves to timeline-h layout", () => {
    const [timeline] = synthesizeGaps([morningTimelineGap], ctx);
    expect(timeline.layout).toBe("timeline-h");
  });

  it("uses reveal-sequence choreography", () => {
    const [timeline] = synthesizeGaps([morningTimelineGap], ctx);
    expect(timeline.choreography).toBe("reveal-sequence");
  });

  it("has confidence 1.0 (exact match)", () => {
    const [timeline] = synthesizeGaps([morningTimelineGap], ctx);
    expect(timeline.synthesisConfidence).toBe(1.0);
  });

  it("lifecycle is ephemeral (nice priority)", () => {
    const [timeline] = synthesizeGaps([morningTimelineGap], ctx);
    expect(timeline.lifecycle).toBe("ephemeral");
  });

  it("fallback is application preset", () => {
    const [timeline] = synthesizeGaps([morningTimelineGap], ctx);
    expect(timeline.fallbackPreset).toBe("application");
  });

  it("elements include timeline nodes", () => {
    const [timeline] = synthesizeGaps([morningTimelineGap], ctx);
    const nodes = timeline.elements.filter((e) =>
      e.id.startsWith("synth-timeline-node-"),
    );
    expect(nodes).toHaveLength(6); // 6 steps
  });
});

describe("lifecycle classification", () => {
  it("must + high confidence → candidate-promotable", () => {
    const [bp] = synthesizeGaps([saversWheelGap], ctx);
    expect(bp.lifecycle).toBe("candidate-promotable");
  });

  it("nice priority → ephemeral regardless of confidence", () => {
    const [bp] = synthesizeGaps([morningTimelineGap], ctx);
    expect(bp.lifecycle).toBe("ephemeral");
  });
});
