import type { VCLElement, MotionPresetKey } from "@/types";
import { resolvePreset } from "@/design/tokens/motion";
import motionPresetsData from "@/design/tokens/motion-presets.json";
import type { ChoreographyFunction, ChoreographyTiming } from "./types";

export const staggerClockwise: ChoreographyFunction = (
  elements: VCLElement[],
  totalDuration: number,
  preset: MotionPresetKey,
  _config?: Record<string, unknown>,
): ChoreographyTiming[] => {
  if (elements.length === 0) return [];

  const resolved = resolvePreset(preset);
  const elementDuration = resolved.durationRange[1];
  const baseStagger = motionPresetsData.defaults.staggerFrames * 2;

  // Identify center element: index 0 or element with props.role === 'center'
  const centerIndex = elements.findIndex((el) => el.props.role === "center");
  const effectiveCenterIndex = centerIndex !== -1 ? centerIndex : 0;

  // Separate center, edge elements (those with props.connects), and node elements
  const centerEl = elements[effectiveCenterIndex];
  const edgeElements = elements.filter(
    (el, i) => i !== effectiveCenterIndex && el.props.connects !== undefined,
  );
  const nodeElements = elements.filter(
    (el, i) => i !== effectiveCenterIndex && el.props.connects === undefined,
  );

  // Build a map of node id -> clockwise index for edge timing
  const nodeDelayMap = new Map<string, number>();
  const timings: ChoreographyTiming[] = new Array(elements.length);

  // Center reveals first at delay 0
  timings[effectiveCenterIndex] = {
    delayFrames: 0,
    durationFrames: elementDuration,
  };

  // Node elements reveal clockwise after center
  const totalNodeStagger =
    baseStagger * (nodeElements.length - 1) + elementDuration;
  const adjustedNodeStagger =
    totalNodeStagger > totalDuration && nodeElements.length > 1
      ? Math.max(
          1,
          Math.floor(
            (totalDuration - elementDuration) / (nodeElements.length - 1),
          ),
        )
      : baseStagger;

  nodeElements.forEach((el, nodeIdx) => {
    const delay = baseStagger + nodeIdx * adjustedNodeStagger;
    const originalIndex = elements.indexOf(el);
    timings[originalIndex] = {
      delayFrames: delay,
      durationFrames: elementDuration,
    };
    nodeDelayMap.set(el.id, delay);
  });

  // Edge elements appear with their target node (toId)
  edgeElements.forEach((el) => {
    const connects = el.props.connects as
      | { toId?: string; fromId?: string }
      | undefined;
    const targetId = connects?.toId ?? connects?.fromId;
    const targetDelay =
      targetId !== undefined ? (nodeDelayMap.get(targetId) ?? 0) : 0;
    const originalIndex = elements.indexOf(el);
    timings[originalIndex] = {
      delayFrames: targetDelay,
      durationFrames: elementDuration,
    };
  });

  return timings;
};

export default staggerClockwise;
