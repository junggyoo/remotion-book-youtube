import { createKeyInsightBlueprint } from '../presetBlueprints/core/keyInsight'
import { mockResolveContext, MINIMAL_CONTENT_FIXTURES } from './testHelpers'
import type { KeyInsightContent } from '@/types'

const minimalContent = MINIMAL_CONTENT_FIXTURES.keyInsight as KeyInsightContent

describe('createKeyInsightBlueprint', () => {
  it('returns a valid SceneBlueprint matching snapshot', () => {
    const blueprint = createKeyInsightBlueprint(minimalContent, mockResolveContext())
    expect(blueprint).toMatchSnapshot()
  })

  it('includes mediaPlan with all 4 sections', () => {
    const blueprint = createKeyInsightBlueprint(minimalContent, mockResolveContext())
    expect(blueprint.mediaPlan.narrationText).toBeDefined()
    expect(blueprint.mediaPlan.captionPlan.mode).toBe('sentence-by-sentence')
    expect(blueprint.mediaPlan.audioPlan.ttsEngine).toBeDefined()
    expect(blueprint.mediaPlan.assetPlan.fallbackMode).toBe('text-only')
  })

  it('sets origin to preset', () => {
    const blueprint = createKeyInsightBlueprint(minimalContent, mockResolveContext())
    expect(blueprint.origin).toBe('preset')
  })

  it('handles empty narrationText', () => {
    const ctx = mockResolveContext({ narrationText: '' })
    const blueprint = createKeyInsightBlueprint(minimalContent, ctx)
    expect(blueprint.mediaPlan.narrationText).toBe('')
  })

  it('includes signalBar by default', () => {
    const blueprint = createKeyInsightBlueprint(minimalContent, mockResolveContext())
    expect(blueprint.elements.find(e => e.id === 'keyInsight-signalBar')).toBeDefined()
  })

  it('excludes signalBar when useSignalBar is false', () => {
    const content: KeyInsightContent = { ...minimalContent, useSignalBar: false }
    const blueprint = createKeyInsightBlueprint(content, mockResolveContext())
    expect(blueprint.elements.find(e => e.id === 'keyInsight-signalBar')).toBeUndefined()
  })

  it('includes supportText element only when present', () => {
    const withSupport = createKeyInsightBlueprint(
      { ...minimalContent, supportText: 'Additional context' },
      mockResolveContext()
    )
    const withoutSupport = createKeyInsightBlueprint(minimalContent, mockResolveContext())
    expect(withSupport.elements.find(e => e.id === 'keyInsight-supportText')).toBeDefined()
    expect(withoutSupport.elements.find(e => e.id === 'keyInsight-supportText')).toBeUndefined()
  })

  it('passes underlineKeyword to headline element props', () => {
    const content: KeyInsightContent = { ...minimalContent, underlineKeyword: 'insight' }
    const blueprint = createKeyInsightBlueprint(content, mockResolveContext())
    const headlineEl = blueprint.elements.find(e => e.id === 'keyInsight-headline')
    expect(headlineEl?.props.underlineKeyword).toBe('insight')
  })

  it('uses durationFrames from context', () => {
    const ctx = mockResolveContext({ durationFrames: 90 })
    const blueprint = createKeyInsightBlueprint(minimalContent, ctx)
    expect(blueprint.durationFrames).toBe(90)
  })
})
