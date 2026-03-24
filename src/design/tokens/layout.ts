import type { SafeAreaConfig } from '@/types'

export const layout = {
  longform: {
    width: 1920,
    height: 1080,
    safeArea: {
      outerMarginX: 128,
      outerMarginY: 80,
      bodyMaxWidth: 920,
      contentColumnWidth: 760,
    } satisfies SafeAreaConfig,
    gridColumns: 12,
    gutter: 24,
  },
  shorts: {
    width: 1080,
    height: 1920,
    safeArea: {
      outerMarginX: 72,
      outerMarginY: 120,
      bodyMaxWidth: 720,
      contentColumnWidth: 640,
    } satisfies SafeAreaConfig,
    gridColumns: 6,
    gutter: 20,
  },
} as const
