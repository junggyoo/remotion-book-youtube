import type { VCLElement } from "@/types";
import type { FamilyRecipe, RecipeHints } from "../types";

interface DataItem {
  label: string;
  value: string | number;
}

interface ListItem {
  text: string;
}

export const evidenceStackRecipe: FamilyRecipe = {
  family: "evidence-stack",
  defaultLayout: "grid-expand",
  alternativeLayouts: ["stacked-layers", "matrix-2x2"],
  defaultChoreography: "stagger-clockwise",

  resolve(content: Record<string, unknown>, hints?: RecipeHints): VCLElement[] {
    const sid = hints?.sceneId ?? "es";

    // Data mode: dataLabel + data[]
    const dataLabel = content.dataLabel as string | undefined;
    const dataItems = (content.data as DataItem[] | undefined) ?? [];
    if (dataLabel && dataItems.length > 0) {
      const elements: VCLElement[] = [
        {
          id: `${sid}-headline`,
          type: "headline",
          props: { text: dataLabel, role: "headline" },
        },
      ];

      for (let i = 0; i < dataItems.length; i++) {
        const item = dataItems[i];
        elements.push({
          id: `${sid}-data-${i}`,
          type: "body-text",
          props: {
            text: `${item.label}: ${item.value}`,
            index: i,
            role: "data-item",
          },
        });
      }

      return elements;
    }

    // List mode: listLabel + items[]
    const listLabel = content.listLabel as string | undefined;
    const listItems = (content.items as ListItem[] | undefined) ?? [];
    if (listLabel && listItems.length > 0) {
      const elements: VCLElement[] = [
        {
          id: `${sid}-headline`,
          type: "headline",
          props: { text: listLabel, role: "headline" },
        },
      ];

      for (let i = 0; i < listItems.length; i++) {
        const item = listItems[i];
        elements.push({
          id: `${sid}-list-${i}`,
          type: "body-text",
          props: { text: item.text, index: i, role: "list-item" },
        });
      }

      return elements;
    }

    return [];
  },
};
