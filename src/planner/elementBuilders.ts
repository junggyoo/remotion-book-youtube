// ============================================================
// SceneSynthesizer — VCL Element Builders
// Factory functions that assemble VCLElement[] for synthesized scenes.
// ============================================================

import type { VCLElement } from "@/types";

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
