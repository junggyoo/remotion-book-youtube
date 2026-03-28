import type { VCLElement } from "@/types";
import type { FamilyRecipe, RecipeHints } from "../types";

interface SystemModelItem {
  title: string;
  description: string;
}

export const systemModelRecipe: FamilyRecipe = {
  family: "system-model",
  defaultLayout: "grid-expand",
  defaultChoreography: "stagger-clockwise",

  resolve(content: Record<string, unknown>, hints?: RecipeHints): VCLElement[] {
    const sceneId = hints?.sceneId ?? "scene";
    const headline = content.headline as string | undefined;
    const items = (content.items as SystemModelItem[] | undefined) ?? [];

    if (!headline && items.length === 0) return [];

    const elements: VCLElement[] = [];

    if (headline) {
      elements.push({
        id: `${sceneId}-headline`,
        type: "headline",
        props: { text: headline, role: "headline" },
      });
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      elements.push({
        id: `${sceneId}-item-${i}`,
        type: "body-text",
        props: {
          text: `${item.title} ${item.description}`,
          index: i,
          role: "item",
        },
      });
    }

    return elements;
  },
};
