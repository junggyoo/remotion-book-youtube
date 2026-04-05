import type { VCLElement } from "@/types";
import type { FamilyRecipe, RecipeHints } from "../types";

export const transformationShiftRecipe: FamilyRecipe = {
  family: "transformation-shift",
  defaultLayout: "split-two",
  defaultChoreography: "split-reveal",

  resolve(content: Record<string, unknown>, hints?: RecipeHints): VCLElement[] {
    const sid = hints?.sceneId ?? "ts";

    const beforeState = content.beforeState as string | undefined;
    const afterState = content.afterState as string | undefined;

    if (!beforeState && !afterState) return [];

    const elements: VCLElement[] = [];

    // Before label
    if (beforeState) {
      elements.push({
        id: `${sid}-before-label`,
        type: "label",
        props: { text: "Before", role: "before-label" },
      });

      elements.push({
        id: `${sid}-before-content`,
        type: "body-text",
        props: { text: beforeState, role: "before-content" },
      });
    }

    // Divider between before/after
    if (beforeState && afterState) {
      elements.push({
        id: `${sid}-divider`,
        type: "divider",
        props: { orientation: "vertical", role: "divider" },
      });
    }

    // After label (accent variant to highlight transformation result)
    if (afterState) {
      elements.push({
        id: `${sid}-after-label`,
        type: "label",
        props: { text: "After", variant: "accent", role: "after-label" },
      });

      elements.push({
        id: `${sid}-after-content`,
        type: "body-text",
        props: { text: afterState, role: "after-content" },
      });
    }

    // Optional transition label (e.g., "3 months later")
    const transitionLabel = content.transitionLabel as string | undefined;
    if (transitionLabel) {
      elements.push({
        id: `${sid}-transition`,
        type: "caption",
        props: { text: transitionLabel, role: "transition" },
      });
    }

    return elements;
  },
};
