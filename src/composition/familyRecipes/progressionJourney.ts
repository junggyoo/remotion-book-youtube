import type { VCLElement } from "@/types";
import type { FamilyRecipe, RecipeHints } from "../types";

interface JourneyStep {
  title: string;
  detail: string;
}

interface TimelineEvent {
  year: string;
  title: string;
  description: string;
}

export const progressionJourneyRecipe: FamilyRecipe = {
  family: "progression-journey",
  defaultLayout: "timeline-h",
  defaultChoreography: "path-trace",
  alternativeLayouts: ["flowchart"],

  resolve(content: Record<string, unknown>, hints?: RecipeHints): VCLElement[] {
    const sceneId = hints?.sceneId ?? "scene";

    // Normalize: support both steps[] (application) and events[] (timeline) content
    const headline =
      (content.headline as string | undefined) ??
      (content.timelineLabel as string | undefined);
    const rawSteps = content.steps as JourneyStep[] | undefined;
    const rawEvents = content.events as TimelineEvent[] | undefined;

    const steps: JourneyStep[] =
      rawSteps ??
      rawEvents?.map((e) => ({
        title: e.title,
        detail: e.description,
      })) ??
      [];

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
      const badge = rawEvents?.[i]?.year;
      elements.push({
        id: `${sceneId}-step-${i}`,
        type: "flow-step",
        props: {
          stepNumber: i + 1,
          title: step.title,
          detail: step.detail,
          ...(badge ? { badge } : {}),
          index: i,
          role: "step",
        },
      });
    }

    return elements;
  },
};
