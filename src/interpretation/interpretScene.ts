import type { InterpretationResult, InterpretationContext } from "./types";
import type { SceneFamily } from "@/direction/types";
import { scoreFamilies } from "./familyScorer";
import { tuneDirection } from "./directionTuner";
import { adviseLayout } from "./layoutAdvisor";
import { resolveSceneFamily } from "@/direction/interpretationBootstrap";

const FALLBACK_CONFIDENCE_THRESHOLD = 0.3;

/**
 * Interpret a scene: select family, tune direction, advise layout/choreography.
 * Falls back to bootstrap if confidence is too low.
 */
export function interpretScene(
  sceneType: string,
  content: Record<string, unknown>,
  context: InterpretationContext,
): InterpretationResult {
  // 1. Score families
  const { top, alternatives } = scoreFamilies({
    sceneType,
    segment: context.segment,
    artDirection: context.artDirection,
    usedFamilies: context.usedFamilies,
    bookStructure: context.bookStructure,
  });

  // 2. Fallback check
  let family: SceneFamily;
  let familyConfidence: number;
  let whyThisFamily: string;

  if (top.score >= FALLBACK_CONFIDENCE_THRESHOLD) {
    family = top.family;
    familyConfidence = top.score;
    whyThisFamily = top.reason;
  } else {
    // Fallback to bootstrap
    family = resolveSceneFamily(sceneType, context.bookStructure);
    familyConfidence = top.score;
    whyThisFamily = `fallback to bootstrap: top score ${top.score.toFixed(2)} < ${FALLBACK_CONFIDENCE_THRESHOLD} threshold`;
  }

  // 3. Tune direction
  const { overrides, appliedDeltas } = tuneDirection({
    segment: context.segment,
    artDirection: context.artDirection,
  });

  // 4. Advise layout/choreography
  const advice = adviseLayout({
    family,
    artDirection: context.artDirection,
    segment: context.segment,
  });

  // 5. Assemble result
  return {
    family,
    familyConfidence,
    directionOverrides:
      Object.keys(overrides).length > 0 ? overrides : undefined,
    layoutHint: advice.layoutHint,
    choreographyHint: advice.choreographyHint,
    trace: {
      derivedFrom: [
        `sceneType:${sceneType}`,
        ...(context.segment ? [`segment:${context.segment.role}`] : []),
        ...(context.artDirection?.layoutBias
          ? [`artDirection:${context.artDirection.layoutBias}`]
          : []),
        ...advice.sources.map((s) => `advisor:${s}`),
      ],
      whyThisFamily,
      whyThisDirection:
        appliedDeltas.length > 0 ? appliedDeltas.join("; ") : undefined,
      alternativeChoices: alternatives.map((a) => ({
        family: a.family,
        score: a.score,
        shortReason: a.reason,
      })),
      appliedDeltas: appliedDeltas.length > 0 ? appliedDeltas : undefined,
      hintSources: advice.sources.length > 0 ? advice.sources : undefined,
    },
  };
}
