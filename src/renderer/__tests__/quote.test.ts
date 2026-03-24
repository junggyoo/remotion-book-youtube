import { createQuoteBlueprint } from '../presetBlueprints/core/quote'
import { mockResolveContext, MINIMAL_CONTENT_FIXTURES } from './testHelpers'
import type { QuoteContent } from '@/types'

const minimalContent = MINIMAL_CONTENT_FIXTURES.quote as QuoteContent

describe('createQuoteBlueprint', () => {
  it('returns a valid SceneBlueprint matching snapshot', () => {
    const blueprint = createQuoteBlueprint(minimalContent, mockResolveContext())
    expect(blueprint).toMatchSnapshot()
  })

  it('includes mediaPlan with all 4 sections', () => {
    const blueprint = createQuoteBlueprint(minimalContent, mockResolveContext())
    expect(blueprint.mediaPlan.narrationText).toBeDefined()
    expect(blueprint.mediaPlan.captionPlan.mode).toBe('sentence-by-sentence')
    expect(blueprint.mediaPlan.audioPlan.ttsEngine).toBeDefined()
    expect(blueprint.mediaPlan.assetPlan.fallbackMode).toBe('text-only')
  })

  it('sets origin to preset', () => {
    const blueprint = createQuoteBlueprint(minimalContent, mockResolveContext())
    expect(blueprint.origin).toBe('preset')
  })

  it('handles empty narrationText', () => {
    const ctx = mockResolveContext({ narrationText: '' })
    const blueprint = createQuoteBlueprint(minimalContent, ctx)
    expect(blueprint.mediaPlan.narrationText).toBe('')
  })

  it('uses quote-hold layout', () => {
    const blueprint = createQuoteBlueprint(minimalContent, mockResolveContext())
    expect(blueprint.layout).toBe('quote-hold')
  })

  it('includes quoteMark, quoteText, and attribution elements', () => {
    const blueprint = createQuoteBlueprint(minimalContent, mockResolveContext())
    expect(blueprint.elements.find(e => e.id === 'quote-quoteMark')).toBeDefined()
    expect(blueprint.elements.find(e => e.id === 'quote-quoteText')).toBeDefined()
    expect(blueprint.elements.find(e => e.id === 'quote-attribution')).toBeDefined()
  })

  it('uses serif tokenRef when useSerif is true', () => {
    const content: QuoteContent = { ...minimalContent, useSerif: true }
    const blueprint = createQuoteBlueprint(content, mockResolveContext())
    const quoteEl = blueprint.elements.find(e => e.id === 'quote-quoteText')
    expect(quoteEl?.props.tokenRef).toBe('typography.fontFamily.serif')
    expect(quoteEl?.props.useSerif).toBe(true)
  })

  it('uses default typeScale tokenRef when useSerif is false', () => {
    const content: QuoteContent = { ...minimalContent, useSerif: false }
    const blueprint = createQuoteBlueprint(content, mockResolveContext())
    const quoteEl = blueprint.elements.find(e => e.id === 'quote-quoteText')
    expect(quoteEl?.props.tokenRef).toBe('typeScale.headlineM')
    expect(quoteEl?.props.useSerif).toBe(false)
  })

  it('uses durationFrames from context', () => {
    const ctx = mockResolveContext({ durationFrames: 120 })
    const blueprint = createQuoteBlueprint(minimalContent, ctx)
    expect(blueprint.durationFrames).toBe(120)
  })
})
