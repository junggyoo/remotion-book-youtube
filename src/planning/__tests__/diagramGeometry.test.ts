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
  });

  describe("ladder", () => {
    function makeLadderSpec(nodeCount = 4): DiagramSpec {
      return {
        diagramType: "ladder",
        nodeCount,
        connectionPattern: "linear",
        animationHint: "node-activate",
        layoutHint: "vertical-stack",
        sourceMetaphor: "ladder steps ascending",
        revealMode: "cascade",
        completionBehavior: "hold",
      };
    }

    it("generates ladder geometry with alternating left-right nodes", () => {
      const geo = buildDiagramGeometry(
        makeLadderSpec(4),
        LONGFORM_W,
        LONGFORM_H,
      );
      expect(geo.nodes).toHaveLength(4);
      // Odd indices (0, 2) = left, even indices (1, 3) = right
      expect(geo.nodes[0].cx).toBeLessThan(960);
      expect(geo.nodes[1].cx).toBeGreaterThan(960);
      expect(geo.nodes[2].cx).toBeLessThan(960);
      expect(geo.nodes[3].cx).toBeGreaterThan(960);
    });

    it("nodes are vertically distributed top to bottom", () => {
      const geo = buildDiagramGeometry(
        makeLadderSpec(4),
        LONGFORM_W,
        LONGFORM_H,
      );
      for (let i = 0; i < geo.nodes.length - 1; i++) {
        expect(geo.nodes[i].cy).toBeLessThan(geo.nodes[i + 1].cy);
      }
    });

    it("generates N-1 zigzag connections", () => {
      const geo = buildDiagramGeometry(
        makeLadderSpec(4),
        LONGFORM_W,
        LONGFORM_H,
      );
      expect(geo.connections).toHaveLength(3);
      for (const conn of geo.connections) {
        expect(isValidSvgPath(conn.pathData)).toBe(true);
      }
    });
  });

  describe("hub-spoke", () => {
    function makeHubSpokeSpec(nodeCount = 5): DiagramSpec {
      return {
        diagramType: "hub-spoke",
        nodeCount,
        connectionPattern: "radial",
        animationHint: "node-activate",
        layoutHint: "circular",
        sourceMetaphor: "hub and spoke central radial",
        revealMode: "construct",
        completionBehavior: "hold",
      };
    }

    it("generates hub-spoke geometry with center hub", () => {
      const geo = buildDiagramGeometry(
        makeHubSpokeSpec(5),
        LONGFORM_W,
        LONGFORM_H,
      );
      expect(geo.nodes).toHaveLength(5);
      // First node is hub at center
      expect(geo.nodes[0].cx).toBeCloseTo(960, -1);
      expect(geo.nodes[0].cy).toBeCloseTo(540, -1);
    });

    it("spoke nodes are equally spaced on a circle", () => {
      const geo = buildDiagramGeometry(
        makeHubSpokeSpec(5),
        LONGFORM_W,
        LONGFORM_H,
      );
      const hub = geo.nodes[0];
      const spokes = geo.nodes.slice(1);
      // All spokes should be roughly the same distance from hub
      const distances = spokes.map((s) =>
        Math.sqrt((s.cx - hub.cx) ** 2 + (s.cy - hub.cy) ** 2),
      );
      const avgDist = distances.reduce((a, b) => a + b, 0) / distances.length;
      for (const d of distances) {
        expect(Math.abs(d - avgDist)).toBeLessThan(1);
      }
    });

    it("connections go from hub to each spoke", () => {
      const geo = buildDiagramGeometry(
        makeHubSpokeSpec(5),
        LONGFORM_W,
        LONGFORM_H,
      );
      expect(geo.connections).toHaveLength(4); // 4 spokes
      for (const conn of geo.connections) {
        expect(conn.fromNodeId).toBe("node-0");
        expect(isValidSvgPath(conn.pathData)).toBe(true);
      }
    });
  });

  describe("matrix2x2", () => {
    function makeMatrix2x2Spec(): DiagramSpec {
      return {
        diagramType: "matrix2x2",
        nodeCount: 4,
        connectionPattern: "linear",
        animationHint: "node-activate",
        layoutHint: "grid",
        sourceMetaphor: "matrix quadrant 2x2",
        revealMode: "construct",
        completionBehavior: "hold",
      };
    }

    it("generates matrix2x2 geometry with 4 quadrant nodes", () => {
      const geo = buildDiagramGeometry(
        makeMatrix2x2Spec(),
        LONGFORM_W,
        LONGFORM_H,
      );
      expect(geo.nodes).toHaveLength(4);
    });

    it("nodes are in quadrant positions", () => {
      const geo = buildDiagramGeometry(
        makeMatrix2x2Spec(),
        LONGFORM_W,
        LONGFORM_H,
      );
      const cx = LONGFORM_W / 2;
      const cy = LONGFORM_H / 2;
      // Top-left
      expect(geo.nodes[0].cx).toBeLessThan(cx);
      expect(geo.nodes[0].cy).toBeLessThan(cy);
      // Top-right
      expect(geo.nodes[1].cx).toBeGreaterThan(cx);
      expect(geo.nodes[1].cy).toBeLessThan(cy);
      // Bottom-left
      expect(geo.nodes[2].cx).toBeLessThan(cx);
      expect(geo.nodes[2].cy).toBeGreaterThan(cy);
      // Bottom-right
      expect(geo.nodes[3].cx).toBeGreaterThan(cx);
      expect(geo.nodes[3].cy).toBeGreaterThan(cy);
    });

    it("has 4 grid connections (2 horizontal + 2 vertical)", () => {
      const geo = buildDiagramGeometry(
        makeMatrix2x2Spec(),
        LONGFORM_W,
        LONGFORM_H,
      );
      expect(geo.connections).toHaveLength(4);
      for (const conn of geo.connections) {
        expect(isValidSvgPath(conn.pathData)).toBe(true);
      }
    });
  });

  describe("funnel", () => {
    function makeFunnelSpec(nodeCount = 4): DiagramSpec {
      return {
        diagramType: "funnel",
        nodeCount,
        connectionPattern: "linear",
        animationHint: "fill-progress",
        layoutHint: "vertical-stack",
        sourceMetaphor: "funnel filter narrowing",
        revealMode: "cascade",
        completionBehavior: "hold",
      };
    }

    it("generates funnel geometry with decreasing width", () => {
      const geo = buildDiagramGeometry(
        makeFunnelSpec(4),
        LONGFORM_W,
        LONGFORM_H,
      );
      expect(geo.nodes).toHaveLength(4);
      // Label bounds width should decrease top to bottom
      for (let i = 0; i < geo.nodes.length - 1; i++) {
        expect(geo.nodes[i].labelBounds.width).toBeGreaterThan(
          geo.nodes[i + 1].labelBounds.width,
        );
      }
    });

    it("nodes are centered horizontally and distributed vertically", () => {
      const geo = buildDiagramGeometry(
        makeFunnelSpec(4),
        LONGFORM_W,
        LONGFORM_H,
      );
      const cx = LONGFORM_W / 2;
      for (const node of geo.nodes) {
        expect(node.cx).toBeCloseTo(cx, -1);
      }
      for (let i = 0; i < geo.nodes.length - 1; i++) {
        expect(geo.nodes[i].cy).toBeLessThan(geo.nodes[i + 1].cy);
      }
    });

    it("has sequential vertical connections", () => {
      const geo = buildDiagramGeometry(
        makeFunnelSpec(4),
        LONGFORM_W,
        LONGFORM_H,
      );
      expect(geo.connections).toHaveLength(3);
      for (let i = 0; i < geo.connections.length; i++) {
        expect(geo.connections[i].fromNodeId).toBe(`node-${i}`);
        expect(geo.connections[i].toNodeId).toBe(`node-${i + 1}`);
        expect(isValidSvgPath(geo.connections[i].pathData)).toBe(true);
      }
    });
  });
});

