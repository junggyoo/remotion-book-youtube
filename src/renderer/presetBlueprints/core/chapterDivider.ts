import type { ChapterDividerContent, SceneBlueprint, VCLElement } from '@/types'
import type { ResolveContext } from '../types'
import { buildDefaultMediaPlan } from '../types'
import sceneCatalog from '@/schema/scene-catalog.json'

const CATALOG = sceneCatalog.scenes.chapterDivider

export function createChapterDividerBlueprint(
  content: ChapterDividerContent,
  ctx: ResolveContext
): SceneBlueprint {
  const elements: VCLElement[] = [
    {
      id: 'chapterDivider-texture',
      type: 'texture-overlay',
      props: { layer: CATALOG.layers.texture },
    },
    {
      id: 'chapterDivider-chapterNumber',
      type: 'number-display',
      props: {
        value: content.chapterNumber,
        layer: CATALOG.layers.chapterNumber,
        tokenRef: 'typeScale.headlineL',
      },
    },
    {
      id: 'chapterDivider-chapterTitle',
      type: 'headline',
      props: {
        text: content.chapterTitle,
        layer: CATALOG.layers.chapterTitle,
        tokenRef: 'typeScale.headlineM',
      },
    },
    ...(content.chapterSubtitle
      ? [{
          id: 'chapterDivider-baseContent',
          type: 'body-text' as const,
          props: {
            text: content.chapterSubtitle,
            layer: CATALOG.layers.baseContent,
            tokenRef: 'typeScale.bodyM',
          },
        }]
      : []),
  ]

  const layoutArchetype = content.useAltLayout
    ? (CATALOG.altLayoutArchetype as 'band-divider')
    : (CATALOG.layoutArchetype as 'left-anchor')

  return {
    id: `preset-chapterDivider-${ctx.from}`,
    intent: 'Chapter divider with number and title reveal',
    origin: 'preset',
    layout: layoutArchetype,
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
