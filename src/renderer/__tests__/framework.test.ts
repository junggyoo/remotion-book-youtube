import { createFrameworkBlueprint } from '../presetBlueprints/core/framework'
import { mockResolveContext, MINIMAL_CONTENT_FIXTURES } from './testHelpers'
import type { FrameworkContent } from '@/types'

const minimalContent = MINIMAL_CONTENT_FIXTURES.framework as FrameworkContent

describe('createFrameworkBlueprint', () => {
  it('returns a valid SceneBlueprint matching snapshot', () => {
    const blueprint = createFrameworkBlueprint(minimalContent, mockResolveContext())
    expect(blueprint).toMatchSnapshot()
  })

  it('includes mediaPlan with all 4 sections', () => {
    const blueprint = createFrameworkBlueprint(minimalContent, mockResolveContext())
    expect(blueprint.mediaPlan.narrationText).toBeDefined()
    expect(blueprint.mediaPlan.captionPlan.mode).toBe('sentence-by-sentence')
    expect(blueprint.mediaPlan.audioPlan.ttsEngine).toBeDefined()
    expect(blueprint.mediaPlan.assetPlan.fallbackMode).toBe('text-only')
  })

  it('sets origin to preset', () => {
    const blueprint = createFrameworkBlueprint(minimalContent, mockResolveContext())
    expect(blueprint.origin).toBe('preset')
  })

  it('handles empty narrationText', () => {
    const ctx = mockResolveContext({ narrationText: '' })
    const blueprint = createFrameworkBlueprint(minimalContent, ctx)
    expect(blueprint.mediaPlan.narrationText).toBe('')
  })

  it('uses layout grid-expand and choreography stagger-clockwise', () => {
    const blueprint = createFrameworkBlueprint(minimalContent, mockResolveContext())
    expect(blueprint.layout).toBe('grid-expand')
    expect(blueprint.choreography).toBe('stagger-clockwise')
  })

  it('includes frameworkLabel element', () => {
    const blueprint = createFrameworkBlueprint(minimalContent, mockResolveContext())
    expect(blueprint.elements.find(e => e.id === 'framework-frameworkLabel')).toBeDefined()
  })

  it('generates correct number of item elements for 3 items (number + title per item)', () => {
    const blueprint = createFrameworkBlueprint(minimalContent, mockResolveContext())
    // 3 items × 2 elements each (number + title) = 6 item elements
    const itemEls = blueprint.elements.filter(e => e.id.startsWith('framework-items-'))
    expect(itemEls).toHaveLength(6)
  })

  it('generates description elements only for items with description', () => {
    const content: FrameworkContent = {
      frameworkLabel: 'Test',
      items: [
        { number: 1, title: 'Item One', description: 'Desc one' },
        { number: 2, title: 'Item Two' },
      ],
    }
    const blueprint = createFrameworkBlueprint(content, mockResolveContext())
    expect(blueprint.elements.find(e => e.id === 'framework-items-0-description')).toBeDefined()
    expect(blueprint.elements.find(e => e.id === 'framework-items-1-description')).toBeUndefined()
  })

  it('generates correct element count for 1 item', () => {
    const content: FrameworkContent = {
      frameworkLabel: 'Single',
      items: [{ number: 1, title: 'Only Item' }],
    }
    const blueprint = createFrameworkBlueprint(content, mockResolveContext())
    const itemEls = blueprint.elements.filter(e => e.id.startsWith('framework-items-'))
    expect(itemEls).toHaveLength(2) // number + title
  })

  it('generates correct element count for 5 items (max)', () => {
    const content: FrameworkContent = {
      frameworkLabel: 'Max',
      items: Array.from({ length: 5 }, (_, i) => ({ number: i + 1, title: `Item ${i + 1}` })),
    }
    const blueprint = createFrameworkBlueprint(content, mockResolveContext())
    const itemEls = blueprint.elements.filter(e => e.id.startsWith('framework-items-'))
    expect(itemEls).toHaveLength(10) // 5 × 2
  })

  it('includes connectors element only when showConnectors is true', () => {
    const with_ = createFrameworkBlueprint(
      { ...minimalContent, showConnectors: true },
      mockResolveContext()
    )
    const without = createFrameworkBlueprint(minimalContent, mockResolveContext())
    expect(with_.elements.find(e => e.id === 'framework-connectors')).toBeDefined()
    expect(without.elements.find(e => e.id === 'framework-connectors')).toBeUndefined()
  })

  it('uses durationFrames from context', () => {
    const ctx = mockResolveContext({ durationFrames: 120 })
    const blueprint = createFrameworkBlueprint(minimalContent, ctx)
    expect(blueprint.durationFrames).toBe(120)
  })
})
