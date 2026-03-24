import { createCompareContrastBlueprint } from '../presetBlueprints/core/compareContrast'
import { mockResolveContext, MINIMAL_CONTENT_FIXTURES } from './testHelpers'
import type { CompareContrastContent } from '@/types'

const minimalContent = MINIMAL_CONTENT_FIXTURES.compareContrast as CompareContrastContent

describe('createCompareContrastBlueprint', () => {
  it('returns a valid SceneBlueprint matching snapshot', () => {
    const blueprint = createCompareContrastBlueprint(minimalContent, mockResolveContext())
    expect(blueprint).toMatchSnapshot()
  })

  it('includes mediaPlan with all 4 sections', () => {
    const blueprint = createCompareContrastBlueprint(minimalContent, mockResolveContext())
    expect(blueprint.mediaPlan.narrationText).toBeDefined()
    expect(blueprint.mediaPlan.captionPlan.mode).toBe('sentence-by-sentence')
    expect(blueprint.mediaPlan.audioPlan.ttsEngine).toBeDefined()
    expect(blueprint.mediaPlan.assetPlan.fallbackMode).toBe('text-only')
  })

  it('sets origin to preset', () => {
    const blueprint = createCompareContrastBlueprint(minimalContent, mockResolveContext())
    expect(blueprint.origin).toBe('preset')
  })

  it('handles empty narrationText', () => {
    const ctx = mockResolveContext({ narrationText: '' })
    const blueprint = createCompareContrastBlueprint(minimalContent, ctx)
    expect(blueprint.mediaPlan.narrationText).toBe('')
  })

  it('uses layout split-compare and choreography split-reveal', () => {
    const blueprint = createCompareContrastBlueprint(minimalContent, mockResolveContext())
    expect(blueprint.layout).toBe('split-compare')
    expect(blueprint.choreography).toBe('split-reveal')
  })

  it('includes left and right panel containers and labels', () => {
    const blueprint = createCompareContrastBlueprint(minimalContent, mockResolveContext())
    const ids = blueprint.elements.map(e => e.id)
    expect(ids).toContain('compareContrast-leftPanel')
    expect(ids).toContain('compareContrast-rightPanel')
    expect(ids).toContain('compareContrast-labels-left')
    expect(ids).toContain('compareContrast-labels-right')
    expect(ids).toContain('compareContrast-divider')
  })

  it('includes leftTag element only when leftTag is provided', () => {
    const withTag = createCompareContrastBlueprint(
      { ...minimalContent, leftTag: 'before' },
      mockResolveContext()
    )
    const withoutTag = createCompareContrastBlueprint(minimalContent, mockResolveContext())
    expect(withTag.elements.find(e => e.id === 'compareContrast-labels-leftTag')).toBeDefined()
    expect(withoutTag.elements.find(e => e.id === 'compareContrast-labels-leftTag')).toBeUndefined()
  })

  it('includes rightTag element only when rightTag is provided', () => {
    const withTag = createCompareContrastBlueprint(
      { ...minimalContent, rightTag: 'after' },
      mockResolveContext()
    )
    const withoutTag = createCompareContrastBlueprint(minimalContent, mockResolveContext())
    expect(withTag.elements.find(e => e.id === 'compareContrast-labels-rightTag')).toBeDefined()
    expect(withoutTag.elements.find(e => e.id === 'compareContrast-labels-rightTag')).toBeUndefined()
  })

  it('includes emphasis connector only when showConnector is true', () => {
    const with_ = createCompareContrastBlueprint(
      { ...minimalContent, showConnector: true },
      mockResolveContext()
    )
    const without = createCompareContrastBlueprint(minimalContent, mockResolveContext())
    expect(with_.elements.find(e => e.id === 'compareContrast-emphasis')).toBeDefined()
    expect(without.elements.find(e => e.id === 'compareContrast-emphasis')).toBeUndefined()
  })

  it('uses durationFrames from context', () => {
    const ctx = mockResolveContext({ durationFrames: 90 })
    const blueprint = createCompareContrastBlueprint(minimalContent, ctx)
    expect(blueprint.durationFrames).toBe(90)
  })
})
