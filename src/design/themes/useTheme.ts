import type { ThemeMode, GenreKey, Theme } from '@/types'
import { colors } from '@/design/tokens/colors'

/**
 * Maps (mode, genre) to a fully resolved Theme object.
 */
export function useTheme(mode: ThemeMode, genre: GenreKey): Theme {
  const semantic = colors.semantic[mode]
  const genreVariant = colors.genreVariants[genre]

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
  }
}
