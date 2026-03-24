import type { FormatKey, FormatConfig } from '@/types'
import { layout } from '@/design/tokens/layout'
import { typography } from '@/design/tokens/typography'

/**
 * Returns the resolved FormatConfig (layout + typeScale) for the given format.
 * For 'both', returns the longform configuration.
 */
export function useFormat(format: FormatKey): FormatConfig {
  const key = format === 'shorts' ? 'shorts' : 'longform'
  const l = layout[key]

  return {
    width: l.width,
    height: l.height,
    safeArea: { ...l.safeArea },
    gridColumns: l.gridColumns,
    gutter: l.gutter,
    typeScale: { ...typography.scale[key] },
  }
}
