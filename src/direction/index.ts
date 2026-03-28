export type {
  SceneFamily,
  DirectionProfileName,
  DirectionParams,
  DirectionProfile,
  CompositionPath,
  SceneSpec,
  BeatProfile,
  BeatSegment,
  GapCandidate,
  ElementSpec,
  TransitionSpec,
  BeatRole,
} from "./types";

export { DIRECTION_PROFILES, getDirectionProfile } from "./profiles";
export {
  resolveDirectionFromFingerprint,
  resolveSceneFamily,
} from "./interpretationBootstrap";
export { adaptPresetToSceneSpec } from "./presetAdapter";
export { resolveMotionParams } from "./directionResolver";
export type { ResolvedMotionParams } from "./directionResolver";

// Beat semantics (Phase 1)
export {
  analyzeNarrationSemantics,
  resolveBeatProfile,
  compileBeatTimeline,
  generateBeatDebugReport,
  toSemanticRole,
  toLegacyRole,
} from "./beat";
export type {
  SemanticUnit,
  SemanticPlan,
  NarrativePattern,
  ResolvedBeatProfile,
  BeatDebugReport,
} from "./beat";
