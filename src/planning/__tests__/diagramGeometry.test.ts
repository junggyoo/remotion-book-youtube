import { describe, it, expect } from "vitest";
import { buildDiagramGeometry, type DiagramGeometry } from "../diagramGeometry";
import { metaphorToDiagramSpec } from "../diagramSpec";
import type { DiagramSpec } from "@/types";

// ============================================================
// Helper
// ============================================================

const LONGFORM_W = 1920;
const LONGFORM_H = 1080;
const DIAGONAL = Math.sqrt(LONGFORM_W ** 2 + LONGFORM_H ** 2);
const MIN_NODE_DIST = DIAGONAL * 0.12;

function makeCycleSpec(nodeCount = 4): DiagramSpec {
  return {
    diagramType: "cycle",
    nodeCount,
    connectionPattern: "cyclic",
    animationHint: "path-draw",
    layoutHint: "circular",
    sourceMetaphor: "circular multi-step cycle",
    revealMode: "trace",
    completionBehavior: "hold",
  };
}

function makeFlowSpec(nodeCount = 4): DiagramSpec {
  return {
    diagramType: "flow",
    nodeCount,
    connectionPattern: "linear",
    animationHint: "fill-progress",
    layoutHint: "horizontal-split",
    sourceMetaphor: "growth flow",
    revealMode: "construct",
    completionBehavior: "hold",
  };
}

function makeSplitSpec(nodeCount = 2): DiagramSpec {
  return {
    diagramType: "split",
    nodeCount,
    connectionPattern: "linear",
    animationHint: "split-reveal",
    layoutHint: "horizontal-split",
    sourceMetaphor: "side-by-side comparison",
    revealMode: "construct",
    completionBehavior: "hold",
  };
}

function makeTimelineSpec(nodeCount = 5): DiagramSpec {
  return {
    diagramType: "timeline",
    nodeCount,
    connectionPattern: "linear",
    animationHint: "path-draw",
    layoutHint: "horizontal-split",
    sourceMetaphor: "timeline progression",
    revealMode: "trace",
    completionBehavior: "hold",
  };
}

function makePyramidSpec(nodeCount = 4): DiagramSpec {
  return {
    diagramType: "pyramid",
    nodeCount,
    connectionPattern: "layered",
    animationHint: "node-activate",
    layoutHint: "vertical-stack",
    sourceMetaphor: "priority pyramid",
    revealMode: "cascade",
    completionBehavior: "zoom-node",
  };
}

function nodeDistance(g: DiagramGeometry, i: number, j: number): number {
  const a = g.nodes[i];
  const b = g.nodes[j];
  return Math.sqrt((a.cx - b.cx) ** 2 + (a.cy - b.cy) ** 2);
}

function isValidSvgPath(path: string): boolean {
  // Basic SVG path validation: starts with M, contains coordinates
  return /^M\s+[\d.]+\s+[\d.]+/.test(path);
}

// ============================================================
// Basic Geometry Generation
// ============================================================

describe("buildDiagramGeometry", () => {
  describe("cycle", () => {
    it("generates correct number of nodes and connections", () => {
      const geo = buildDiagramGeometry(
        makeCycleSpec(4),
        LONGFORM_W,
        LONGFORM_H,
      );
      expect(geo.nodes).toHaveLength(4);
      expect(geo.connections).toHaveLength(4); // cyclic: N connections for N nodes
    });

    it("Rule 4: first node is at 12 o'clock (top-center)", () => {
      const geo = buildDiagramGeometry(
        makeCycleSpec(4),
        LONGFORM_W,
        LONGFORM_H,
      );
      const first = geo.nodes[0];
      const centerX = LONGFORM_W / 2;
      // 12시 = 캔버스 상단 중앙
      expect(Math.abs(first.cx - centerX)).toBeLessThan(1);
      expect(first.cy).toBeLessThan(LONGFORM_H / 2);
    });

    it("connections form a complete loop", () => {
      const geo = buildDiagramGeometry(
        makeCycleSpec(4),
        LONGFORM_W,
        LONGFORM_H,
      );
      const lastConn = geo.connections[geo.connections.length - 1];
      expect(lastConn.fromNodeId).toBe("node-3");
      expect(lastConn.toNodeId).toBe("node-0");
    });
  });

  describe("flow", () => {
    it("generates N nodes and N-1 connections", () => {
      const geo = buildDiagramGeometry(makeFlowSpec(4), LONGFORM_W, LONGFORM_H);
      expect(geo.nodes).toHaveLength(4);
      expect(geo.connections).toHaveLength(3);
    });

    it("nodes are horizontally ordered", () => {
      const geo = buildDiagramGeometry(makeFlowSpec(4), LONGFORM_W, LONGFORM_H);
      for (let i = 0; i < geo.nodes.length - 1; i++) {
        expect(geo.nodes[i].cx).toBeLessThan(geo.nodes[i + 1].cx);
      }
    });
  });

  describe("split", () => {
    it("generates 2 nodes for default split", () => {
      const geo = buildDiagramGeometry(
        makeSplitSpec(2),
        LONGFORM_W,
        LONGFORM_H,
      );
      expect(geo.nodes).toHaveLength(2);
      expect(geo.connections).toHaveLength(1);
    });
  });

  describe("timeline", () => {
    it("generates correct structure", () => {
      const geo = buildDiagramGeometry(
        makeTimelineSpec(5),
        LONGFORM_W,
        LONGFORM_H,
      );
      expect(geo.nodes).toHaveLength(5);
      expect(geo.connections).toHaveLength(4);
    });
  });

  describe("pyramid", () => {
    it("generates vertically stacked nodes", () => {
      const geo = buildDiagramGeometry(
        makePyramidSpec(4),
        LONGFORM_W,
        LONGFORM_H,
      );
      expect(geo.nodes).toHaveLength(4);
      // 위에서 아래로 cy 증가
      for (let i = 0; i < geo.nodes.length - 1; i++) {
        expect(geo.nodes[i].cy).toBeLessThan(geo.nodes[i + 1].cy);
      }
    });
  });

  describe("unimplemented types", () => {
    it("throws for hierarchy", () => {
      expect(() =>
        buildDiagramGeometry(
          {
            diagramType: "hierarchy",
            connectionPattern: "branching",
            animationHint: "node-activate",
            sourceMetaphor: "test",
          },
          LONGFORM_W,
          LONGFORM_H,
        ),
      ).toThrow("Not implemented: hierarchy");
    });

    it("throws for hub-spoke", () => {
      expect(() =>
        buildDiagramGeometry(
          {
            diagramType: "hub-spoke",
            connectionPattern: "radial",
            animationHint: "node-activate",
            sourceMetaphor: "test",
          },
          LONGFORM_W,
          LONGFORM_H,
        ),
      ).toThrow("Not implemented: hub-spoke");
    });
  });
});

