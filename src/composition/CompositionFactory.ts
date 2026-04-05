import type {
  SceneBlueprint,
  LayoutType,
  ChoreographyType,
  VCLElement,
  MediaPlan,
} from "@/types";
import type { SceneSpec } from "@/direction/types";
import type { CompositionContext } from "./types";
import type { SceneRegistry } from "@/registry/SceneRegistry";
import type { RegistryEntry, ElementTemplate } from "@/registry/types";
import type { FamilyRecipe } from "./types";
import { recipeRegistry } from "./familyRecipes";
import { resolveElements } from "./elementResolver";
import { layoutRegistry } from "@/renderer/layouts";

/**
 * Build VCLElements from a RegistryEntry's elementTemplate + scene content.
 * D9: v1 uses simple text-oriented substitution only.
 */
function resolveElementsFromRegistry(
  entry: RegistryEntry,
  sceneId: string,
  content: Record<string, unknown>,
): VCLElement[] {
  return entry.recipe.elementTemplate.map((tmpl: ElementTemplate) => {
    const props: Record<string, unknown> = { ...tmpl.props, layer: tmpl.layer };

    // D9: simple text substitution — if content has a value for the activation key, set props.text
    if (
      tmpl.beatActivationKey &&
      content[tmpl.beatActivationKey] !== undefined
    ) {
      const val = content[tmpl.beatActivationKey];
      if (typeof val === "string") {
        props.text = val;
      }
    }

    return {
      id: `${sceneId}::${tmpl.id}`,
      type: tmpl.type as VCLElement["type"],
      props,
    };
  });
}

/**
 * Select the best layout from a recipe's alternatives based on content structure.
 * Returns the default layout if no alternative is a better fit.
 *
 * Heuristics:
 *   - 4 items exactly + matrix-2x2 available → matrix-2x2
 *   - hierarchical/ordered items + pyramid available → pyramid
 *   - sequential steps/process + flowchart available → flowchart
 *   - layered/stacked items + stacked-layers available → stacked-layers
 *   - otherwise → defaultLayout
 */
function selectLayoutFromAlternatives(
  recipe: FamilyRecipe,
  content: Record<string, unknown>,
): LayoutType {
  const alts = recipe.alternativeLayouts;
  if (!alts || alts.length === 0) return recipe.defaultLayout;

  const items = content.items as unknown[] | undefined;
  const steps = content.steps as unknown[] | undefined;
  const data = content.data as unknown[] | undefined;
  const itemCount = items?.length ?? steps?.length ?? data?.length ?? 0;

  // 4 items exactly → matrix-2x2 (perfect quadrant fit)
  if (itemCount === 4 && alts.includes("matrix-2x2")) {
    return "matrix-2x2";
  }

  // Sequential steps/process content → flowchart
  if (
    (steps || content.process || content.flow) &&
    alts.includes("flowchart")
  ) {
    return "flowchart";
  }

  // Hierarchical/priority content → pyramid
  if (
    (content.hierarchy || content.priority || content.levels) &&
    alts.includes("pyramid")
  ) {
    return "pyramid";
  }

  // 3+ layers/items with layering semantics → stacked-layers
  if (
    itemCount >= 3 &&
    (content.layers || content.stack) &&
    alts.includes("stacked-layers")
  ) {
    return "stacked-layers";
  }

  // Data array present → comparison-bar (bar chart visualization)
  if (data && data.length > 0 && alts.includes("comparison-bar")) {
    return "comparison-bar";
  }

  // 5+ items → scattered-cards (organic spread for many items)
  if (itemCount >= 5 && alts.includes("scattered-cards")) {
    return "scattered-cards";
  }

  // Cyclic/loop content → orbit (circular arrangement)
  if (
    (content.cycle || content.loop || content.circular) &&
    alts.includes("orbit")
  ) {
    return "orbit";
  }

  return recipe.defaultLayout;
}

/**
 * Compose a SceneBlueprint from a SceneSpec + pipeline context.
 * Returns null if no recipe is registered or elements are empty.
 *
 * Recipe lookup priority (D3: bridge/coexistence + auto-substitution):
 *   1. SceneRegistry promoted recipe (auto-substitution — learned from 3+ books)
 *   2. Hardcoded recipeRegistry (family recipes)
 *   3. SceneRegistry non-promoted fallback (if no hardcoded recipe)
 *
 * Layout/choreography priority:
 *   1. spec explicit value (if interpretationMeta says it was explicitly chosen)
 *   2. recipe default (family-optimal)
 *   3. spec value as final fallback
 */
export function composeBlueprint(
  spec: SceneSpec,
  ctx: CompositionContext,
  registry?: SceneRegistry,
): SceneBlueprint | null {
  // Phase 1: Check for promoted registry recipe (auto-substitution)
  if (registry) {
    const promotedEntry = registry.getBestRecipe(spec.family);
    if (promotedEntry && promotedEntry.lifecycleStatus === "promoted") {
      return composeBlueprintFromRegistry(promotedEntry, spec, ctx);
    }
  }

  // Phase 2: Hardcoded recipe path
  const recipe = recipeRegistry[spec.family];

  // Phase 3: If no hardcoded recipe, try SceneRegistry fallback (non-promoted)
  if (!recipe) {
    if (registry) {
      const registryEntry = registry.getBestRecipe(spec.family);
      if (registryEntry) {
        return composeBlueprintFromRegistry(registryEntry, spec, ctx);
      }
    }
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

  // 2. Select layout: spec explicit > content-aware alternative > recipe default
  const specLayoutIsExplicit =
    spec.interpretationMeta?.derivedFrom?.some((d) =>
      d.startsWith("layout:"),
    ) ?? false;
  const layout: LayoutType = specLayoutIsExplicit
    ? spec.layout
    : selectLayoutFromAlternatives(recipe, spec.content ?? {});

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

/**
 * Build a SceneBlueprint from a SceneRegistry entry (D3 fallback path).
 * Uses simple text substitution for element resolution (D9 v1 limits).
 */
function composeBlueprintFromRegistry(
  entry: RegistryEntry,
  spec: SceneSpec,
  ctx: CompositionContext,
): SceneBlueprint | null {
  const elements = resolveElementsFromRegistry(
    entry,
    spec.id,
    spec.content ?? {},
  );

  if (elements.length === 0) {
    console.warn(
      `[CompositionFactory] Registry entry "${entry.id}" produced 0 elements for scene "${spec.id}".`,
    );
    return null;
  }

  // Layout/choreography: spec explicit > registry default (same priority logic)
  const specLayoutIsExplicit =
    spec.interpretationMeta?.derivedFrom?.some((d) =>
      d.startsWith("layout:"),
    ) ?? false;
  const layout: LayoutType = specLayoutIsExplicit
    ? spec.layout
    : entry.recipe.defaultLayout;

  const specChoreographyIsExplicit =
    spec.interpretationMeta?.derivedFrom?.some((d) =>
      d.startsWith("choreography:"),
    ) ?? false;
  const choreography: ChoreographyType = specChoreographyIsExplicit
    ? spec.choreography
    : entry.recipe.defaultChoreography;

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
