import { describe, it, expect } from "vitest";
import { saversWheelBlueprint } from "./saversWheel.fixture";
import { useLayoutEngine } from "../layouts";
import type { LayoutPosition } from "../layouts";
import { useChoreography } from "../choreography";
import { useFormat } from "@/design/themes/useFormat";
import { getPrimitive } from "../primitiveRegistry";

describe("SAVERS Wheel Blueprint", () => {
  it("fixture has correct element counts (7 nodes + 6 edges = 13)", () => {
    expect(saversWheelBlueprint.elements).toHaveLength(13);
  });

  it("fixture has center headline as first element", () => {
    const center = saversWheelBlueprint.elements[0];
    expect(center.id).toBe("savers-center");
    expect(center.type).toBe("headline");
    expect(center.props.role).toBe("center");
  });

  it("fixture has 6 label nodes after center", () => {
    const labels = saversWheelBlueprint.elements.slice(1, 7);
    expect(labels).toHaveLength(6);
    labels.forEach((el) => {
      expect(el.type).toBe("label");
    });
  });

  it("fixture has 6 cycle-connector edges", () => {
    const connectors = saversWheelBlueprint.elements.slice(7);
    expect(connectors).toHaveLength(6);
    connectors.forEach((el) => {
      expect(el.type).toBe("cycle-connector");
      expect(el.props.connects).toBeDefined();
    });
  });

  it("fixture has valid mediaPlan", () => {
    const { mediaPlan } = saversWheelBlueprint;
    expect(mediaPlan.narrationText).toBeTruthy();
    expect(mediaPlan.captionPlan.maxCharsPerLine).toBe(28);
    expect(mediaPlan.audioPlan.ttsEngine).toBe("edge-tts");
  });
});

describe("Layout Engine — radial", () => {
  const formatConfig = useFormat("longform");
  const nodeElements = saversWheelBlueprint.elements.filter(
    (el) => !el.props.connects,
  );

  it("returns positions for all 7 node elements", () => {
    const engine = useLayoutEngine("radial", saversWheelBlueprint.layoutConfig);
    const positions = engine.resolve(nodeElements, formatConfig);
    expect(positions).toHaveLength(7);
  });

  it("center element is roughly centered", () => {
    const engine = useLayoutEngine("radial", saversWheelBlueprint.layoutConfig);
    const positions = engine.resolve(nodeElements, formatConfig);
    const center = positions[0];
    const canvasCenterX = formatConfig.width / 2;
    const canvasCenterY = formatConfig.height / 2;

    // Center should be within 100px of canvas center
    const centerX = center.left + center.width / 2;
    const centerY = center.top + center.height / 2;
    expect(Math.abs(centerX - canvasCenterX)).toBeLessThan(100);
    expect(Math.abs(centerY - canvasCenterY)).toBeLessThan(100);
  });

  it("radial elements are distributed around center", () => {
    const engine = useLayoutEngine("radial", saversWheelBlueprint.layoutConfig);
    const positions = engine.resolve(nodeElements, formatConfig);

    // All 6 radial nodes should be at roughly the same distance from center
    const center = positions[0];
    const cx = center.left + center.width / 2;
    const cy = center.top + center.height / 2;

    const distances = positions.slice(1).map((pos) => {
      const px = pos.left + pos.width / 2;
      const py = pos.top + pos.height / 2;
      return Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
    });

    // All distances should be within 5% of each other
    const avgDist = distances.reduce((a, b) => a + b, 0) / distances.length;
    distances.forEach((d) => {
      expect(Math.abs(d - avgDist) / avgDist).toBeLessThan(0.05);
    });
  });

  it("all positions are within canvas bounds", () => {
    const engine = useLayoutEngine("radial", saversWheelBlueprint.layoutConfig);
    const positions = engine.resolve(nodeElements, formatConfig);

    positions.forEach((pos: LayoutPosition) => {
      expect(pos.left).toBeGreaterThanOrEqual(0);
      expect(pos.top).toBeGreaterThanOrEqual(0);
      expect(pos.left + pos.width).toBeLessThanOrEqual(formatConfig.width);
      expect(pos.top + pos.height).toBeLessThanOrEqual(formatConfig.height);
    });
  });
});

describe("Choreography — stagger-clockwise", () => {
  it("returns timings for all 13 elements", () => {
    const engine = useChoreography("stagger-clockwise", "smooth");
    const timings = engine.plan(
      saversWheelBlueprint.elements,
      saversWheelBlueprint.durationFrames,
    );
    expect(timings).toHaveLength(13);
  });

  it("center element has delay 0", () => {
    const engine = useChoreography("stagger-clockwise", "smooth");
    const timings = engine.plan(
      saversWheelBlueprint.elements,
      saversWheelBlueprint.durationFrames,
    );
    expect(timings[0].delayFrames).toBe(0);
  });

  it("subsequent elements have increasing delays", () => {
    const engine = useChoreography("stagger-clockwise", "smooth");
    const timings = engine.plan(
      saversWheelBlueprint.elements,
      saversWheelBlueprint.durationFrames,
    );

    // Node elements (1-6) should have increasing delays
    for (let i = 2; i <= 6; i++) {
      expect(timings[i].delayFrames).toBeGreaterThanOrEqual(
        timings[i - 1].delayFrames,
      );
    }
  });

  it("all timings fit within total duration", () => {
    const engine = useChoreography("stagger-clockwise", "smooth");
    const timings = engine.plan(
      saversWheelBlueprint.elements,
      saversWheelBlueprint.durationFrames,
    );

    timings.forEach((t) => {
      expect(t.delayFrames + t.durationFrames).toBeLessThanOrEqual(
        saversWheelBlueprint.durationFrames,
      );
    });
  });
});

describe("Primitive Registry", () => {
  it("has adapters for all element types in SAVERS fixture", () => {
    const types = new Set(saversWheelBlueprint.elements.map((el) => el.type));
    types.forEach((type) => {
      expect(getPrimitive(type)).toBeDefined();
    });
  });

  it("returns undefined for unknown types", () => {
    expect(getPrimitive("nonexistent-type-xyz")).toBeUndefined();
  });
});