// ============================================================
// Layout Quality Rules
// ============================================================

describe("Layout Quality Rules", () => {
  it("Rule 1: minimum node distance >= 12% of canvas diagonal", () => {
    const geo = buildDiagramGeometry(makeCycleSpec(4), LONGFORM_W, LONGFORM_H);
    for (let i = 0; i < geo.nodes.length; i++) {
      for (let j = i + 1; j < geo.nodes.length; j++) {
        expect(nodeDistance(geo, i, j)).toBeGreaterThanOrEqual(
          MIN_NODE_DIST * 0.99, // 부동소수점 허용
        );
      }
    }
  });

  it("Rule 2: all nodes have labelBounds", () => {
    const geo = buildDiagramGeometry(makeFlowSpec(4), LONGFORM_W, LONGFORM_H);
    for (const node of geo.nodes) {
      expect(node.labelBounds).toBeDefined();
      expect(node.labelBounds.width).toBeGreaterThan(0);
      expect(node.labelBounds.height).toBeGreaterThan(0);
    }
  });

  it("Rule 4: cycle starts at 12 o'clock", () => {
    const geo = buildDiagramGeometry(makeCycleSpec(6), LONGFORM_W, LONGFORM_H);
    const first = geo.nodes[0];
    // 12시 = 캔버스 중앙 위 (cy < center)
    expect(first.cy).toBeLessThan(LONGFORM_H / 2);
    // X는 중앙
    expect(Math.abs(first.cx - LONGFORM_W / 2)).toBeLessThan(1);
  });

  it("Rule 5: curvature deviation <= 0.2 within a diagram", () => {
    const geo = buildDiagramGeometry(makeCycleSpec(6), LONGFORM_W, LONGFORM_H);
    if (geo.connections.length <= 1) return;
    const curvatures = geo.connections.map((c) => c.curvature);
    const avg = curvatures.reduce((a, b) => a + b, 0) / curvatures.length;
    for (const c of curvatures) {
      expect(Math.abs(c - avg)).toBeLessThanOrEqual(0.2 + 0.001);
    }
  });
});

// ============================================================
// SVG Path Validity
// ============================================================

describe("SVG pathData validity", () => {
  it("all connections have valid SVG path strings", () => {
    const specs = [
      makeCycleSpec(4),
      makeFlowSpec(4),
      makeTimelineSpec(5),
      makePyramidSpec(4),
      makeSplitSpec(2),
    ];
    for (const spec of specs) {
      const geo = buildDiagramGeometry(spec, LONGFORM_W, LONGFORM_H);
      for (const conn of geo.connections) {
        expect(isValidSvgPath(conn.pathData)).toBe(true);
      }
    }
  });
});

// ============================================================
// Atomic Habits Integration: habit loop → cycle geometry
// ============================================================

describe("atomic-habits integration", () => {
  it("habit loop metaphor → cycle DiagramSpec with revealMode", () => {
    const spec = metaphorToDiagramSpec(
      "circular multi-step cycle with directional arrows",
    );
    expect(spec).not.toBeNull();
    expect(spec!.diagramType).toBe("cycle");
    expect(spec!.revealMode).toBe("trace");
    expect(spec!.completionBehavior).toBe("hold");
  });

  it("habit loop spec → valid cycle DiagramGeometry", () => {
    const spec = metaphorToDiagramSpec(
      "circular multi-step cycle with directional arrows",
    );
    expect(spec).not.toBeNull();

    const geo = buildDiagramGeometry(
      { ...spec!, nodeCount: 4 },
      LONGFORM_W,
      LONGFORM_H,
    );
    expect(geo.nodes).toHaveLength(4);
    expect(geo.connections).toHaveLength(4);

    // 12시 시작
    expect(geo.nodes[0].cy).toBeLessThan(LONGFORM_H / 2);

    // 모든 path가 유효
    for (const conn of geo.connections) {
      expect(isValidSvgPath(conn.pathData)).toBe(true);
    }
  });

  it("timeline metaphor maps correctly", () => {
    const spec = metaphorToDiagramSpec(
      "timeline progression through milestones",
    );
    expect(spec).not.toBeNull();
    expect(spec!.diagramType).toBe("timeline");
    expect(spec!.revealMode).toBe("trace");
  });

  it("pyramid metaphor maps correctly", () => {
    const spec = metaphorToDiagramSpec("priority pyramid of habit layers");
    expect(spec).not.toBeNull();
    expect(spec!.diagramType).toBe("pyramid");
    expect(spec!.revealMode).toBe("cascade");
    expect(spec!.completionBehavior).toBe("zoom-node");
  });
});
