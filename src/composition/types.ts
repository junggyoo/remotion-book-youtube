import type {
  VCLElement,
  Theme,
  MotionPresetKey,
  LayoutType,
  ChoreographyType,
} from "@/types";
import type { SceneFamily, DirectionProfileName } from "@/direction/types";

export interface RecipeHints {
  sceneId: string;
  directionName?: DirectionProfileName;
  emphasisDensity?: number;
  energy?: number;
}

export interface FamilyRecipe {
  family: SceneFamily;
  resolve(content: Record<string, unknown>, hints?: RecipeHints): VCLElement[];
  defaultLayout: LayoutType;
  defaultChoreography: ChoreographyType;
}

export interface CompositionContext {
  format: "longform" | "shorts";
  theme: Theme;
  from: number;
  durationFrames: number;
  motionPreset: MotionPresetKey;
}
