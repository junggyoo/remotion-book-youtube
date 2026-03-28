import { buildDiagramElements } from "../elementBuilders";
import { buildDiagramGeometry } from "@/planning/diagramGeometry";
import type { DiagramSpec } from "@/types";
import type { DiagramGeometry } from "@/planning/diagramGeometry";

// ============================================================
// Helpers
// ============================================================

const LONGFORM_W = 1920;
const LONGFORM_H = 1080;

function makeCycleSpec(nodeCount: number): DiagramSpec {
  return {
    diagramType: "cycle",
    nodeCount,
    connectionPattern: "cyclic",
    animationHint: "path-draw",
    layoutHint: "circular",
    sourceMetaphor: "circular cycle test",
    revealMode: "trace",
    completionBehavior: "hold",
  };
}

function makeFlowSpec(nodeCount: number): DiagramSpec {
  return {
    diagramType: "flow",
    nodeCount,
    connectionPattern: "linear",
    animationHint: "fill-progress",
    layoutHint: "horizontal-split",
    sourceMetaphor: "flow test",
    revealMode: "construct",
    completionBehavior: "hold",
  };
}

function makePyramidSpec(nodeCount: number): DiagramSpec {
  return {
    diagramType: "pyramid",
    nodeCount,
    connectionPattern: "layered",
    animationHint: "node-activate",
    layoutHint: "vertical-stack",
    sourceMetaphor: "pyramid test",
    revealMode: "cascade",
    completionBehavior: "zoom-node",
  };
}

function getElementTypes(elements: { type: string }[]): string[] {
  return elements.map((e) => e.type);
}

// ============================================================
// Tests
// ============================================================

