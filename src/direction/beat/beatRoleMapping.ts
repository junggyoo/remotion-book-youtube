/**
 * Bidirectional mapping between legacy BeatRole and direction (semantic) BeatRole.
 */
import type { BeatRole as LegacyBeatRole } from "@/types";
import type { BeatRole as DirectionBeatRole } from "@/direction/types";

const LEGACY_TO_SEMANTIC: Record<string, DirectionBeatRole> = {
  hook: "anchor",
  headline: "anchor",
  support: "evidence",
  evidence: "evidence",
  reveal: "reveal",
  compare: "contrast",
  transition: "bridge",
  recap: "reflection",
};

const SEMANTIC_TO_LEGACY: Record<string, LegacyBeatRole> = {
  anchor: "headline",
  evidence: "evidence",
  reveal: "reveal",
  contrast: "compare",
  escalation: "hook",
  reflection: "support",
  bridge: "transition",
};

/** Convert a legacy BeatRole to the direction semantic BeatRole. Unknown roles pass through as-is. */
export function toSemanticRole(legacyRole: LegacyBeatRole): DirectionBeatRole {
  return LEGACY_TO_SEMANTIC[legacyRole] ?? (legacyRole as DirectionBeatRole);
}

/** Convert a direction semantic BeatRole to a legacy BeatRole. Unknown roles pass through as-is. */
export function toLegacyRole(semanticRole: DirectionBeatRole): LegacyBeatRole {
  return SEMANTIC_TO_LEGACY[semanticRole] ?? (semanticRole as LegacyBeatRole);
}
