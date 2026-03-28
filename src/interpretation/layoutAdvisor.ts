import type { InterpretationContext } from "./types";
import type { SceneFamily } from "@/direction/types";
import type { LayoutType, ChoreographyType } from "@/types";

interface AdvisorInput {
  family: SceneFamily;
  artDirection?: InterpretationContext["artDirection"];
  segment?: InterpretationContext["segment"];
}

interface LayoutAdvice {
  layoutHint?: LayoutType;
  choreographyHint?: ChoreographyType;
  sources: string[]; // trace: why these hints
}

// Family → dedicated layout affinity (Part B layouts!)
const FAMILY_LAYOUT_AFFINITY: Partial<Record<SceneFamily, LayoutType>> = {
  "reflective-anchor": "quote-hold",
  "structural-bridge": "band-divider",
};

// ArtDirection layoutBias → layout preference
const BIAS_LAYOUT_MAP: Record<string, LayoutType> = {
  "grid-heavy": "grid-expand",
  asymmetric: "split-compare",
  flow: "timeline-h",
  centered: "center-focus",
};

export function adviseLayout(input: AdvisorInput): LayoutAdvice {
  const sources: string[] = [];
  let layoutHint: LayoutType | undefined;
  let choreographyHint: ChoreographyType | undefined;

  // 1. Family-layout affinity (highest priority hint)
  const familyLayout = FAMILY_LAYOUT_AFFINITY[input.family];
  if (familyLayout) {
    layoutHint = familyLayout;
    sources.push(`family-layout affinity: ${input.family} → ${familyLayout}`);
  }

  // 2. ArtDirection layoutBias (if no family affinity)
  if (!layoutHint && input.artDirection?.layoutBias) {
    const biasLayout = BIAS_LAYOUT_MAP[input.artDirection.layoutBias];
    if (biasLayout) {
      layoutHint = biasLayout;
      sources.push(
        `artDirection.layoutBias: ${input.artDirection.layoutBias} → ${biasLayout}`,
      );
    }
  }

  // 3. Segment-based choreography hints
  if (
    input.segment?.role === "climax" &&
    input.family === "tension-comparison"
  ) {
    choreographyHint = "split-reveal";
    sources.push("segment:climax + tension-comparison → split-reveal");
  }

  return { layoutHint, choreographyHint, sources };
}
