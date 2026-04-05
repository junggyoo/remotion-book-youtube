// ============================================================
// VCL Layout Engine — flowchart
// Nodes positioned along a horizontal flow with connector spaces.
// For process flows, decision trees, sequential steps.
// ============================================================

import type { VCLElement, FormatConfig } from "@/types";
import type { LayoutFunction, LayoutPosition } from "./types";

interface FlowchartConfig {
  /** Ratio of element width to connector width. Default: 3 (element 3x wider than connector) */
  elementToConnectorRatio?: number;
}

export const flowchart: LayoutFunction = (
  elements: VCLElement[],
  formatConfig: FormatConfig,
  config?: Record<string, unknown>,
): LayoutPosition[] => {
  const { elementToConnectorRatio = 3 } = (config ?? {}) as FlowchartConfig;

  const { width, height, safeArea } = formatConfig;
  const safeLeft = safeArea.outerMarginX;
  const safeTop = safeArea.outerMarginY;
  const safeWidth = width - safeArea.outerMarginX * 2;
  const safeHeight = height - safeArea.outerMarginY * 2;

  const count = elements.length;
  if (count === 0) return [];

  // Separate node elements from edge/connector elements
  const isEdge = (el: VCLElement) =>
    el.type === "connector" ||
    el.type === "edge" ||
    el.props.role === "connector";

  const nodeIndices: number[] = [];
  const edgeIndices: number[] = [];
  elements.forEach((el, i) => {
    if (isEdge(el)) {
      edgeIndices.push(i);
    } else {
      nodeIndices.push(i);
    }
  });

  const nodeCount = nodeIndices.length;
  const edgeCount = edgeIndices.length;

  if (nodeCount === 0)
    return elements.map(() => ({ left: 0, top: 0, width: 0, height: 0 }));

  // Calculate widths
  const connectorWidth =
    edgeCount > 0
      ? safeWidth / (nodeCount * elementToConnectorRatio + edgeCount)
      : 0;
  const nodeWidth =
    connectorWidth * elementToConnectorRatio || safeWidth / nodeCount;
  const nodeHeight = safeHeight * 0.4;
  const connectorHeight = safeHeight * 0.08;

  const centerY = safeTop + safeHeight / 2;

  const positions: LayoutPosition[] = new Array(count);

  // Interleave: node, edge, node, edge, node...
  let currentX = safeLeft;
  let nodeIdx = 0;
  let edgeIdx = 0;

  for (let i = 0; i < count; i++) {
    if (nodeIndices.includes(i)) {
      positions[i] = {
        left: currentX,
        top: centerY - nodeHeight / 2,
        width: nodeWidth,
        height: nodeHeight,
      };
      currentX += nodeWidth;
      nodeIdx++;
    } else {
      positions[i] = {
        left: currentX,
        top: centerY - connectorHeight / 2,
        width: connectorWidth,
        height: connectorHeight,
      };
      currentX += connectorWidth;
      edgeIdx++;
    }
  }

  return positions;
};
