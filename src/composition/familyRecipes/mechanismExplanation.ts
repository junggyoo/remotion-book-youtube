import type { VCLElement } from "@/types";
import type { FamilyRecipe, RecipeHints } from "../types";

interface MechanismItem {
  title: string;
  description: string;
}

export const mechanismExplanationRecipe: FamilyRecipe = {
  family: "mechanism-explanation",
  defaultLayout: "radial",
  defaultChoreography: "stagger-clockwise",

  resolve(content: Record<string, unknown>, hints?: RecipeHints): VCLElement[] {
    const sid = hints?.sceneId ?? "me";

    // frameworkLabel takes priority over headline
    const label =
      (content.frameworkLabel as string | undefined) ??
      (content.headline as string | undefined);
    const items = (content.items as MechanismItem[] | undefined) ?? [];

    if (!label && items.length === 0) return [];

    const elements: VCLElement[] = [];

    if (label) {
      elements.push({
        id: `${sid}-headline`,
        type: "headline",
        props: { text: label, role: "headline" },
      });
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      elements.push({
        id: `${sid}-item-${i}`,
        type: "body-text",
        props: {
          text: `${item.title}: ${item.description}`,
          index: i,
          role: "item",
        },
      });
    }

    return elements;
  },
};
