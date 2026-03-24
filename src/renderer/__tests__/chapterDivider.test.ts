import { createChapterDividerBlueprint } from '../presetBlueprints/core/chapterDivider'
import { mockResolveContext, MINIMAL_CONTENT_FIXTURES } from './testHelpers'
import type { ChapterDividerContent } from '@/types'

const minimalContent = MINIMAL_CONTENT_FIXTURES.chapterDivider as ChapterDividerContent

describe('createChapterDividerBlueprint', () => {
  it('returns a valid SceneBlueprint matching snapshot', () => {
    const blueprint = createChapterDividerBlueprint(minimalContent, mockResolveContext())
    expect(blueprint).toMatchSnapshot()
  })

  it('includes mediaPlan with all 4 sections', () => {
    const blueprint = createChapterDividerBlueprint(minimalContent, mockResolveContext())
    expect(blueprint.mediaPlan.narrationText).toBeDefined()
    expect(blueprint.mediaPlan.captionPlan.mode).toBe('sentence-by-sentence')
    expect(blueprint.mediaPlan.audioPlan.ttsEngine).toBeDefined()
    expect(blueprint.mediaPlan.assetPlan.fallbackMode).toBe('text-only')
  })

  it('sets origin to preset', () => {
    const blueprint = createChapterDividerBlueprint(minimalContent, mockResolveContext())
    expect(blueprint.origin).toBe('preset')
  })

  it('handles empty narrationText', () => {
    const ctx = mockResolveContext({ narrationText: '' })
    const blueprint = createChapterDividerBlueprint(minimalContent, ctx)
    expect(blueprint.mediaPlan.narrationText).toBe('')
  })

  it('uses default layout (left-anchor) when useAltLayout is not set', () => {
    const blueprint = createChapterDividerBlueprint(minimalContent, mockResolveContext())
    expect(blueprint.layout).toBe('left-anchor')
  })

  it('uses band-divider layout when useAltLayout is true', () => {
    const content: ChapterDividerContent = { ...minimalContent, useAltLayout: true }
    const blueprint = createChapterDividerBlueprint(content, mockResolveContext())
    expect(blueprint.layout).toBe('band-divider')
  })

  it('includes chapterSubtitle element only when present', () => {
    const withSub = createChapterDividerBlueprint(
      { ...minimalContent, chapterSubtitle: 'A subtitle' },
      mockResolveContext()
    )
    const withoutSub = createChapterDividerBlueprint(minimalContent, mockResolveContext())
    expect(withSub.elements.find(e => e.id === 'chapterDivider-baseContent')).toBeDefined()
    expect(withoutSub.elements.find(e => e.id === 'chapterDivider-baseContent')).toBeUndefined()
  })

  it('includes number-display and headline elements', () => {
    const blueprint = createChapterDividerBlueprint(minimalContent, mockResolveContext())
    expect(blueprint.elements.find(e => e.id === 'chapterDivider-chapterNumber')).toBeDefined()
    expect(blueprint.elements.find(e => e.id === 'chapterDivider-chapterTitle')).toBeDefined()
  })

  it('uses durationFrames from context', () => {
    const ctx = mockResolveContext({ durationFrames: 60 })
    const blueprint = createChapterDividerBlueprint(minimalContent, ctx)
    expect(blueprint.durationFrames).toBe(60)
  })
})