// ============================================================
// Shorts Format Geometry
// ============================================================

const SHORTS_W = 1080;
const SHORTS_H = 1920;

describe("buildDiagramGeometry — shorts format", () => {
  it("cycle uses tighter radius in shorts", () => {
    const longGeo = buildDiagramGeometry(
      makeCycleSpec(4),
      LONGFORM_W,
      LONGFORM_H,
      "longform",
    );
    const shortsGeo = buildDiagramGeometry(
      makeCycleSpec(4),
      SHORTS_W,
      SHORTS_H,
      "shorts",
    );
    const longRadius = Math.hypot(
      longGeo.nodes[1].cx - longGeo.nodes[0].cx,
      longGeo.nodes[1].cy - longGeo.nodes[0].cy,
    );
    const shortsRadius = Math.hypot(
      shortsGeo.nodes[1].cx - shortsGeo.nodes[0].cx,
      shortsGeo.nodes[1].cy - shortsGeo.nodes[0].cy,
    );
    expect(shortsRadius).toBeLessThan(longRadius);
  });

  it("flow switches to vertical in shorts", () => {
    const shortsGeo = buildDiagramGeometry(
      makeFlowSpec(3),
      SHORTS_W,
      SHORTS_H,
      "shorts",
    );
    // Nodes should be vertically ordered (increasing cy)
    expect(shortsGeo.nodes[0].cy).toBeLessThan(shortsGeo.nodes[1].cy);
    expect(shortsGeo.nodes[1].cy).toBeLessThan(shortsGeo.nodes[2].cy);
    // All at same cx (centered)
    expect(shortsGeo.nodes[0].cx).toBeCloseTo(shortsGeo.nodes[1].cx, 0);
  });

  it("timeline switches to vertical in shorts", () => {
    const shortsGeo = buildDiagramGeometry(
      makeTimelineSpec(4),
      SHORTS_W,
      SHORTS_H,
      "shorts",
    );
    for (let i = 0; i < shortsGeo.nodes.length - 1; i++) {
      expect(shortsGeo.nodes[i].cy).toBeLessThan(shortsGeo.nodes[i + 1].cy);
    }
  });

  it("pyramid has narrower base in shorts", () => {
    const longGeo = buildDiagramGeometry(
      makePyramidSpec(4),
      LONGFORM_W,
      LONGFORM_H,
      "longform",
    );
    const shortsGeo = buildDiagramGeometry(
      makePyramidSpec(4),
      SHORTS_W,
      SHORTS_H,
      "shorts",
    );
    // Bottom node (last) label width should be narrower in shorts
    const longBottom = longGeo.nodes[longGeo.nodes.length - 1];
    const shortsBottom = shortsGeo.nodes[shortsGeo.nodes.length - 1];
    // Compare width ratio relative to canvas width
    const longRatio = longBottom.labelBounds.width / LONGFORM_W;
    const shortsRatio = shortsBottom.labelBounds.width / SHORTS_W;
    expect(shortsRatio).toBeLessThan(longRatio);
  });

  it("hub-spoke uses tighter radius in shorts", () => {
    function makeHubSpokeSpec(nodeCount = 5): DiagramSpec {
      return {
        diagramType: "hub-spoke",
        nodeCount,
        connectionPattern: "radial",
        animationHint: "node-activate",
        sourceMetaphor: "hub and spoke",
      };
    }
    const longGeo = buildDiagramGeometry(
      makeHubSpokeSpec(5),
      LONGFORM_W,
      LONGFORM_H,
      "longform",
    );
    const shortsGeo = buildDiagramGeometry(
      makeHubSpokeSpec(5),
      SHORTS_W,
      SHORTS_H,
      "shorts",
    );
    // Spoke distance from hub should be smaller in shorts
    const longDist = Math.hypot(
      longGeo.nodes[1].cx - longGeo.nodes[0].cx,
      longGeo.nodes[1].cy - longGeo.nodes[0].cy,
    );
    const shortsDist = Math.hypot(
      shortsGeo.nodes[1].cx - shortsGeo.nodes[0].cx,
      shortsGeo.nodes[1].cy - shortsGeo.nodes[0].cy,
    );
    expect(shortsDist).toBeLessThan(longDist);
  });

  it("ladder has tighter horizontal spread in shorts", () => {
    function makeLadderSpec(nodeCount = 4): DiagramSpec {
      return {
        diagramType: "ladder",
        nodeCount,
        connectionPattern: "linear",
        animationHint: "node-activate",
        sourceMetaphor: "ladder steps ascending",
      };
    }
    const longGeo = buildDiagramGeometry(
      makeLadderSpec(4),
      LONGFORM_W,
      LONGFORM_H,
      "longform",
    );
    const shortsGeo = buildDiagramGeometry(
      makeLadderSpec(4),
      SHORTS_W,
      SHORTS_H,
      "shorts",
    );
    // Horizontal spread (right - left) should be tighter in shorts relative to canvas width
    const longSpread = (longGeo.nodes[1].cx - longGeo.nodes[0].cx) / LONGFORM_W;
    const shortsSpread =
      (shortsGeo.nodes[1].cx - shortsGeo.nodes[0].cx) / SHORTS_W;
    expect(Math.abs(shortsSpread)).toBeLessThan(Math.abs(longSpread));
  });

  it("defaults to longform when format is omitted", () => {
    const withFormat = buildDiagramGeometry(
      makeCycleSpec(4),
      LONGFORM_W,
      LONGFORM_H,
      "longform",
    );
    const withoutFormat = buildDiagramGeometry(
      makeCycleSpec(4),
      LONGFORM_W,
      LONGFORM_H,
    );
    expect(withFormat.nodes[0].cx).toEqual(withoutFormat.nodes[0].cx);
    expect(withFormat.nodes[0].cy).toEqual(withoutFormat.nodes[0].cy);
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

  it("ladder metaphor requires 2+ keywords (conservative)", () => {
    // Single keyword: should NOT match
    const single = metaphorToDiagramSpec("a simple ladder");
    expect(single?.diagramType).not.toBe("ladder");

    // Two keywords: should match
    const double = metaphorToDiagramSpec("ladder with alternating steps");
    expect(double).not.toBeNull();
    expect(double!.diagramType).toBe("ladder");
  });

  it("hub-spoke metaphor requires 2+ keywords (conservative)", () => {
    const single = metaphorToDiagramSpec("a central idea");
    expect(single?.diagramType).not.toBe("hub-spoke");

    const double = metaphorToDiagramSpec("hub and spoke connections");
    expect(double).not.toBeNull();
    expect(double!.diagramType).toBe("hub-spoke");
  });

  it("matrix2x2 metaphor maps via regex", () => {
    const spec = metaphorToDiagramSpec("matrix quadrant layout");
    expect(spec).not.toBeNull();
    expect(spec!.diagramType).toBe("matrix2x2");
  });

  it("funnel metaphor requires 2+ keywords (conservative)", () => {
    const single = metaphorToDiagramSpec("a narrow passage");
    expect(single?.diagramType).not.toBe("funnel");

    const double = metaphorToDiagramSpec("funnel with narrowing filter");
    expect(double).not.toBeNull();
    expect(double!.diagramType).toBe("funnel");
  });
});
