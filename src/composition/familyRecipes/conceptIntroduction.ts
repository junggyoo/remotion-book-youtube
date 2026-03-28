import type { VCLElement } from "@/types";
import type { FamilyRecipe, RecipeHints } from "../types";

export const conceptIntroductionRecipe: FamilyRecipe = {
  family: "concept-introduction",
  defaultLayout: "center-focus",
  defaultChoreography: "reveal-sequence",

  resolve(content: Record<string, unknown>, hints?: RecipeHints): VCLElement[] {
    const sceneId = hints?.sceneId ?? "scene";
    const headline = content.headline as string | undefined;

    if (!headline) return [];

    const elements: VCLElement[] = [
      {
        id: `${sceneId}-headline`,
        type: "headline",
        props: { text: headline, role: "headline" },
      },
    ];

    const supportText = content.supportText as string | undefined;
    if (supportText) {
      elements.push({
        id: `${sceneId}-support`,
        type: "body-text",
        props: { text: supportText, role: "support" },
      });
    }

    const evidence = content.evidence as string | undefined;
    if (evidence) {
      elements.push({
        id: `${sceneId}-evidence`,
        type: "label",
        props: { text: evidence, variant: "signal", role: "evidence" },
      });
    }

    return elements;
  },
};
