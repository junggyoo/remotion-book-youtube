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

// Family → dedicated layout affinity
const FAMILY_LAYOUT_AFFINITY: Partial<Record<SceneFamily, LayoutType>> = {
  "concept-introduction": "grid-n",
  "reflective-anchor": "quote-hold",
  "structural-bridge": "band-divider",
  "mechanism-explanation": "radial",
  "tension-comparison": "split-compare",
  "transformation-shift": "split-two",
  "evidence-stack": "comparison-bar",
};

// ArtDirection layoutBias → layout preference
const BIAS_LAYOUT_MAP: Record<string, LayoutType> = {
  "grid-heavy": "grid-expand",
  asymmetric: "split-compare",
  flow: "timeline-h",
  centered: "center-focus",
  hierarchical: "pyramid",
  layered: "stacked-layers",
  matrix: "matrix-2x2",
  process: "flowchart",
  organic: "scattered-cards",
  orbital: "orbit",
  bars: "comparison-bar",
};

// Family → choreography affinity (supplements layout affinity)
const FAMILY_CHOREOGRAPHY_AFFINITY: Partial<
  Record<SceneFamily, ChoreographyType>
> = {
  "concept-introduction": "stagger-clockwise",
  "system-model": "stagger-clockwise",
  "tension-comparison": "split-reveal",
  "transformation-shift": "split-reveal",
  "mechanism-explanation": "stagger-clockwise",
  "progression-journey": "path-trace",
  "evidence-stack": "stagger-clockwise",
  "closing-synthesis": "pulse-emphasis",
  "reflective-anchor": "zoom-focus",
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

  // 3. Family-choreography affinity
  const familyChoreography = FAMILY_CHOREOGRAPHY_AFFINITY[input.family];
  if (familyChoreography && !choreographyHint) {
    choreographyHint = familyChoreography;
    sources.push(
      `family-choreography affinity: ${input.family} → ${familyChoreography}`,
    );
  }

  // 4. Segment-based overrides (climax → more dramatic choreography)
  if (input.segment?.role === "climax") {
    if (input.family === "tension-comparison") {
      choreographyHint = "split-reveal";
      sources.push("segment:climax + tension-comparison → split-reveal");
    } else if (layoutHint === "pyramid" || layoutHint === "stacked-layers") {
      choreographyHint = "stack-build";
      sources.push(`segment:climax + ${layoutHint} → stack-build`);
    }
  }

  return { layoutHint, choreographyHint, sources };
}
