import type { ThemeMode, GenreKey, Theme, MotionPresetKey } from "@/types";
import { resolveBaseTheme } from "@/design/themes/resolveBaseTheme";
import type { BookArtDirection, BookThemeOverrides } from "./types";

// ============================================================
// Art Influence — resolved from BookArtDirection for downstream use
// ============================================================
export interface ResolvedArtInfluence {
  theme: Theme;
  layoutBias?: "centered" | "asymmetric" | "grid-heavy" | "flow";
  motionPresetHint?: MotionPresetKey;
  shapeLanguage?: "geometric" | "organic" | "angular" | "minimal" | "mixed";
}

/** Map motionCharacter → motionPresetHint */
const MOTION_CHARACTER_MAP: Record<
  BookArtDirection["motionCharacter"],
  MotionPresetKey
> = {
  fluid: "smooth",
  weighted: "heavy",
  precise: "snappy",
  snappy: "gentle",
};

/**
 * Compose brand core theme + book-specific overrides.
 * Returns ResolvedArtInfluence containing theme + layout/motion/shape hints.
 */
export function resolveBookTheme(
  mode: ThemeMode,
  genre: GenreKey,
  artDirection?: BookArtDirection,
): ResolvedArtInfluence {
  const base = resolveBaseTheme(mode, genre);
  if (!artDirection) return { theme: base };

  const overrides = extractThemeOverrides(artDirection);
  const theme: Theme = {
    ...base,
    ...(overrides.signalColor && { signal: overrides.signalColor }),
    ...(overrides.accentColor && { accent: overrides.accentColor }),
  };

  return {
    theme,
    layoutBias: artDirection.layoutBias,
    motionPresetHint: MOTION_CHARACTER_MAP[artDirection.motionCharacter],
    shapeLanguage: artDirection.shapeLanguage,
  };
}

function extractThemeOverrides(
  artDirection: BookArtDirection,
): BookThemeOverrides {
  return {
    signalColor: artDirection.signalColor,
    accentColor: artDirection.palette.primary,
    motionCharacter: artDirection.motionCharacter,
  };
}
