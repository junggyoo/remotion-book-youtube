import type {
  SceneBlueprint,
  LayoutType,
  ChoreographyType,
  MediaPlan,
} from "@/types";
import type { SceneSpec } from "@/direction/types";
import type { CompositionContext } from "./types";
import { recipeRegistry } from "./familyRecipes";
import { resolveElements } from "./elementResolver";

/**
 * Compose a SceneBlueprint from a SceneSpec + pipeline context.
 * Returns null if no recipe is registered or elements are empty.
 *
 * Layout/choreography priority:
 *   1. spec explicit value (if interpretationMeta says it was explicitly chosen)
 *   2. recipe default (family-optimal)
 *   3. spec value as final fallback
 */
export function composeBlueprint(
  spec: SceneSpec,
  ctx: CompositionContext,
): SceneBlueprint | null {
  const recipe = recipeRegistry[spec.family];
  if (!recipe) {
    console.warn(
      `[CompositionFactory] No recipe for family "${spec.family}". Returning null.`,
    );
    return null;
  }

  // 1. Resolve elements from content via family recipe
  const elements = resolveElements(spec);
  if (elements.length === 0) {
    console.warn(
      `[CompositionFactory] Recipe "${spec.family}" produced 0 elements for scene "${spec.id}". Content may be insufficient.`,
    );
    return null;
  }

  // 2. Select layout: spec explicit > recipe default
  const specLayoutIsExplicit =
    spec.interpretationMeta?.derivedFrom?.some((d) =>
      d.startsWith("layout:"),
    ) ?? false;
  const layout: LayoutType = specLayoutIsExplicit
    ? spec.layout
    : recipe.defaultLayout;

  // 3. Select choreography: same priority logic
  const specChoreographyIsExplicit =
    spec.interpretationMeta?.derivedFrom?.some((d) =>
      d.startsWith("choreography:"),
    ) ?? false;
  const choreography: ChoreographyType = specChoreographyIsExplicit
    ? spec.choreography
    : recipe.defaultChoreography;

  // 4. Build mediaPlan — narration text only, no TTS vendor hardcoding
  const mediaPlan: MediaPlan = {
    narrationText: spec.narrationText,
    captionPlan: {
      mode: "sentence-by-sentence",
      maxCharsPerLine: 28,
      maxLines: 2,
      leadFrames: 0,
      trailFrames: 3,
      transitionStyle: "fade-slide",
    },
    audioPlan: {
      ttsEngine: "fish-audio-s2",
      voiceKey: "default",
      speed: 1.0,
      pitch: "+0Hz",
    },
    assetPlan: {
      required: [],
      fallbackMode: "text-only",
    },
  };

  // 5. Build SceneBlueprint
  return {
    id: spec.id,
    intent: spec.intent,
    origin: "composed",
    layout,
    elements,
    choreography,
    motionPreset: ctx.motionPreset,
    format: ctx.format,
    theme: ctx.theme,
    from: ctx.from,
    durationFrames: ctx.durationFrames,
    mediaPlan,
  };
}
