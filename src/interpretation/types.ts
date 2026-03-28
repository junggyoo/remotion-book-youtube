import type { LayoutType, ChoreographyType } from "@/types";
import type { SceneFamily, DirectionProfileName } from "@/direction/types";

/** DirectionParams shape — matches base in DirectionProfile */
export interface DirectionParamsDelta {
  pacing?: number;
  energy?: number;
  emphasisDensity?: number;
  holdRatio?: number;
  transitionTension?: number;
}

export interface ScoredFamily {
  family: SceneFamily;
  score: number;
  breakdown: {
    typeMatch: number;
    segmentFit: number;
    artDirectionFit: number;
    varietyBonus: number;
  };
  reason: string;
}

export interface InterpretationResult {
  family: SceneFamily;
  familyConfidence: number;
  directionOverrides?: DirectionParamsDelta;
  layoutHint?: LayoutType;
  choreographyHint?: ChoreographyType;
  trace: InterpretationTrace;
}

export interface InterpretationTrace {
  derivedFrom: string[];
  whyThisFamily: string;
  whyThisDirection?: string;
  alternativeChoices: Array<{
    family: SceneFamily;
    score: number;
    shortReason: string;
  }>;
  appliedDeltas?: string[];
  hintSources?: string[];
}

export interface InterpretationContext {
  fingerprint: {
    genre: string;
    structure: string;
    emotionalTone: string[];
  };
  segment?: {
    role: string;
    durationRatio: number;
    intent: string;
    requiredDelivery: string[];
  };
  artDirection?: {
    layoutBias?: string;
    motionCharacter?: string;
    revealDensity?: string;
    emphasisStyle?: string;
    typographyMood?: string;
  };
  usedFamilies: SceneFamily[];
  bookStructure?: string;
}
