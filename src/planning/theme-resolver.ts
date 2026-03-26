import type { ThemeMode, GenreKey, Theme } from "@/types";
import { resolveBaseTheme } from "@/design/themes/resolveBaseTheme";
import type { BookArtDirection, BookThemeOverrides } from "./types";

/**
 * Compose brand core theme + book-specific overrides.
 * 1차: signal + accent override only. Surface override is 2차.
 */
export function resolveBookTheme(
  mode: ThemeMode,
  genre: GenreKey,
  artDirection?: BookArtDirection,
): Theme {
  const base = resolveBaseTheme(mode, genre);
  if (!artDirection) return base;

  const overrides = extractThemeOverrides(artDirection);
  return {
    ...base,
    ...(overrides.signalColor && { signal: overrides.signalColor }),
    ...(overrides.accentColor && { accent: overrides.accentColor }),
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
