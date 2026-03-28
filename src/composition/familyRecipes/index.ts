import type { FamilyRecipe } from "../types";
import type { SceneFamily } from "@/direction/types";
import { conceptIntroductionRecipe } from "./conceptIntroduction";
import { systemModelRecipe } from "./systemModel";
import { progressionJourneyRecipe } from "./progressionJourney";

export const recipeRegistry: Partial<Record<SceneFamily, FamilyRecipe>> = {};

export function registerRecipe(recipe: FamilyRecipe): void {
  recipeRegistry[recipe.family] = recipe;
}

// Register all built-in recipes
registerRecipe(conceptIntroductionRecipe);
registerRecipe(systemModelRecipe);
registerRecipe(progressionJourneyRecipe);
