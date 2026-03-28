import type { GenreKey, SceneType } from "@/types";
import type {
  DirectionProfile,
  DirectionProfileName,
  SceneFamily,
} from "./types";
import { getDirectionProfile } from "./profiles";

const GENRE_DIRECTION_MAP: Record<GenreKey, DirectionProfileName> = {
  psychology: "analytical",
  selfHelp: "persuasive",
  business: "systematic",
  philosophy: "contemplative",
  science: "investigative",
  ai: "systematic",
};

const TONE_DIRECTION_OVERRIDE: Record<string, DirectionProfileName> = {
  urgent: "urgent",
  hopeful: "inspirational",
  reflective: "contemplative",
  provocative: "persuasive",
  intense: "urgent",
  calm: "contemplative",
};

interface FingerprintHint {
  genre: GenreKey;
  structure: string;
  emotionalTone: string[];
}

export function resolveDirectionFromFingerprint(
  hint: FingerprintHint,
): DirectionProfile {
  for (const tone of hint.emotionalTone) {
    if (TONE_DIRECTION_OVERRIDE[tone]) {
      return getDirectionProfile(TONE_DIRECTION_OVERRIDE[tone]);
    }
  }
  const profileName = GENRE_DIRECTION_MAP[hint.genre] ?? "systematic";
  return getDirectionProfile(profileName);
}

const SCENE_FAMILY_MAP: Record<string, SceneFamily> = {
  cover: "opening-hook",
  highlight: "opening-hook",
  keyInsight: "concept-introduction",
  compareContrast: "tension-comparison",
  application: "progression-journey",
  quote: "reflective-anchor",
  chapterDivider: "structural-bridge",
  closing: "closing-synthesis",
  data: "evidence-stack",
  timeline: "progression-journey",
  listReveal: "evidence-stack",
  splitQuote: "reflective-anchor",
  transition: "structural-bridge",
};

export function resolveSceneFamily(
  sceneType: SceneType | string,
  bookStructure?: string,
): SceneFamily {
  if (sceneType === "framework") {
    return bookStructure === "framework"
      ? "system-model"
      : "mechanism-explanation";
  }
  return SCENE_FAMILY_MAP[sceneType] ?? "concept-introduction";
}
