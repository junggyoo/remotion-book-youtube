import type { KeyInsightContent, SceneBlueprint, VCLElement } from '@/types'
import type { ResolveContext } from '../types'
import { buildDefaultMediaPlan } from '../types'
import sceneCatalog from '@/schema/scene-catalog.json'

const CATALOG = sceneCatalog.scenes.keyInsight

export function createKeyInsightBlueprint(
  content: KeyInsightContent,
  ctx: ResolveContext
): SceneBlueprint {
  const elements: VCLElement[] = [
    {
      id: 'keyInsight-texture',
      type: 'texture-overlay',
      props: { layer: CATALOG.layers.texture },
    },
    ...(content.useSignalBar !== false
      ? [{
          id: 'keyInsight-signalBar',
          type: 'shape' as const,
          props: {
            role: 'signal-bar',
            layer: CATALOG.layers.signalBar,
            tokenRef: 'colors.signal',
          },
        }]
      : []),
    {
      id: 'keyInsight-headline',
      type: 'headline',
      props: {
        text: content.headline,
        layer: CATALOG.layers.headline,
        tokenRef: 'typeScale.headlineL',
        underlineKeyword: content.underlineKeyword,
      },
    },
    ...(content.supportText
      ? [{
          id: 'keyInsight-supportText',
          type: 'body-text' as const,
          props: {
            text: content.supportText,
            layer: CATALOG.layers.supportText,
            tokenRef: 'typeScale.bodyM',
          },
        }]
      : []),
  ]

  return {
    id: `preset-keyInsight-${ctx.from}`,
    intent: 'Key insight headline reveal with optional support text',
    origin: 'preset',
    layout: CATALOG.layoutArchetype as 'center-focus',
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
