import { createDataBlueprint } from '../presetBlueprints/core/data'
import { mockResolveContext, MINIMAL_CONTENT_FIXTURES } from './testHelpers'
import type { DataContent } from '@/types'

const minimalContent = MINIMAL_CONTENT_FIXTURES.data as DataContent

describe('createDataBlueprint', () => {
  it('returns a valid SceneBlueprint matching snapshot', () => {
    const blueprint = createDataBlueprint(minimalContent, mockResolveContext())
    expect(blueprint).toMatchSnapshot()
  })

  it('includes mediaPlan with all 4 sections', () => {
    const blueprint = createDataBlueprint(minimalContent, mockResolveContext())
    expect(blueprint.mediaPlan.narrationText).toBeDefined()
    expect(blueprint.mediaPlan.captionPlan.mode).toBe('sentence-by-sentence')
    expect(blueprint.mediaPlan.audioPlan.ttsEngine).toBeDefined()
    expect(blueprint.mediaPlan.assetPlan.fallbackMode).toBe('text-only')
  })

  it('sets origin to preset', () => {
    const blueprint = createDataBlueprint(minimalContent, mockResolveContext())
    expect(blueprint.origin).toBe('preset')
  })

  it('handles empty narrationText', () => {
    const ctx = mockResolveContext({ narrationText: '' })
    const blueprint = createDataBlueprint(minimalContent, ctx)
    expect(blueprint.mediaPlan.narrationText).toBe('')
  })

  it('uses layout grid-expand and choreography count-up', () => {
    const blueprint = createDataBlueprint(minimalContent, mockResolveContext())
    expect(blueprint.layout).toBe('grid-expand')
    expect(blueprint.choreography).toBe('count-up')
  })

  it('includes dataLabel element', () => {
    const blueprint = createDataBlueprint(minimalContent, mockResolveContext())
    expect(blueprint.elements.find(e => e.id === 'data-dataLabel')).toBeDefined()
  })

  // chartType: bar → bar-chart element
  it('produces bar-chart VCL element for chartType bar', () => {
    const content: DataContent = { ...minimalContent, chartType: 'bar' }
    const blueprint = createDataBlueprint(content, mockResolveContext())
    const chart = blueprint.elements.find(e => e.id === 'data-chart')
    expect(chart?.type).toBe('bar-chart')
  })

  // chartType: line → line-chart element
  it('produces line-chart VCL element for chartType line', () => {
    const content: DataContent = { ...minimalContent, chartType: 'line' }
    const blueprint = createDataBlueprint(content, mockResolveContext())
    const chart = blueprint.elements.find(e => e.id === 'data-chart')
    expect(chart?.type).toBe('line-chart')
  })

  // chartType: compare with exactly 2 points → comparison-pair element
  it('produces comparison-pair VCL element for chartType compare with 2 data points', () => {
    const content: DataContent = {
      chartType: 'compare',
      dataLabel: 'Comparison',
      data: [
        { label: 'A', value: 10 },
        { label: 'B', value: 20 },
      ],
    }
    const blueprint = createDataBlueprint(content, mockResolveContext())
    const chart = blueprint.elements.find(e => e.id === 'data-chart')
    expect(chart?.type).toBe('comparison-pair')
  })

  // chartType: compare with wrong count → fallback to bar-chart
  it('falls back to bar-chart when chartType compare has wrong number of data points', () => {
    const content: DataContent = {
      chartType: 'compare',
      dataLabel: 'Comparison',
      data: [{ label: 'A', value: 10 }],
    }
    const blueprint = createDataBlueprint(content, mockResolveContext())
    const chart = blueprint.elements.find(e => e.id === 'data-chart')
    expect(chart?.type).toBe('bar-chart')
  })

  // chartType: stepFlow → stack element with stat-card children
  it('produces stack VCL element with stat-card children for chartType stepFlow', () => {
    const content: DataContent = { ...minimalContent, chartType: 'stepFlow' }
    const blueprint = createDataBlueprint(content, mockResolveContext())
    const chart = blueprint.elements.find(e => e.id === 'data-chart')
    expect(chart?.type).toBe('stack')
    const children = chart?.props.children as Array<{ type: string }>
    expect(children.every(c => c.type === 'stat-card')).toBe(true)
    expect(children).toHaveLength(minimalContent.data.length)
  })

  // chartType: matrix → grid element with stat-card children
  it('produces grid VCL element with stat-card children for chartType matrix', () => {
    const content: DataContent = { ...minimalContent, chartType: 'matrix' }
    const blueprint = createDataBlueprint(content, mockResolveContext())
    const chart = blueprint.elements.find(e => e.id === 'data-chart')
    expect(chart?.type).toBe('grid')
    const children = chart?.props.children as Array<{ type: string }>
    expect(children.every(c => c.type === 'stat-card')).toBe(true)
    expect(children).toHaveLength(minimalContent.data.length)
    expect(chart?.props.columns).toBe(2)
  })

  it('includes annotation element only when annotation is provided', () => {
    const with_ = createDataBlueprint(
      { ...minimalContent, annotation: 'Some note' },
      mockResolveContext()
    )
    const without = createDataBlueprint(minimalContent, mockResolveContext())
    expect(with_.elements.find(e => e.id === 'data-annotation')).toBeDefined()
    expect(without.elements.find(e => e.id === 'data-annotation')).toBeUndefined()
  })

  it('includes sourceCredit element only when sourceCredit is provided', () => {
    const with_ = createDataBlueprint(
      { ...minimalContent, sourceCredit: 'Source: Test' },
      mockResolveContext()
    )
    const without = createDataBlueprint(minimalContent, mockResolveContext())
    expect(with_.elements.find(e => e.id === 'data-sourceCredit')).toBeDefined()
    expect(without.elements.find(e => e.id === 'data-sourceCredit')).toBeUndefined()
  })

  it('uses durationFrames from context', () => {
    const ctx = mockResolveContext({ durationFrames: 90 })
    const blueprint = createDataBlueprint(minimalContent, ctx)
    expect(blueprint.durationFrames).toBe(90)
  })
})
