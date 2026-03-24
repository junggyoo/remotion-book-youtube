import type { ClosingContent, SceneBlueprint, VCLElement } from '@/types'
import type { ResolveContext } from '../types'
import { buildDefaultMediaPlan } from '../types'
import sceneCatalog from '@/schema/scene-catalog.json'

const CATALOG = sceneCatalog.scenes.closing

export function createClosingBlueprint(
  content: ClosingContent,
  ctx: ResolveContext
): SceneBlueprint {
  const elements: VCLElement[] = [
    {
      id: 'closing-texture',
      type: 'texture-overlay',
      props: { layer: CATALOG.layers.texture },
    },
    {
      id: 'closing-recapStatement',
      type: 'headline',
      props: {
        text: content.recapStatement,
        layer: CATALOG.layers.recapStatement,
        tokenRef: 'typeScale.headlineM',
      },
    },
    ...(content.showBrandLabel !== false
      ? [{
          id: 'closing-brandLabel',
          type: 'label' as const,
          props: {
            text: 'Editorial Signal',
            layer: CATALOG.layers.brandLabel,
            tokenRef: 'typeScale.label',
          },
        }]
      : []),
    ...(content.ctaText
      ? [{
          id: 'closing-cta',
          type: 'body-text' as const,
          props: {
            text: content.ctaText,
            layer: CATALOG.layers.cta,
            tokenRef: 'typeScale.bodyM',
          },
        }]
      : []),
  ]

  return {
    id: `preset-closing-${ctx.from}`,
    intent: 'Closing recap with brand label and optional CTA',
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
