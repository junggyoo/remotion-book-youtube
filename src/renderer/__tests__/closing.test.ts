import { createClosingBlueprint } from '../presetBlueprints/core/closing'
import { mockResolveContext, MINIMAL_CONTENT_FIXTURES } from './testHelpers'
import type { ClosingContent } from '@/types'

const minimalContent = MINIMAL_CONTENT_FIXTURES.closing as ClosingContent

describe('createClosingBlueprint', () => {
  it('returns a valid SceneBlueprint matching snapshot', () => {
    const blueprint = createClosingBlueprint(minimalContent, mockResolveContext())
    expect(blueprint).toMatchSnapshot()
  })

  it('includes mediaPlan with all 4 sections', () => {
    const blueprint = createClosingBlueprint(minimalContent, mockResolveContext())
    expect(blueprint.mediaPlan.narrationText).toBeDefined()
    expect(blueprint.mediaPlan.captionPlan.mode).toBe('sentence-by-sentence')
    expect(blueprint.mediaPlan.audioPlan.ttsEngine).toBeDefined()
    expect(blueprint.mediaPlan.assetPlan.fallbackMode).toBe('text-only')
  })

  it('sets origin to preset', () => {
    const blueprint = createClosingBlueprint(minimalContent, mockResolveContext())
    expect(blueprint.origin).toBe('preset')
  })

  it('handles empty narrationText', () => {
    const ctx = mockResolveContext({ narrationText: '' })
    const blueprint = createClosingBlueprint(minimalContent, ctx)
    expect(blueprint.mediaPlan.narrationText).toBe('')
  })

  it('uses center-focus layout', () => {
    const blueprint = createClosingBlueprint(minimalContent, mockResolveContext())
    expect(blueprint.layout).toBe('center-focus')
  })

  it('includes brandLabel by default', () => {
    const blueprint = createClosingBlueprint(minimalContent, mockResolveContext())
    expect(blueprint.elements.find(e => e.id === 'closing-brandLabel')).toBeDefined()
  })

  it('excludes brandLabel when showBrandLabel is false', () => {
    const content: ClosingContent = { ...minimalContent, showBrandLabel: false }
    const blueprint = createClosingBlueprint(content, mockResolveContext())
    expect(blueprint.elements.find(e => e.id === 'closing-brandLabel')).toBeUndefined()
  })

  it('includes cta element only when ctaText is provided', () => {
    const withCta = createClosingBlueprint(
      { ...minimalContent, ctaText: 'Subscribe for more' },
      mockResolveContext()
    )
    const withoutCta = createClosingBlueprint(minimalContent, mockResolveContext())
    expect(withCta.elements.find(e => e.id === 'closing-cta')).toBeDefined()
    expect(withoutCta.elements.find(e => e.id === 'closing-cta')).toBeUndefined()
  })

  it('includes recapStatement headline element', () => {
    const blueprint = createClosingBlueprint(minimalContent, mockResolveContext())
    const el = blueprint.elements.find(e => e.id === 'closing-recapStatement')
    expect(el).toBeDefined()
    expect(el?.type).toBe('headline')
  })

  it('uses durationFrames from context', () => {
    const ctx = mockResolveContext({ durationFrames: 90 })
    const blueprint = createClosingBlueprint(minimalContent, ctx)
    expect(blueprint.durationFrames).toBe(90)
  })
})
