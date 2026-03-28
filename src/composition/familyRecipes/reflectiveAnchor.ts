import type { VCLElement } from "@/types";
import type { FamilyRecipe, RecipeHints } from "../types";

export const reflectiveAnchorRecipe: FamilyRecipe = {
  family: "reflective-anchor",
  defaultLayout: "center-focus",
  defaultChoreography: "reveal-sequence",

  resolve(content: Record<string, unknown>, hints?: RecipeHints): VCLElement[] {
    const sid = hints?.sceneId ?? "ra";

    // Single mode: quoteText present
    const quoteText = content.quoteText as string | undefined;
    if (quoteText) {
      const elements: VCLElement[] = [
        {
          id: `${sid}-quote`,
          type: "quote-text",
          props: { text: quoteText, role: "quote" },
        },
      ];

      const attribution = content.attribution as string | undefined;
      if (attribution) {
        elements.push({
          id: `${sid}-caption`,
          type: "caption",
          props: { text: attribution, role: "attribution" },
        });
      }

      return elements;
    }

    // Split mode: both leftQuote AND rightQuote required
    const leftQuote = content.leftQuote as string | undefined;
    const rightQuote = content.rightQuote as string | undefined;
    if (leftQuote && rightQuote) {
      const elements: VCLElement[] = [
        {
          id: `${sid}-left-quote`,
          type: "quote-text",
          props: { text: leftQuote, role: "left-quote" },
        },
      ];

      const leftAttr = content.leftAttribution as string | undefined;
      if (leftAttr) {
        elements.push({
          id: `${sid}-left-attr`,
          type: "caption",
          props: { text: leftAttr, role: "left-attribution" },
        });
      }

      elements.push({
        id: `${sid}-divider`,
        type: "divider",
        props: { orientation: "vertical", role: "divider" },
      });

      elements.push({
        id: `${sid}-right-quote`,
        type: "quote-text",
        props: { text: rightQuote, role: "right-quote" },
      });

      const rightAttr = content.rightAttribution as string | undefined;
      if (rightAttr) {
        elements.push({
          id: `${sid}-right-attr`,
          type: "caption",
          props: { text: rightAttr, role: "right-attribution" },
        });
      }

      return elements;
    }

    return [];
  },
};
