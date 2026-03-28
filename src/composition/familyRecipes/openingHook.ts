import type { VCLElement } from "@/types";
import type { FamilyRecipe, RecipeHints } from "../types";

export const openingHookRecipe: FamilyRecipe = {
  family: "opening-hook",
  defaultLayout: "center-focus",
  defaultChoreography: "reveal-sequence",

  resolve(content: Record<string, unknown>, hints?: RecipeHints): VCLElement[] {
    const sid = hints?.sceneId ?? "oh";

    // Cover mode: title takes priority
    const title = content.title as string | undefined;
    if (title) {
      const elements: VCLElement[] = [
        {
          id: `${sid}-headline`,
          type: "headline",
          props: { text: title, role: "headline" },
        },
      ];

      const author = content.author as string | undefined;
      if (author) {
        elements.push({
          id: `${sid}-caption`,
          type: "caption",
          props: { text: author, role: "caption" },
        });
      }

      const subtitle = content.subtitle as string | undefined;
      if (subtitle) {
        elements.push({
          id: `${sid}-body`,
          type: "body-text",
          props: { text: subtitle, role: "subtitle" },
        });
      }

      const coverImageUrl = content.coverImageUrl as string | undefined;
      if (coverImageUrl) {
        elements.push({
          id: `${sid}-image`,
          type: "image",
          props: { src: coverImageUrl, role: "cover" },
        });
      }

      return elements;
    }

    // Highlight mode
    const mainText = content.mainText as string | undefined;
    if (mainText) {
      const elements: VCLElement[] = [
        {
          id: `${sid}-headline`,
          type: "headline",
          props: { text: mainText, role: "headline" },
        },
      ];

      const subText = content.subText as string | undefined;
      if (subText) {
        elements.push({
          id: `${sid}-body`,
          type: "body-text",
          props: { text: subText, role: "support" },
        });
      }

      return elements;
    }

    return [];
  },
};
