// ============================================================
// framework preset blueprint factory
// Layout: grid-expand | Choreography: stagger-clockwise
// ============================================================

import type { FrameworkContent, SceneBlueprint, VCLElement } from '@/types'
import type { ResolveContext } from '../types'
import { buildDefaultMediaPlan } from '../types'
import sceneCatalog from '@/schema/scene-catalog.json'

const CATALOG = sceneCatalog.scenes.framework

export function createFrameworkBlueprint(
  content: FrameworkContent,
  ctx: ResolveContext
): SceneBlueprint {
  // Dynamic elements: each item generates number-display + body-text(title) + optional body-text(desc)
  const itemElements: VCLElement[] = content.items.flatMap((item, index) => {
    const els: VCLElement[] = [
      {
        id: `framework-items-${index}-number`,
        type: 'number-display',
        props: {
          value: item.number,
          layer: CATALOG.layers.items,
          tokenRef: 'typeScale.headlineS',
          variant: 'accent',
          index,
        },
      },
      {
        id: `framework-items-${index}-title`,
        type: 'body-text',
        props: {
          text: item.title,
          layer: CATALOG.layers.items,
          tokenRef: 'typeScale.bodyL',
          weight: 'bold',
          index,
        },
      },
    ]

    if (item.description) {
      els.push({
        id: `framework-items-${index}-description`,
        type: 'body-text',
        props: {
          text: item.description,
          layer: CATALOG.layers.items,
          tokenRef: 'typeScale.bodyS',
          color: 'textMuted',
          index,
        },
      })
    }

    if (item.iconId) {
      els.push({
        id: `framework-items-${index}-icon`,
        type: 'icon',
        props: {
          iconId: item.iconId,
          layer: CATALOG.layers.items,
          index,
        },
      })
    }

    return els
  })

  const elements: VCLElement[] = [
    {
      id: 'framework-texture',
      type: 'texture-overlay',
      props: { layer: CATALOG.layers.texture },
    },
    {
      id: 'framework-frameworkLabel',
      type: 'label',
      props: {
        text: content.frameworkLabel,
        layer: CATALOG.layers.frameworkLabel,
        tokenRef: 'typeScale.headlineS',
        color: 'signal',
      },
    },
    ...itemElements,
    // Optional connectors
    ...(content.showConnectors
      ? [{
          id: 'framework-connectors',
          type: 'divider' as const,
          props: {
            layer: CATALOG.layers.connectors,
            role: 'item-connector',
            dotted: true,
          },
        }]
      : []),
  ]

  return {
    id: `preset-framework-${ctx.from}`,
    intent: `Framework grid with ${content.items.length} item(s) in stagger-clockwise reveal`,
    origin: 'preset',
    layout: CATALOG.layoutArchetype as 'grid-expand',
    elements,
    choreography: 'stagger-clockwise',
    motionPreset: CATALOG.motionPreset as 'smooth',
    format: ctx.format,
    theme: ctx.theme,
    from: ctx.from,
    durationFrames: ctx.durationFrames ?? CATALOG.durationFramesDefault,
    mediaPlan: buildDefaultMediaPlan(ctx.narrationText, ctx),
  }
}
