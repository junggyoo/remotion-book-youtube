// ============================================================
// BlueprintRenderer — VCL Engine Core (DSGS Spec Section 4-4)
// SceneBlueprint JSON → Remotion React component tree
// Implements node/edge split for connector element handling.
// ============================================================

import React, { useMemo } from "react";
import { AbsoluteFill } from "remotion";
import type {
  SceneBlueprint,
  VCLElement,
  FormatConfig,
  SceneElementLayoutMeta,
} from "@/types";
import { useFormat } from "@/design/themes/useFormat";
import {
  CameraLayer,
  SCENE_CAMERA_DEFAULTS,
} from "@/components/layout/CameraLayer";
import { useLayoutEngine } from "./layouts";
import type { LayoutPosition } from "./layouts";
import { useChoreography } from "./choreography";
import { getPrimitive, SELF_ANIMATED_TYPES } from "./primitiveRegistry";
import { MotionWrapper } from "./MotionWrapper";
import { useBeatTimeline } from "@/hooks/useBeatTimeline";

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
  /** Scene type hint for CameraLayer mode selection (P2-2) */
  sceneType?: import("@/types").SceneType;
  /** Beat array for CameraLayer guided mode (P2-2) */
  beats?: import("@/types").Beat[];
  /** Primary focus element ID for CameraLayer (P2-2) */
  primaryFocusId?: string;
}

export const BlueprintRenderer: React.FC<BlueprintRendererProps> = ({
  blueprint,
  sceneType,
  beats,
  primaryFocusId,
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

  // 3. Build node position lookup by element id (memoized for CameraLayer P2-2)
  const positionById = useMemo(() => {
    const map = new Map<string, LayoutPosition>();
    nodeElements.forEach((el, i) => {
      map.set(el.id, nodePositions[i]);
    });
    return map;
  }, [nodeElements, nodePositions]);

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

  // 6. Beat timeline for element visibility + CameraLayer guided mode (P2-2)
  const { activeBeat, elementStates } = useBeatTimeline(
    beats ?? [],
    blueprint.durationFrames,
    blueprint.motionPreset,
    sceneType ? { sceneType, format: blueprint.format } : undefined,
  );

  // 6b. Build beat-driven timing overrides: map beat.activates keys → element IDs
  const beatTimingOverrides = useMemo(() => {
    const overrides = new Map<
      string,
      { delayFrames: number; durationFrames: number }
    >();
    if (!beats || beats.length === 0) return overrides;

    // Collect all activate keys → beat start/end mapping
    const activateKeyToBeat = new Map<
      string,
      { startRatio: number; endRatio: number }
    >();
    for (const beat of beats) {
      for (const key of beat.activates) {
        if (key === "*") continue;
        if (!activateKeyToBeat.has(key)) {
          activateKeyToBeat.set(key, {
            startRatio: beat.startRatio,
            endRatio: beat.endRatio,
          });
        }
      }
    }

    // Match element IDs to beat activate keys
    for (const el of blueprint.elements) {
      // Direct ID match
      if (activateKeyToBeat.has(el.id)) {
        const b = activateKeyToBeat.get(el.id)!;
        overrides.set(el.id, {
          delayFrames: Math.round(blueprint.durationFrames * b.startRatio),
          durationFrames: Math.round(
            blueprint.durationFrames * (b.endRatio - b.startRatio),
          ),
        });
        continue;
      }
      // Match by props.role (e.g. "headline" matches beat key "headline")
      const role = el.props.role as string | undefined;
      if (role && activateKeyToBeat.has(role)) {
        const b = activateKeyToBeat.get(role)!;
        overrides.set(el.id, {
          delayFrames: Math.round(blueprint.durationFrames * b.startRatio),
          durationFrames: Math.round(
            blueprint.durationFrames * (b.endRatio - b.startRatio),
          ),
        });
        continue;
      }
      // Match by index pattern: "item-0" → element with props.index === 0
      const elIndex = el.props.index as number | undefined;
      if (elIndex != null) {
        const indexKey = `item-${elIndex}`;
        const stepKey = `step-${elIndex}`;
        if (activateKeyToBeat.has(indexKey)) {
          const b = activateKeyToBeat.get(indexKey)!;
          overrides.set(el.id, {
            delayFrames: Math.round(blueprint.durationFrames * b.startRatio),
            durationFrames: Math.round(
              blueprint.durationFrames * (b.endRatio - b.startRatio),
            ),
          });
        } else if (activateKeyToBeat.has(stepKey)) {
          const b = activateKeyToBeat.get(stepKey)!;
          overrides.set(el.id, {
            delayFrames: Math.round(blueprint.durationFrames * b.startRatio),
            durationFrames: Math.round(
              blueprint.durationFrames * (b.endRatio - b.startRatio),
            ),
          });
        }
      }
    }

    return overrides;
  }, [beats, blueprint.elements, blueprint.durationFrames]);

  // 7. Compute layout meta for CameraLayer guided mode (P2-2)
  const layoutMeta: SceneElementLayoutMeta[] = useMemo(() => {
    const meta: SceneElementLayoutMeta[] = [];
    const canvasW = formatConfig.width;
    const canvasH = formatConfig.height;
    if (canvasW === 0 || canvasH === 0) return meta;

    positionById.forEach((pos, elementId) => {
      meta.push({
        elementId,
        anchorX: (pos.left + pos.width / 2) / canvasW,
        anchorY: (pos.top + pos.height / 2) / canvasH,
        widthRatio: pos.width / canvasW,
        heightRatio: pos.height / canvasH,
      });
    });
    return meta;
  }, [positionById, formatConfig.width, formatConfig.height]);

  // 7. Determine camera mode from scene type (P2-2)
  const cameraMode = sceneType ? SCENE_CAMERA_DEFAULTS[sceneType] : "static";

  // 8. Render
  return (
    <AbsoluteFill style={{ backgroundColor: blueprint.theme.bg }}>
      <CameraLayer
        mode={cameraMode}
        format={blueprint.format}
        layoutMeta={layoutMeta}
        primaryFocusId={primaryFocusId}
        sceneType={sceneType}
        activeBeat={activeBeat}
        durationFrames={blueprint.durationFrames}
      >
        {blueprint.elements.map((el, originalIndex) => {
          const adapter = getPrimitive(el.type);
          if (!adapter) {
            console.warn(
              `[BlueprintRenderer] Unknown element type "${el.type}", skipping.`,
            );
            return null;
          }

          const choreographyTiming = allTimings[originalIndex];
          if (!choreographyTiming) return null;

          // Beat-driven timing override: if beats mapped this element, use beat timing
          const timing = beatTimingOverrides.has(el.id)
            ? beatTimingOverrides.get(el.id)!
            : choreographyTiming;

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
      </CameraLayer>
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
