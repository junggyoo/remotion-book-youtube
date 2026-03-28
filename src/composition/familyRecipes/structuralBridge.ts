import type { VCLElement } from "@/types";
import type { FamilyRecipe, RecipeHints } from "../types";

export const structuralBridgeRecipe: FamilyRecipe = {
  family: "structural-bridge",
  defaultLayout: "center-focus",
  defaultChoreography: "reveal-sequence",

  resolve(content: Record<string, unknown>, hints?: RecipeHints): VCLElement[] {
    const sid = hints?.sceneId ?? "sb";
    const chapterTitle = content.chapterTitle as string | undefined;

    if (!chapterTitle) return [];

    const elements: VCLElement[] = [
      {
        id: `${sid}-divider`,
        type: "divider",
        props: { role: "divider" },
      },
    ];

    const chapterNumber = content.chapterNumber as string | number | undefined;
    if (chapterNumber !== undefined) {
      elements.push({
        id: `${sid}-number`,
        type: "number-display",
        props: { text: String(chapterNumber), role: "number" },
      });
    }

    elements.push({
      id: `${sid}-headline`,
      type: "headline",
      props: { text: chapterTitle, role: "headline" },
    });

    const chapterSubtitle = content.chapterSubtitle as string | undefined;
    if (chapterSubtitle) {
      elements.push({
        id: `${sid}-subtitle`,
        type: "body-text",
        props: { text: chapterSubtitle, role: "subtitle" },
      });
    }

    return elements;
  },
};
