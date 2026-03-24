import type { QuoteContent, SceneBlueprint, VCLElement } from '@/types'
import type { ResolveContext } from '../types'
import { buildDefaultMediaPlan } from '../types'
import sceneCatalog from '@/schema/scene-catalog.json'

const CATALOG = sceneCatalog.scenes.quote

export function createQuoteBlueprint(
  content: QuoteContent,
  ctx: ResolveContext
): SceneBlueprint {
  const elements: VCLElement[] = [
    {
      id: 'quote-texture',
      type: 'texture-overlay',
      props: {
        layer: CATALOG.layers.texture,
        visible: content.showTexture !== false,
      },
    },
    {
      id: 'quote-quoteMark',
      type: 'shape',
      props: {
        role: 'quote-mark',
        layer: CATALOG.layers.quoteMark,
        tokenRef: 'colors.signal',
      },
    },
    {
      id: 'quote-quoteText',
      type: 'quote-text',
      props: {
        text: content.quoteText,
        layer: CATALOG.layers.quoteText,
        tokenRef: content.useSerif ? 'typography.fontFamily.serif' : 'typeScale.headlineM',
        useSerif: content.useSerif ?? false,
      },
    },
    {
      id: 'quote-attribution',
      type: 'caption',
      props: {
        text: content.attribution,
        layer: CATALOG.layers.attribution,
        tokenRef: 'typeScale.caption',
      },
    },
  ]

  return {
    id: `preset-quote-${ctx.from}`,
    intent: 'Quote reveal with attribution',
    origin: 'preset',
    layout: CATALOG.layoutArchetype as 'quote-hold',
    elements,
    choreography: 'reveal-sequence',
    motionPreset: CATALOG.motionPreset as 'heavy',
    format: ctx.format,
    theme: ctx.theme,
    from: ctx.from,
    durationFrames: ctx.durationFrames ?? CATALOG.durationFramesDefault,
    mediaPlan: buildDefaultMediaPlan(ctx.narrationText, ctx),
  }
}
