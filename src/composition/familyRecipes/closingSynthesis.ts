import type { VCLElement } from "@/types";
import type { FamilyRecipe, RecipeHints } from "../types";

export const closingSynthesisRecipe: FamilyRecipe = {
  family: "closing-synthesis",
  defaultLayout: "center-focus",
  defaultChoreography: "reveal-sequence",

  resolve(content: Record<string, unknown>, hints?: RecipeHints): VCLElement[] {
    const sid = hints?.sceneId ?? "cs";
    const recapStatement = content.recapStatement as string | undefined;

    if (!recapStatement) return [];

    const elements: VCLElement[] = [
      {
        id: `${sid}-headline`,
        type: "headline",
        props: { text: recapStatement, role: "headline" },
      },
    ];

    const ctaText = content.ctaText as string | undefined;
    if (ctaText) {
      elements.push({
        id: `${sid}-cta`,
        type: "label",
        props: { text: ctaText, variant: "accent", role: "cta" },
      });
    }

    return elements;
  },
};
