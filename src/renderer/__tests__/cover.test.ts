import { createCoverBlueprint } from '../presetBlueprints/core/cover'
import { mockResolveContext } from './testHelpers'

describe('createCoverBlueprint', () => {
  const content = {
    title: 'Test Book Title',
    author: 'Test Author',
    coverImageUrl: '/covers/test.jpg',
  }

  it('returns a valid SceneBlueprint matching snapshot', () => {
    const blueprint = createCoverBlueprint(content, mockResolveContext())
    expect(blueprint).toMatchSnapshot()
  })

  it('includes mediaPlan with all 4 sections', () => {
    const blueprint = createCoverBlueprint(content, mockResolveContext())
    expect(blueprint.mediaPlan.narrationText).toBeDefined()
    expect(blueprint.mediaPlan.captionPlan.mode).toBe('sentence-by-sentence')
    expect(blueprint.mediaPlan.audioPlan.ttsEngine).toBeDefined()
    expect(blueprint.mediaPlan.assetPlan.fallbackMode).toBe('text-only')
  })

  it('sets origin to preset', () => {
    const blueprint = createCoverBlueprint(content, mockResolveContext())
    expect(blueprint.origin).toBe('preset')
  })

  it('handles empty narrationText', () => {
    const ctx = mockResolveContext({ narrationText: '' })
    const blueprint = createCoverBlueprint(content, ctx)
    expect(blueprint.mediaPlan.narrationText).toBe('')
  })

  it('generates conditional subtitle element only when present', () => {
    const withSub = createCoverBlueprint(
      { ...content, subtitle: 'A subtitle' },
      mockResolveContext()
    )
    const withoutSub = createCoverBlueprint(content, mockResolveContext())
    expect(withSub.elements.find(e => e.id === 'cover-subtitle')).toBeDefined()
    expect(withoutSub.elements.find(e => e.id === 'cover-subtitle')).toBeUndefined()
  })

  it('layout is center-focus from catalog', () => {
    const blueprint = createCoverBlueprint(content, mockResolveContext())
    expect(blueprint.layout).toBe('center-focus')
  })

  it('motionPreset is dramatic from catalog', () => {
    const blueprint = createCoverBlueprint(content, mockResolveContext())
    expect(blueprint.motionPreset).toBe('dramatic')
  })

  it('includes texture-overlay, image, headline, body-text, and label elements', () => {
    const blueprint = createCoverBlueprint(content, mockResolveContext())
    const types = blueprint.elements.map(e => e.type)
    expect(types).toContain('texture-overlay')
    expect(types).toContain('image')
    expect(types).toContain('headline')
    expect(types).toContain('body-text')
    expect(types).toContain('label')
  })

  it('uses brandLabel content field when provided', () => {
    const blueprint = createCoverBlueprint(
      { ...content, brandLabel: 'Custom Brand' },
      mockResolveContext()
    )
    const brandEl = blueprint.elements.find(e => e.id === 'cover-brandLabel')
    expect(brandEl?.props.text).toBe('Custom Brand')
  })

  it('falls back to Editorial Signal when brandLabel is not provided', () => {
    const blueprint = createCoverBlueprint(content, mockResolveContext())
    const brandEl = blueprint.elements.find(e => e.id === 'cover-brandLabel')
    expect(brandEl?.props.text).toBe('Editorial Signal')
  })
})
