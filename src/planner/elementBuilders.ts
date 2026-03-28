// ============================================================
// SceneSynthesizer — VCL Element Builders
// Factory functions that assemble VCLElement[] for synthesized scenes.
// ============================================================

import type { VCLElement, DiagramSpec } from "@/types";
import type { DiagramGeometry, DiagramNode } from "@/planning/diagramGeometry";

// ---------------------------------------------------------------------------
// Radial Elements (SAVERS wheel, cyclic-flow, motif-wheel)
// ---------------------------------------------------------------------------

export interface RadialItem {
  label: string;
  description?: string;
  iconId?: string;
}

/**
 * Builds a radial layout: center node + orbit nodes + cycle-connector edges.
 * Compatible with primitiveRegistry adapters: label, body-text, icon, cycle-connector.
 */
export function buildRadialElements(
  centerLabel: string,
  items: RadialItem[],
): VCLElement[] {
  const elements: VCLElement[] = [
    // Center node
    {
      id: "synth-radial-center",
      type: "label",
      props: {
        text: centerLabel,
        layer: 20,
        variant: "accent",
        tokenRef: "typeScale.headlineM",
      },
    },
  ];

  // Orbit nodes
  items.forEach((item, i) => {
    elements.push({
      id: `synth-radial-node-${i}`,
      type: "label",
      props: {
        text: item.label,
        layer: 30,
        variant: "default",
        tokenRef: "typeScale.bodyL",
        index: i,
      },
    });

    if (item.description) {
      elements.push({
        id: `synth-radial-desc-${i}`,
        type: "body-text",
        props: {
          text: item.description,
          layer: 30,
          tokenRef: "typeScale.bodyS",
          color: "textMuted",
          index: i,
        },
      });
    }

    if (item.iconId) {
      elements.push({
        id: `synth-radial-icon-${i}`,
        type: "icon",
        props: {
          iconId: item.iconId,
          layer: 30,
          index: i,
        },
      });
    }
  });

  // Cycle connectors between consecutive orbit nodes
  for (let i = 0; i < items.length; i++) {
    const nextI = (i + 1) % items.length;
    elements.push({
      id: `synth-radial-conn-${i}-${nextI}`,
      type: "cycle-connector",
      props: {
        connects: {
          fromId: `synth-radial-node-${i}`,
          toId: `synth-radial-node-${nextI}`,
        },
        layer: 25,
        dotted: true,
      },
    });
  }

  return elements;
}

// ---------------------------------------------------------------------------
// Timeline Elements (아침 타임라인, temporal flow)
// ---------------------------------------------------------------------------

export interface TimelineStep {
  label: string;
  time?: string;
  description?: string;
}

/**
 * Builds a horizontal timeline: flow-step nodes + timeline-node connectors.
 * Compatible with primitiveRegistry adapters: flow-step, timeline-node.
 */
export function buildTimelineElements(
  steps: TimelineStep[],
  title?: string,
): VCLElement[] {
  const elements: VCLElement[] = [];

  if (title) {
    elements.push({
      id: "synth-timeline-title",
      type: "headline",
      props: {
        text: title,
        layer: 20,
        tokenRef: "typeScale.headlineS",
        weight: "bold",
        align: "left",
      },
    });
  }

  steps.forEach((step, i) => {
    elements.push({
      id: `synth-timeline-node-${i}`,
      type: "timeline-node",
      props: {
        label: step.time ? `${step.time} ${step.label}` : step.label,
        description: step.description,
        highlighted: i === 0,
        index: i,
        layer: 30,
      },
    });
  });

  // Flow connectors between steps
  for (let i = 0; i < steps.length - 1; i++) {
    elements.push({
      id: `synth-timeline-flow-${i}`,
      type: "flow-step",
      props: {
        stepNumber: i + 1,
        title: steps[i].label,
        detail: steps[i].description,
        layer: 25,
        connects: {
          fromId: `synth-timeline-node-${i}`,
          toId: `synth-timeline-node-${i + 1}`,
        },
      },
    });
  }

  return elements;
}

// ---------------------------------------------------------------------------
// Split Elements (before/after, transformation)
// ---------------------------------------------------------------------------

export interface SplitSide {
  label: string;
  content: string;
  tag?: string;
}

/**
 * Builds a split-two layout: left panel + right panel + divider.
 */
