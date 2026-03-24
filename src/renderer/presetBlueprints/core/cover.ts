import type { CoverContent, SceneBlueprint, VCLElement } from '@/types'
import type { ResolveContext } from '../types'
import { buildDefaultMediaPlan } from '../types'
import sceneCatalog from '@/schema/scene-catalog.json'

const CATALOG = sceneCatalog.scenes.cover

export function createCoverBlueprint(
  content: CoverContent,
  ctx: ResolveContext
): SceneBlueprint {
  const elements: VCLElement[] = [
    {
      id: 'cover-texture',
      type: 'texture-overlay',
      props: { layer: CATALOG.layers.texture },
    },
    {
      id: 'cover-image',
      type: 'image',
      props: {
        src: content.coverImageUrl,
        layer: CATALOG.layers.coverImage,
        role: 'book-cover',
      },
    },
    {
      id: 'cover-title',
      type: 'headline',
      props: {
        text: content.title,
        layer: CATALOG.layers.title,
        tokenRef: 'typeScale.headlineL',
      },
    },
    ...(content.subtitle
      ? [{
          id: 'cover-subtitle',
          type: 'body-text' as const,
          props: {
            text: content.subtitle,
            layer: CATALOG.layers.baseContent,
            tokenRef: 'typeScale.bodyM',
          },
        }]
      : []),
    {
      id: 'cover-author',
      type: 'body-text',
      props: {
        text: content.author,
        layer: CATALOG.layers.baseContent,
        tokenRef: 'typeScale.bodyS',
      },
    },
    {
      id: 'cover-brandLabel',
      type: 'label',
      props: {
        text: content.brandLabel ?? 'Editorial Signal',
        layer: CATALOG.layers.brandLabel,
        tokenRef: 'typeScale.label',
      },
    },
  ]

  return {
    id: `preset-cover-${ctx.from}`,
    intent: 'Book cover reveal with title, author, and brand',
    origin: 'preset',
    layout: CATALOG.layoutArchetype as 'center-focus',
    elements,
    choreography: 'reveal-sequence',
    motionPreset: CATALOG.motionPreset as 'dramatic',
    format: ctx.format,
    theme: ctx.theme,
    from: ctx.from,
    durationFrames: ctx.durationFrames ?? CATALOG.durationFramesDefault,
    mediaPlan: buildDefaultMediaPlan(ctx.narrationText, ctx),
  }
}
