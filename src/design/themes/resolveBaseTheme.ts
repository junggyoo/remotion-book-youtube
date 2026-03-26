import type { ThemeMode, GenreKey, Theme } from "@/types";
import { colors } from "@/design/tokens/colors";

/**
 * Pure theme factory — identical logic to useTheme() but named for
 * non-React contexts (pipeline, planning, resolvers).
 *
 * Use resolveBaseTheme() in: src/planning/, src/pipeline/, resolvers
 * Use useTheme() in: src/scenes/, src/compositions/ (React components)
 */
export function resolveBaseTheme(mode: ThemeMode, genre: GenreKey): Theme {
  const semantic = colors.semantic[mode];
  const genreVariant = colors.genreVariants[genre];

  return {
    mode,
    genre,
    bg: semantic.bg,
    surface: semantic.surface,
    surfaceMuted: semantic.surfaceMuted,
    textStrong: semantic.textStrong,
    textMuted: semantic.textMuted,
    lineSubtle: semantic.lineSubtle,
    signal: colors.brand.cobaltBlue,
    accent: genreVariant.accent,
    premium: colors.brand.softGold,
  };
}
