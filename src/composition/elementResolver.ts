import type { VCLElement } from "@/types";
import type { SceneSpec } from "@/direction/types";
import type { RecipeHints } from "./types";
import { recipeRegistry } from "./familyRecipes";

export function resolveElements(spec: SceneSpec): VCLElement[] {
  const recipe = recipeRegistry[spec.family];
  const hints: RecipeHints = {
    sceneId: spec.id,
    directionName: spec.direction?.name,
    emphasisDensity: spec.direction?.base?.emphasisDensity,
    energy: spec.direction?.base?.energy,
  };

  if (!recipe) {
    const headline = spec.content.headline as string | undefined;
    if (headline) {
      return [
        {
          id: `${spec.id}-headline`,
          type: "headline",
          props: { text: headline, role: "headline" },
        },
      ];
    }
    return [];
  }

  return recipe.resolve(spec.content, hints);
}
