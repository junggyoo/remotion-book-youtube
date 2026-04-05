import type { FamilyRecipe } from "../types";
import type { SceneFamily } from "@/direction/types";
import { conceptIntroductionRecipe } from "./conceptIntroduction";
import { systemModelRecipe } from "./systemModel";
import { progressionJourneyRecipe } from "./progressionJourney";
import { closingSynthesisRecipe } from "./closingSynthesis";
import { structuralBridgeRecipe } from "./structuralBridge";
import { openingHookRecipe } from "./openingHook";
import { reflectiveAnchorRecipe } from "./reflectiveAnchor";
import { mechanismExplanationRecipe } from "./mechanismExplanation";
import { tensionComparisonRecipe } from "./tensionComparison";
import { evidenceStackRecipe } from "./evidenceStack";
import { transformationShiftRecipe } from "./transformationShift";

export const recipeRegistry: Partial<Record<SceneFamily, FamilyRecipe>> = {};

export function registerRecipe(recipe: FamilyRecipe): void {
  recipeRegistry[recipe.family] = recipe;
}

// Register all built-in recipes
registerRecipe(conceptIntroductionRecipe);
registerRecipe(systemModelRecipe);
registerRecipe(progressionJourneyRecipe);
registerRecipe(closingSynthesisRecipe);
registerRecipe(structuralBridgeRecipe);
registerRecipe(openingHookRecipe);
registerRecipe(reflectiveAnchorRecipe);
registerRecipe(mechanismExplanationRecipe);
registerRecipe(tensionComparisonRecipe);
registerRecipe(evidenceStackRecipe);
registerRecipe(transformationShiftRecipe);

export {
  conceptIntroductionRecipe,
  systemModelRecipe,
  progressionJourneyRecipe,
  closingSynthesisRecipe,
  structuralBridgeRecipe,
  openingHookRecipe,
  reflectiveAnchorRecipe,
  mechanismExplanationRecipe,
  tensionComparisonRecipe,
  evidenceStackRecipe,
  transformationShiftRecipe,
};
