// ============================================================
// application preset blueprint factory
// Layout: map-flow | Choreography: path-trace
// ============================================================

import type { ApplicationContent, SceneBlueprint, VCLElement } from '@/types'
import type { ResolveContext } from '../types'
import { buildDefaultMediaPlan } from '../types'
import sceneCatalog from '@/schema/scene-catalog.json'

const CATALOG = sceneCatalog.scenes.application

export function createApplicationBlueprint(
  content: ApplicationContent,
  ctx: ResolveContext
): SceneBlueprint {
  // Dynamic step elements
  const stepElements: VCLElement[] = content.steps.flatMap((step, index) => {
    const els: VCLElement[] = [
      {
        id: `application-steps-${index}-title`,
        type: 'body-text',
        props: {
          text: step.title,
          layer: CATALOG.layers.steps,
          tokenRef: 'typeScale.bodyL',
          weight: 'bold',
          index,
        },
      },
    ]

    if (step.detail) {
      els.push({
        id: `application-steps-${index}-detail`,
        type: 'caption',
        props: {
          text: step.detail,
          layer: CATALOG.layers.steps,
          tokenRef: 'typeScale.bodyS',
          color: 'textMuted',
          index,
        },
      })
    }

    if (step.iconId) {
      els.push({
        id: `application-steps-${index}-icon`,
        type: 'icon',
        props: {
          iconId: step.iconId,
          layer: CATALOG.layers.steps,
          index,
        },
      })
    }

    return els
  })

  const elements: VCLElement[] = [
    {
      id: 'application-texture',
      type: 'texture-overlay',
      props: { layer: CATALOG.layers.texture },
    },
    {
      id: 'application-anchorStatement',
      type: 'headline',
      props: {
        text: content.anchorStatement,
        layer: CATALOG.layers.anchorStatement,
        tokenRef: 'typeScale.headlineM',
        weight: 'bold',
      },
    },
    ...stepElements,
    // Optional path connectors between steps
    ...(content.showPaths
      ? [{
          id: 'application-paths',
          type: 'shape' as const,
          props: {
            role: 'path-connector',
            layer: CATALOG.layers.paths,
            orientation: 'vertical',
          },
        }]
      : []),
    // Optional checkmarks (emphasis layer)
    ...(content.showCheckmarks
      ? [{
          id: 'application-emphasis',
          type: 'icon' as const,
          props: {
            role: 'checkmark',
            layer: CATALOG.layers.emphasis,
          },
        }]
      : []),
  ]

  return {
    id: `preset-application-${ctx.from}`,
    intent: `Application flow with ${content.steps.length} step(s) in path-trace reveal`,
    origin: 'preset',
    layout: CATALOG.layoutArchetype as 'map-flow',
    elements,
    choreography: 'path-trace',
    motionPreset: CATALOG.motionPreset as 'smooth',
    format: ctx.format,
    theme: ctx.theme,
    from: ctx.from,
    durationFrames: ctx.durationFrames ?? CATALOG.durationFramesDefault,
    mediaPlan: buildDefaultMediaPlan(ctx.narrationText, ctx),
  }
}
