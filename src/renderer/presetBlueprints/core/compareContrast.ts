// ============================================================
// compareContrast preset blueprint factory
// Layout: split-compare | Choreography: split-reveal
// ============================================================

import type { CompareContrastContent, SceneBlueprint, VCLElement } from '@/types'
import type { ResolveContext } from '../types'
import { buildDefaultMediaPlan } from '../types'
import sceneCatalog from '@/schema/scene-catalog.json'

const CATALOG = sceneCatalog.scenes.compareContrast

export function createCompareContrastBlueprint(
  content: CompareContrastContent,
  ctx: ResolveContext
): SceneBlueprint {
  const elements: VCLElement[] = [
    {
      id: 'compareContrast-texture',
      type: 'texture-overlay',
      props: { layer: CATALOG.layers.texture },
    },
    // Left panel container
    {
      id: 'compareContrast-leftPanel',
      type: 'container',
      props: {
        layer: CATALOG.layers.leftPanel,
        side: 'left',
      },
    },
    // Right panel container
    {
      id: 'compareContrast-rightPanel',
      type: 'container',
      props: {
        layer: CATALOG.layers.rightPanel,
        side: 'right',
      },
    },
    // Center divider
    {
      id: 'compareContrast-divider',
      type: 'divider',
      props: {
        layer: CATALOG.layers.divider,
        orientation: 'vertical',
      },
    },
    // Left label
    {
      id: 'compareContrast-labels-left',
      type: 'label',
      props: {
        text: content.leftLabel,
        layer: CATALOG.layers.labels,
        tokenRef: 'typeScale.label',
        variant: 'accent',
      },
    },
    // Right label
    {
      id: 'compareContrast-labels-right',
      type: 'label',
      props: {
        text: content.rightLabel,
        layer: CATALOG.layers.labels,
        tokenRef: 'typeScale.label',
        variant: 'signal',
      },
    },
    // Left content body text
    {
      id: 'compareContrast-leftPanel-content',
      type: 'body-text',
      props: {
        text: content.leftContent,
        layer: CATALOG.layers.leftPanel,
        tokenRef: 'typeScale.bodyL',
      },
    },
    // Right content body text
    {
      id: 'compareContrast-rightPanel-content',
      type: 'body-text',
      props: {
        text: content.rightContent,
        layer: CATALOG.layers.rightPanel,
        tokenRef: 'typeScale.bodyL',
      },
    },
    // Optional left tag
    ...(content.leftTag
      ? [{
          id: 'compareContrast-labels-leftTag',
          type: 'label' as const,
          props: {
            text: content.leftTag,
            layer: CATALOG.layers.labels,
            tokenRef: 'typeScale.label',
            variant: 'accent',
            role: 'tag',
          },
        }]
      : []),
    // Optional right tag
    ...(content.rightTag
      ? [{
          id: 'compareContrast-labels-rightTag',
          type: 'label' as const,
          props: {
            text: content.rightTag,
            layer: CATALOG.layers.labels,
            tokenRef: 'typeScale.label',
            variant: 'signal',
            role: 'tag',
          },
        }]
      : []),
    // Optional emphasis connector (VS)
    ...(content.showConnector
      ? [{
          id: 'compareContrast-emphasis',
          type: 'label' as const,
          props: {
            text: 'VS',
            layer: CATALOG.layers.emphasis,
            tokenRef: 'typeScale.label',
            role: 'connector',
          },
        }]
      : []),
  ]

  return {
    id: `preset-compareContrast-${ctx.from}`,
    intent: 'Side-by-side comparison with left/right panels and optional tags',
    origin: 'preset',
    layout: CATALOG.layoutArchetype as 'split-compare',
    elements,
    choreography: 'split-reveal',
    motionPreset: CATALOG.motionPreset as 'smooth',
    format: ctx.format,
    theme: ctx.theme,
    from: ctx.from,
    durationFrames: ctx.durationFrames ?? CATALOG.durationFramesDefault,
    mediaPlan: buildDefaultMediaPlan(ctx.narrationText, ctx),
  }
}