describe("buildDiagramElements", () => {
  describe("trace revealMode (cycle)", () => {
    let elements: ReturnType<typeof buildDiagramElements>;
    let geometry: DiagramGeometry;
    const spec = makeCycleSpec(4);

    beforeAll(() => {
      geometry = buildDiagramGeometry(spec, LONGFORM_W, LONGFORM_H);
      elements = buildDiagramElements(spec, geometry);
    });

    it("produces animated-path elements for each connection", () => {
      const paths = elements.filter((e) => e.type === "animated-path");
      expect(paths.length).toBe(geometry.connections.length);
    });

    it("animated-path elements have sequential startFrame", () => {
      const paths = elements.filter((e) => e.type === "animated-path");
      for (let i = 1; i < paths.length; i++) {
        const prev = paths[i - 1].props.startFrame as number;
        const curr = paths[i].props.startFrame as number;
        expect(curr).toBeGreaterThan(prev);
      }
    });

    it("includes node-activation element", () => {
      const nodes = elements.filter((e) => e.type === "node-activation");
      expect(nodes.length).toBe(1);
    });

    it("node-activation has correct activation order", () => {
      const nodeEl = elements.find((e) => e.type === "node-activation")!;
      const order = nodeEl.props.activationOrder as number[];
      expect(order).toEqual([0, 1, 2, 3]);
    });

    it("does not include zoom-focus for hold completionBehavior", () => {
      const zoom = elements.filter((e) => e.type === "zoom-focus");
      expect(zoom.length).toBe(0);
    });

    it("contains both animated-path and node-activation types", () => {
      const types = new Set(getElementTypes(elements));
      expect(types.has("animated-path")).toBe(true);
      expect(types.has("node-activation")).toBe(true);
    });
  });

  describe("construct revealMode (flow)", () => {
    let elements: ReturnType<typeof buildDiagramElements>;
    let geometry: DiagramGeometry;
    const spec = makeFlowSpec(4);

    beforeAll(() => {
      geometry = buildDiagramGeometry(spec, LONGFORM_W, LONGFORM_H);
      elements = buildDiagramElements(spec, geometry);
    });

    it("node-activation startFrame is 0 (nodes first)", () => {
      const nodeEl = elements.find((e) => e.type === "node-activation")!;
      expect(nodeEl.props.startFrame).toBe(0);
    });

    it("animated-path startFrame > node-activation startFrame", () => {
      const nodeEl = elements.find((e) => e.type === "node-activation")!;
      const paths = elements.filter((e) => e.type === "animated-path");
      const nodeStart = nodeEl.props.startFrame as number;
      for (const p of paths) {
        expect(p.props.startFrame as number).toBeGreaterThan(nodeStart);
      }
    });

    it("produces correct number of path elements", () => {
      const paths = elements.filter((e) => e.type === "animated-path");
      expect(paths.length).toBe(geometry.connections.length);
    });
  });

  describe("cascade revealMode (pyramid)", () => {
    let elements: ReturnType<typeof buildDiagramElements>;
    let geometry: DiagramGeometry;
    const spec = makePyramidSpec(4);

    beforeAll(() => {
      geometry = buildDiagramGeometry(spec, LONGFORM_W, LONGFORM_H);
      elements = buildDiagramElements(spec, geometry);
    });

    it("produces no animated-path elements", () => {
      const paths = elements.filter((e) => e.type === "animated-path");
      expect(paths.length).toBe(0);
    });

    it("produces node-activation element", () => {
      const nodes = elements.filter((e) => e.type === "node-activation");
      expect(nodes.length).toBe(1);
    });

    it("activation order is top-to-bottom (sorted by cy)", () => {
      const nodeEl = elements.find((e) => e.type === "node-activation")!;
      const order = nodeEl.props.activationOrder as number[];
      const nodes = nodeEl.props.nodes as { cy: number }[];

      // Verify: each successive index has higher cy
      for (let i = 1; i < order.length; i++) {
        expect(nodes[order[i]].cy).toBeGreaterThanOrEqual(
          nodes[order[i - 1]].cy,
        );
      }
    });

    it("includes zoom-focus for zoom-node completionBehavior", () => {
      const zoom = elements.filter((e) => e.type === "zoom-focus");
      expect(zoom.length).toBe(1);
    });

    it("zoom-focus targets the last activated node (bottom-most)", () => {
      const zoom = elements.find((e) => e.type === "zoom-focus")!;
      const targetId = zoom.props.targetNodeId as string;
      // Bottom-most node in pyramid
      const bottomNode = [...geometry.nodes].sort((a, b) => b.cy - a.cy)[0];
      expect(targetId).toBe(bottomNode.id);
    });
  });

  describe("completionBehavior zoom-node", () => {
    it("zoom-focus element is last in array", () => {
      const spec = makePyramidSpec(3);
      const geometry = buildDiagramGeometry(spec, LONGFORM_W, LONGFORM_H);
      const elements = buildDiagramElements(spec, geometry);
      const last = elements[elements.length - 1];
      expect(last.type).toBe("zoom-focus");
    });
  });

  describe("edge cases", () => {
    it("handles geometry with no connections gracefully", () => {
      const spec: DiagramSpec = {
        diagramType: "split",
        nodeCount: 2,
        connectionPattern: "linear",
        animationHint: "split-reveal",
        sourceMetaphor: "test split",
        revealMode: "trace",
        completionBehavior: "hold",
      };
      const geometry = buildDiagramGeometry(spec, LONGFORM_W, LONGFORM_H);
      const elements = buildDiagramElements(spec, geometry);
      // Should still produce node-activation
      expect(elements.some((e) => e.type === "node-activation")).toBe(true);
    });

    it("defaults to trace when revealMode is undefined", () => {
      const spec: DiagramSpec = {
        diagramType: "cycle",
        nodeCount: 3,
        connectionPattern: "cyclic",
        animationHint: "path-draw",
        sourceMetaphor: "default test",
        // revealMode intentionally omitted
      };
      const geometry = buildDiagramGeometry(spec, LONGFORM_W, LONGFORM_H);
      const elements = buildDiagramElements(spec, geometry);
      // trace mode: should have animated-path
      expect(elements.some((e) => e.type === "animated-path")).toBe(true);
    });
  });
});
