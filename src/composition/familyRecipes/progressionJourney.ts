import type { VCLElement } from "@/types";
import type { FamilyRecipe, RecipeHints } from "../types";

interface JourneyStep {
  title: string;
  detail: string;
}

export const progressionJourneyRecipe: FamilyRecipe = {
  family: "progression-journey",
  defaultLayout: "timeline-h",
  defaultChoreography: "path-trace",
  alternativeLayouts: ["flowchart"],

  resolve(content: Record<string, unknown>, hints?: RecipeHints): VCLElement[] {
    const sceneId = hints?.sceneId ?? "scene";
    const headline = content.headline as string | undefined;
    const steps = (content.steps as JourneyStep[] | undefined) ?? [];

    if (!headline && steps.length === 0) return [];

    const elements: VCLElement[] = [];

    if (headline) {
      elements.push({
        id: `${sceneId}-headline`,
        type: "headline",
        props: { text: headline, role: "headline" },
      });
    }

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      elements.push({
        id: `${sceneId}-step-${i}`,
        type: "flow-step",
        props: {
          stepNumber: i + 1,
          title: step.title,
          detail: step.detail,
          index: i,
          role: "step",
        },
      });
    }

    return elements;
  },
};
