import type { MotionPresetKey } from "@/types";
import type { DirectionParams } from "./types";

export interface ResolvedMotionParams {
  enterPreset: MotionPresetKey;
  emphasisPreset: MotionPresetKey;
  holdFrames: number;
  transitionFrames: number;
  staggerDelay: number;
}

const DEFAULT_SCENE_FRAMES = 150;

export function resolveMotionParams(
  base: DirectionParams,
  sceneDurationFrames: number = DEFAULT_SCENE_FRAMES,
  overrides?: Partial<DirectionParams>,
): ResolvedMotionParams {
  const params: DirectionParams = overrides ? { ...base, ...overrides } : base;
  return {
    enterPreset: resolveEnterPreset(params),
    emphasisPreset: resolveEmphasisPreset(params),
    holdFrames: Math.round(sceneDurationFrames * params.holdRatio * 0.3),
    transitionFrames: resolveTransitionFrames(params.transitionTension),
    staggerDelay: resolveStaggerDelay(params.pacing),
  };
}

function resolveEnterPreset(params: DirectionParams): MotionPresetKey {
  const score = params.energy * 0.6 + params.pacing * 0.4;
  if (score < 0.2) return "dramatic";
  if (score < 0.4) return "heavy";
  if (score < 0.55) return "smooth";
  if (score < 0.75) return "snappy";
  return "punchy";
}

function resolveEmphasisPreset(params: DirectionParams): MotionPresetKey {
  if (params.emphasisDensity < 0.3) return "gentle";
  if (params.emphasisDensity < 0.5) return "smooth";
  if (params.emphasisDensity < 0.7) return "snappy";
  return "punchy";
}

function resolveTransitionFrames(tension: number): number {
  return Math.round(24 - tension * 18);
}

function resolveStaggerDelay(pacing: number): number {
  return Math.round(8 - pacing * 6);
}
