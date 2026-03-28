import type { VCLElement } from "@/types";
import type { FamilyRecipe, RecipeHints } from "../types";

export const tensionComparisonRecipe: FamilyRecipe = {
  family: "tension-comparison",
  defaultLayout: "split-compare",
  defaultChoreography: "split-reveal",

  resolve(content: Record<string, unknown>, hints?: RecipeHints): VCLElement[] {
    const sid = hints?.sceneId ?? "tc";

    const leftLabel = content.leftLabel as string | undefined;
    const rightLabel = content.rightLabel as string | undefined;

    if (!leftLabel && !rightLabel) return [];

    const elements: VCLElement[] = [];

    if (leftLabel) {
      elements.push({
        id: `${sid}-left-label`,
        type: "label",
        props: { text: leftLabel, role: "left-label" },
      });
    }

    const leftContent = content.leftContent as string | undefined;
    if (leftContent) {
      elements.push({
        id: `${sid}-left-content`,
        type: "body-text",
        props: { text: leftContent, role: "left-content" },
      });
    }

    if (rightLabel) {
      elements.push({
        id: `${sid}-right-label`,
        type: "label",
        props: { text: rightLabel, variant: "accent", role: "right-label" },
      });
    }

    const rightContent = content.rightContent as string | undefined;
    if (rightContent) {
      elements.push({
        id: `${sid}-right-content`,
        type: "body-text",
        props: { text: rightContent, role: "right-content" },
      });
    }

    return elements;
  },
};
