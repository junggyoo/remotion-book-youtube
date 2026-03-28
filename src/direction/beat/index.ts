/**
 * Beat semantics barrel — Phase 1 public API.
 */

export {
  splitKoreanSentences,
  gradeBoundary,
  extractEmphasisTargets,
  STRONG_MARKERS,
  MEDIUM_MARKERS,
} from "./koreanTextUtils";
export type { BoundaryStrength } from "./koreanTextUtils";

export { toSemanticRole, toLegacyRole } from "./beatRoleMapping";

export { analyzeNarrationSemantics } from "./BeatSemanticAnalyzer";
export type {
  SemanticUnit,
  SemanticPlan,
  NarrativePattern,
} from "./BeatSemanticAnalyzer";

export { resolveBeatProfile } from "./BeatProfileResolver";
export type { ResolvedBeatProfile } from "./BeatProfileResolver";

export { compileBeatTimeline } from "./BeatTimelineCompiler";

export { generateBeatDebugReport } from "./BeatDebugView";
export type { BeatDebugReport } from "./BeatDebugView";
