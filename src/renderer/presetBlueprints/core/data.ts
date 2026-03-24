// ============================================================
// data preset blueprint factory
// Layout: grid-expand | Choreography: count-up
// 5 chartType variants: bar, line, compare, stepFlow, matrix
// ============================================================

import type { DataContent, SceneBlueprint, VCLElement } from '@/types'
import type { ResolveContext } from '../types'
import { buildDefaultMediaPlan } from '../types'
import sceneCatalog from '@/schema/scene-catalog.json'

const CATALOG = sceneCatalog.scenes.data

function buildChartElement(content: DataContent): VCLElement {
  const { chartType, data, unit } = content

  switch (chartType) {
    case 'bar':
      return {
        id: 'data-chart',
        type: 'bar-chart',
        props: {
          data,
          unit,
          layer: CATALOG.layers.chart,
        },
      }

    case 'line':
      return {
        id: 'data-chart',
        type: 'line-chart',
        props: {
          data,
          unit,
          layer: CATALOG.layers.chart,
        },
      }

    case 'compare': {
      if (data.length !== 2) {
        console.warn(
          `[data blueprint] chartType "compare" expects exactly 2 data points, got ${data.length}. Falling back to bar-chart.`
        )
        return {
          id: 'data-chart',
          type: 'bar-chart',
          props: {
            data,
            unit,
            layer: CATALOG.layers.chart,
          },
        }
      }
      return {
        id: 'data-chart',
        type: 'comparison-pair',
        props: {
          data,
          unit,
          layer: CATALOG.layers.chart,
        },
      }
    }

    case 'stepFlow': {
      const statCards: VCLElement[] = data.map((point, i) => ({
        id: `data-chart-statcard-${i}`,
        type: 'stat-card' as const,
        props: {
          label: point.label,
          value: point.value,
          highlight: point.highlight ?? false,
          index: i,
        },
      }))
      return {
        id: 'data-chart',
        type: 'stack',
        props: {
          children: statCards,
          layer: CATALOG.layers.chart,
          direction: 'horizontal',
        },
      }
    }

    case 'matrix': {
      const statCards: VCLElement[] = data.map((point, i) => ({
        id: `data-chart-statcard-${i}`,
        type: 'stat-card' as const,
        props: {
          label: point.label,
          value: point.value,
          highlight: point.highlight ?? false,
          index: i,
        },
      }))
      return {
        id: 'data-chart',
        type: 'grid',
        props: {
          children: statCards,
          layer: CATALOG.layers.chart,
          columns: 2,
        },
      }
    }

    default: {
      console.warn(
        `[data blueprint] Unknown chartType "${chartType}". Falling back to bar-chart.`
      )
      return {
        id: 'data-chart',
        type: 'bar-chart',
        props: {
          data,
          unit,
          layer: CATALOG.layers.chart,
        },
      }
    }
  }
}

export function createDataBlueprint(
  content: DataContent,
  ctx: ResolveContext
): SceneBlueprint {
  const chartElement = buildChartElement(content)

  const elements: VCLElement[] = [
    {
      id: 'data-texture',
      type: 'texture-overlay',
      props: { layer: CATALOG.layers.texture },
    },
    {
      id: 'data-dataLabel',
      type: 'label',
      props: {
        text: content.dataLabel,
        layer: CATALOG.layers.dataLabel,
        tokenRef: 'typeScale.headlineS',
        color: 'signal',
        weight: 'semibold',
      },
    },
    chartElement,
    // Optional annotation
    ...(content.annotation
      ? [{
          id: 'data-annotation',
          type: 'caption' as const,
          props: {
            text: content.annotation,
            layer: CATALOG.layers.annotation,
            tokenRef: 'typeScale.bodyS',
            color: 'textMuted',
          },
        }]
      : []),
    // Optional source credit
    ...(content.sourceCredit
      ? [{
          id: 'data-sourceCredit',
          type: 'caption' as const,
          props: {
            text: content.sourceCredit,
            layer: CATALOG.layers.sourceCredit,
            tokenRef: 'typeScale.caption',
            color: 'textMuted',
          },
        }]
      : []),
  ]

  return {
    id: `preset-data-${ctx.from}`,
    intent: `Data visualization (${content.chartType}) with count-up animation`,
    origin: 'preset',
    layout: CATALOG.layoutArchetype as 'grid-expand',
    elements,
    choreography: 'count-up',
    motionPreset: CATALOG.motionPreset as 'smooth',
    format: ctx.format,
    theme: ctx.theme,
    from: ctx.from,
    durationFrames: ctx.durationFrames ?? CATALOG.durationFramesDefault,
    mediaPlan: buildDefaultMediaPlan(ctx.narrationText, ctx),
  }
}
