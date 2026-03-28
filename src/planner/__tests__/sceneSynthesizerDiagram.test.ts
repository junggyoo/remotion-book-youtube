// ============================================================
// SceneSynthesizer — Diagram Integration Tests (P2-1e)
// ============================================================

import { describe, it, expect } from "vitest";
import { synthesizeGaps } from "../sceneSynthesizer";
import type { SynthesizerContext } from "../sceneSynthesizer";
import { useTheme } from "@/design/themes/useTheme";
import {
  saversWheelGap,
  morningTimelineGap,
  miracleMorningFingerprint,
} from "./miracleMorning.fixture";
import type { SceneGap, PresetMatch, FrameworkContent } from "@/types";

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
// SAVERS wheel → cycle diagram (cyclic-flow capability → DiagramSpec match)
// ---------------------------------------------------------------------------

describe("P2-1e: SAVERS wheel gap → diagram elements", () => {
  it("produces animated-path elements from cycle DiagramSpec", () => {
    const [bp] = synthesizeGaps([saversWheelGap], ctx);
    const paths = bp.elements.filter((e) => e.type === "animated-path");
    // cycle with 6 nodes → 6 cyclic connections
    expect(paths.length).toBe(6);
  });

  it("produces node-activation element", () => {
    const [bp] = synthesizeGaps([saversWheelGap], ctx);
    const nodes = bp.elements.filter((e) => e.type === "node-activation");
    expect(nodes.length).toBe(1);
  });

  it("includes diagramSpec in blueprint metadata", () => {
    const [bp] = synthesizeGaps([saversWheelGap], ctx);
    expect(bp.diagramSpec).toBeDefined();
    expect(bp.diagramSpec!.diagramType).toBe("cycle");
    expect(bp.diagramSpec!.revealMode).toBe("trace");
  });

  it("preserves existing radial layout elements alongside diagram elements", () => {
    const [bp] = synthesizeGaps([saversWheelGap], ctx);
    // Existing radial elements still present
    const center = bp.elements.find((e) => e.id === "synth-radial-center");
    expect(center).toBeDefined();
    // Diagram elements added on top
    const paths = bp.elements.filter((e) => e.type === "animated-path");
    expect(paths.length).toBeGreaterThan(0);
  });

  it("animated-path elements have sequential startFrame", () => {
    const [bp] = synthesizeGaps([saversWheelGap], ctx);
    const paths = bp.elements.filter((e) => e.type === "animated-path");
    for (let i = 1; i < paths.length; i++) {
      const prev = paths[i - 1].props.startFrame as number;
      const curr = paths[i].props.startFrame as number;
      expect(curr).toBeGreaterThan(prev);
    }
  });
});

// ---------------------------------------------------------------------------
// Morning timeline gap → timeline diagram
// ---------------------------------------------------------------------------

describe("P2-1e: Morning timeline gap → diagram elements", () => {
  it("produces animated-path elements from timeline DiagramSpec", () => {
    const [bp] = synthesizeGaps([morningTimelineGap], ctx);
    const paths = bp.elements.filter((e) => e.type === "animated-path");
    // timeline with 6 nodes → 5 linear connections
    expect(paths.length).toBe(5);
  });

  it("includes diagramSpec with timeline type", () => {
    const [bp] = synthesizeGaps([morningTimelineGap], ctx);
    // timeline-h matches "timeline" keyword → diagramType "timeline"
    expect(bp.diagramSpec).toBeDefined();
    expect(bp.diagramSpec!.diagramType).toBe("timeline");
  });
});

// ---------------------------------------------------------------------------
// Non-diagram gaps → no diagram elements, no diagramSpec
// ---------------------------------------------------------------------------

describe("P2-1e: backward compatibility — non-diagram gaps", () => {
  const noMatchGap: SceneGap = {
    segment: "core",
    slotIndex: 3,
    bestPresetMatch: {
      segment: "core",
      slotIndex: 3,
      sceneType: "keyInsight",
      content: {
        headline: "Test headline",
        supportText: "Test support",
      },
      confidence: 0.5,
      scoreBreakdown: {
        delivery: 0.5,
        structure: 0.5,
        contentFit: 0.5,
        layout: 0.5,
        explanation: "generic",
      },
    } as PresetMatch,
    gapReason: "Q2: custom emphasis needed",
    requiredCapabilities: ["emphasis-hold", "custom-dramatic"],
    priority: "nice",
    intent: "A test gap with no diagram-matchable capabilities",
  };

  it("produces no animated-path or node-activation elements", () => {
    const [bp] = synthesizeGaps([noMatchGap], ctx);
    const paths = bp.elements.filter((e) => e.type === "animated-path");
    const nodes = bp.elements.filter((e) => e.type === "node-activation");
    expect(paths.length).toBe(0);
    expect(nodes.length).toBe(0);
  });

  it("has no diagramSpec in metadata", () => {
    const [bp] = synthesizeGaps([noMatchGap], ctx);
    expect(bp.diagramSpec).toBeUndefined();
  });

  it("still produces standard elements", () => {
    const [bp] = synthesizeGaps([noMatchGap], ctx);
    expect(bp.elements.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Unsupported diagram type → silent fallback
// ---------------------------------------------------------------------------

describe("P2-1e: unsupported diagram type → graceful fallback", () => {
  const hierarchyGap: SceneGap = {
    segment: "core",
    slotIndex: 5,
    bestPresetMatch: {
      segment: "core",
      slotIndex: 5,
      sceneType: "framework",
      content: {
        frameworkLabel: "Hierarchy Test",
        items: [
          { number: 1, title: "Top", description: "Top level" },
          { number: 2, title: "Mid", description: "Mid level" },
          { number: 3, title: "Bottom", description: "Bottom level" },
        ],
        showConnectors: false,
        showDescriptions: true,
      } satisfies FrameworkContent,
      confidence: 0.4,
      scoreBreakdown: {
        delivery: 0.5,
        structure: 0.3,
        contentFit: 0.4,
        layout: 0.4,
        explanation: "hierarchy needed",
      },
    } as PresetMatch,
    gapReason: "Q1: hierarchy diagram needed",
    // "hierarchy" does not exist in DIAGRAM_PATTERNS keyword list
    requiredCapabilities: ["custom-hierarchy-view"],
    priority: "nice",
    intent: "A hierarchy diagram that has no DiagramSpec match",
  };

  it("falls back gracefully — no diagram elements, no crash", () => {
    const [bp] = synthesizeGaps([hierarchyGap], ctx);
    // Should still work — just no diagram elements
    expect(bp.elements.length).toBeGreaterThan(0);
    expect(bp.diagramSpec).toBeUndefined();
  });
});