export function buildSplitElements(
  left: SplitSide,
  right: SplitSide,
): VCLElement[] {
  return [
    {
      id: "synth-split-left-label",
      type: "label",
      props: {
        text: left.tag ?? left.label,
        layer: 20,
        variant: "default",
        tokenRef: "typeScale.headlineS",
        panel: "left",
      },
    },
    {
      id: "synth-split-left-body",
      type: "body-text",
      props: {
        text: left.content,
        layer: 20,
        tokenRef: "typeScale.bodyM",
        panel: "left",
      },
    },
    {
      id: "synth-split-divider",
      type: "divider",
      props: {
        orientation: "vertical",
        layer: 25,
      },
    },
    {
      id: "synth-split-right-label",
      type: "label",
      props: {
        text: right.tag ?? right.label,
        layer: 20,
        variant: "accent",
        tokenRef: "typeScale.headlineS",
        panel: "right",
      },
    },
    {
      id: "synth-split-right-body",
      type: "body-text",
      props: {
        text: right.content,
        layer: 20,
        tokenRef: "typeScale.bodyM",
        panel: "right",
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// Emphasis Elements (climax, dramatic)
// ---------------------------------------------------------------------------

/**
 * Builds an emphasis composition: centered headline + body + accent zone.
 */
export function buildEmphasisElements(
  headline: string,
  supportText?: string,
): VCLElement[] {
  const elements: VCLElement[] = [
    {
      id: "synth-emphasis-bg",
      type: "color-block",
      props: {
        colorKey: "surface",
        layer: 0,
      },
    },
    {
      id: "synth-emphasis-headline",
      type: "headline",
      props: {
        text: headline,
        layer: 40,
        tokenRef: "typeScale.headlineL",
        weight: "bold",
        align: "center",
      },
    },
  ];

  if (supportText) {
    elements.push({
      id: "synth-emphasis-support",
      type: "body-text",
      props: {
        text: supportText,
        layer: 30,
        tokenRef: "typeScale.bodyL",
        color: "textMuted",
        align: "center",
      },
    });
  }

  return elements;
}

// ---------------------------------------------------------------------------
// Grid Elements (web, rhizome patterns)
// ---------------------------------------------------------------------------

export interface GridItem {
  label: string;
  description?: string;
}

/**
 * Builds a grid-n layout: items arranged in a grid with optional labels.
 */
export function buildGridElements(
  items: GridItem[],
  gridLabel?: string,
): VCLElement[] {
  const elements: VCLElement[] = [];

  if (gridLabel) {
    elements.push({
      id: "synth-grid-label",
      type: "label",
      props: {
        text: gridLabel,
        layer: 20,
        variant: "accent",
        tokenRef: "typeScale.headlineS",
      },
    });
  }

  items.forEach((item, i) => {
    elements.push({
      id: `synth-grid-item-${i}-title`,
      type: "body-text",
      props: {
        text: item.label,
        layer: 30,
        tokenRef: "typeScale.bodyL",
        weight: "bold",
        index: i,
      },
    });

    if (item.description) {
      elements.push({
        id: `synth-grid-item-${i}-desc`,
        type: "body-text",
        props: {
          text: item.description,
          layer: 30,
          tokenRef: "typeScale.bodyS",
          color: "textMuted",
          index: i,
        },
      });
    }
  });

  return elements;
}

// ---------------------------------------------------------------------------
// Diagram Elements (P2-1d: DiagramSpec + DiagramGeometry → VCLElement[])
// ---------------------------------------------------------------------------

/** Default frames between consecutive animated-path draws */
const PATH_STAGGER_FRAMES = 6;
/** Default frames for each path draw animation */
const PATH_DRAW_DURATION = 30;
/** Default frames between node activations */
const NODE_STAGGER_FRAMES = 6;
/** Delay before paths start in construct mode (nodes appear first) */
const CONSTRUCT_PATH_DELAY = 24;

/**
 * Converts a DiagramSpec + DiagramGeometry into VCLElement[].
 *
 * revealMode mapping:
 * - trace: animated-path connections drawn sequentially, then nodes stagger-activate
 * - construct: nodes activate first (startFrame=0), paths draw after delay
 * - cascade: nodes activate top-to-bottom only, no paths
 *
 * completionBehavior:
 * - hold: elements remain as-is after animation completes
 * - zoom-node: appends a zoom-focus hint targeting the last activated node
 */
export function buildDiagramElements(
  spec: DiagramSpec,
  geometry: DiagramGeometry,
): VCLElement[] {
  const revealMode = spec.revealMode ?? "trace";
  const completionBehavior = spec.completionBehavior ?? "hold";
  const elements: VCLElement[] = [];

  switch (revealMode) {
    case "trace":
      elements.push(...buildTraceElements(geometry));
      break;
    case "construct":
      elements.push(...buildConstructElements(geometry));
      break;
    case "cascade":
      elements.push(...buildCascadeElements(geometry));
      break;
  }

  if (completionBehavior === "zoom-node" && geometry.nodes.length > 0) {
    const lastNode = getLastActivatedNode(geometry, revealMode);
    elements.push({
      id: "synth-diagram-zoom-focus",
      type: "zoom-focus",
      props: {
        targetNodeId: lastNode.id,
        cx: lastNode.cx,
        cy: lastNode.cy,
        layer: 50,
      },
    });
  }

  return elements;
}

/** trace: paths first (sequential draw), then all nodes stagger-activate */
function buildTraceElements(geometry: DiagramGeometry): VCLElement[] {
  const elements: VCLElement[] = [];

  // Animated paths — sequential draw with stagger
  geometry.connections.forEach((conn, i) => {
    elements.push({
      id: `synth-diagram-path-${i}`,
      type: "animated-path",
      props: {
        pathData: conn.pathData,
        startFrame: i * PATH_STAGGER_FRAMES,
        drawDuration: PATH_DRAW_DURATION,
        arrowHead: true,
        layer: 25,
      },
    });
  });

  // Node activation — starts after all paths begin, stagger activation
  const nodeStartFrame =
    geometry.connections.length > 0
      ? (geometry.connections.length - 1) * PATH_STAGGER_FRAMES +
        Math.floor(PATH_DRAW_DURATION * 0.5)
      : 0;

  elements.push(buildNodeActivationElement(geometry.nodes, nodeStartFrame));

  return elements;
}

/** construct: nodes first (startFrame=0), then paths after delay */
function buildConstructElements(geometry: DiagramGeometry): VCLElement[] {
  const elements: VCLElement[] = [];

  // Nodes activate first
  elements.push(buildNodeActivationElement(geometry.nodes, 0));

  // Paths draw after nodes have appeared
  geometry.connections.forEach((conn, i) => {
    elements.push({
      id: `synth-diagram-path-${i}`,
      type: "animated-path",
      props: {
        pathData: conn.pathData,
        startFrame: CONSTRUCT_PATH_DELAY + i * PATH_STAGGER_FRAMES,
        drawDuration: PATH_DRAW_DURATION,
        arrowHead: true,
        layer: 25,
      },
    });
  });

  return elements;
}

/** cascade: nodes only, top-to-bottom activation order, no paths */
function buildCascadeElements(geometry: DiagramGeometry): VCLElement[] {
  // Sort nodes by cy (top-to-bottom)
  const sortedIndices = geometry.nodes
    .map((n, i) => ({ cy: n.cy, index: i }))
    .sort((a, b) => a.cy - b.cy)
    .map((item) => item.index);

  return [
    {
      id: "synth-diagram-nodes",
      type: "node-activation",
      props: {
        nodes: geometry.nodes.map((n) => ({
          id: n.id,
          cx: n.cx,
          cy: n.cy,
          label: n.label,
        })),
        activationOrder: sortedIndices,
        staggerDelay: NODE_STAGGER_FRAMES,
        startFrame: 0,
        layer: 30,
      },
    },
  ];
}

/** Builds a node-activation VCLElement from geometry nodes */
function buildNodeActivationElement(
  nodes: DiagramNode[],
  startFrame: number,
): VCLElement {
  return {
    id: "synth-diagram-nodes",
    type: "node-activation",
    props: {
      nodes: nodes.map((n) => ({
        id: n.id,
        cx: n.cx,
        cy: n.cy,
        label: n.label,
      })),
      activationOrder: nodes.map((_, i) => i),
      staggerDelay: NODE_STAGGER_FRAMES,
      startFrame,
      layer: 30,
    },
  };
}

/** Returns the last node to be activated based on revealMode */
function getLastActivatedNode(
  geometry: DiagramGeometry,
  revealMode: string,
): DiagramNode {
  if (revealMode === "cascade") {
    // cascade: last by cy (bottom-most)
    return [...geometry.nodes].sort((a, b) => b.cy - a.cy)[0];
  }
  // trace/construct: last in array order
  return geometry.nodes[geometry.nodes.length - 1];
}
