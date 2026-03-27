// ============================================================
// BlueprintRenderer — VCL Engine Core (DSGS Spec Section 4-4)
// SceneBlueprint JSON → Remotion React component tree
// Implements node/edge split for connector element handling.
// ============================================================

import React from "react";
import { AbsoluteFill } from "remotion";
import type { SceneBlueprint, VCLElement, FormatConfig } from "@/types";
import { useFormat } from "@/design/themes/useFormat";
import { useLayoutEngine } from "./layouts";
import type { LayoutPosition } from "./layouts";
import { useChoreography } from "./choreography";
import { getPrimitive, SELF_ANIMATED_TYPES } from "./primitiveRegistry";
import { MotionWrapper } from "./MotionWrapper";

// --- Node/Edge classification ---

interface ConnectsProps {
  fromId: string;
  toId: string;
}

function isEdgeElement(el: VCLElement): boolean {
  return el.props.connects != null && typeof el.props.connects === "object";
}

function getConnects(el: VCLElement): ConnectsProps | null {
  if (!isEdgeElement(el)) return null;
  const c = el.props.connects as Record<string, unknown>;
  return {
    fromId: (c.fromId as string) ?? "",
    toId: (c.toId as string) ?? "",
  };
}

// --- BlueprintRenderer ---

interface BlueprintRendererProps {
  blueprint: SceneBlueprint;
}

export const BlueprintRenderer: React.FC<BlueprintRendererProps> = ({
  blueprint,
}) => {
  const formatConfig: FormatConfig = useFormat(blueprint.format);

  // 1. Classify elements into nodes and edges
  const nodeElements: VCLElement[] = [];
  const edgeElements: VCLElement[] = [];
  const nodeIndexMap: Map<number, number> = new Map(); // original index → node index

  blueprint.elements.forEach((el, i) => {
    if (isEdgeElement(el)) {
      edgeElements.push(el);
    } else {
      nodeIndexMap.set(i, nodeElements.length);
      nodeElements.push(el);
    }
  });

  // 2. Layout Engine: compute positions for node elements only
  const layoutEngine = useLayoutEngine(
    blueprint.layout,
    blueprint.layoutConfig,
    blueprint.choreography,
  );
  const nodePositions: LayoutPosition[] = layoutEngine.resolve(
    nodeElements,
    formatConfig,
  );

  // 3. Build node position lookup by element id (for edge resolution)
  const positionById: Map<string, LayoutPosition> = new Map();
  nodeElements.forEach((el, i) => {
    positionById.set(el.id, nodePositions[i]);
  });

  // 4. Choreography: compute timings for ALL elements (nodes + edges)
  const choreographyEngine = useChoreography(
    blueprint.choreography,
    blueprint.motionPreset,
  );
  const allTimings = choreographyEngine.plan(
    blueprint.elements,
    blueprint.durationFrames,
  );

  // 5. Post-layout edge resolution: compute center/radius from node positions
  const radialCenter = computeRadialCenter(nodePositions);

  // 6. Render
  return (
    <AbsoluteFill style={{ backgroundColor: blueprint.theme.bg }}>
      {blueprint.elements.map((el, originalIndex) => {
        const adapter = getPrimitive(el.type);
        if (!adapter) {
          console.warn(
            `[BlueprintRenderer] Unknown element type "${el.type}", skipping.`,
          );
          return null;
        }

        const timing = allTimings[originalIndex];
        if (!timing) return null;

        if (isEdgeElement(el)) {
          // Edge element: resolve fromPos/toPos from positioned nodes
          const connects = getConnects(el);
          if (!connects) return null;

          const fromPos = positionById.get(connects.fromId);
          const toPos = positionById.get(connects.toId);
          if (!fromPos || !toPos) {
            console.warn(
              `[BlueprintRenderer] Edge "${el.id}" references unknown node(s): ` +
                `fromId="${connects.fromId}", toId="${connects.toId}"`,
            );
            return null;
          }

          const isSelfAnimatedEdge =
            SELF_ANIMATED_TYPES.has(el.type) ||
            (el.type === "text" && el.props.role === "headline");

          return (
            <MotionWrapper
              key={el.id}
              timing={timing}
              preset={blueprint.motionPreset}
              selfAnimated={isSelfAnimatedEdge}
            >
              {React.createElement(adapter, {
                ...el.props,
                fromPos,
                toPos,
                centerX: radialCenter.x,
                centerY: radialCenter.y,
                radius: radialCenter.radius,
                style: {
                  position: "absolute" as const,
                  top: 0,
                  left: 0,
                  width: formatConfig.width,
                  height: formatConfig.height,
                },
                format: blueprint.format,
                theme: blueprint.theme,
              })}
            </MotionWrapper>
          );
        } else {
          // Node element: use layout position
          const nodeIdx = nodeIndexMap.get(originalIndex);
          if (nodeIdx == null) return null;
          const position = nodePositions[nodeIdx];

          const isSelfAnimated =
            SELF_ANIMATED_TYPES.has(el.type) ||
            (el.type === "text" && el.props.role === "headline");

          return (
            <MotionWrapper
              key={el.id}
              timing={timing}
              preset={blueprint.motionPreset}
              selfAnimated={isSelfAnimated}
            >
              {React.createElement(adapter, {
                ...el.props,
                style: {
                  left: position.left,
                  top: position.top,
                  width: position.width,
                  height: position.height,
                },
                format: blueprint.format,
                theme: blueprint.theme,
              })}
            </MotionWrapper>
          );
        }
      })}
    </AbsoluteFill>
  );
};

// --- Helpers ---

interface RadialCenterInfo {
  x: number;
  y: number;
  radius: number;
}

/**
 * Compute radial center and radius from node positions.
 * Uses the average of all positions as center, and distance from center
 * to the first non-center node as radius.
 */
function computeRadialCenter(positions: LayoutPosition[]): RadialCenterInfo {
  if (positions.length === 0) {
    return { x: 960, y: 540, radius: 200 };
  }

  // Assume first position is the center element
  const center = positions[0];
  const cx = center.left + center.width / 2;
  const cy = center.top + center.height / 2;

  if (positions.length < 2) {
    return { x: cx, y: cy, radius: 200 };
  }

  // Compute radius from center to first radial node
  const radialNode = positions[1];
  const rx = radialNode.left + radialNode.width / 2;
  const ry = radialNode.top + radialNode.height / 2;
  const radius = Math.sqrt((rx - cx) ** 2 + (ry - cy) ** 2);

  return { x: cx, y: cy, radius };
}

export default BlueprintRenderer;
