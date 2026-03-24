import { createApplicationBlueprint } from '../presetBlueprints/core/application'
import { mockResolveContext, MINIMAL_CONTENT_FIXTURES } from './testHelpers'
import type { ApplicationContent } from '@/types'

const minimalContent = MINIMAL_CONTENT_FIXTURES.application as ApplicationContent

describe('createApplicationBlueprint', () => {
  it('returns a valid SceneBlueprint matching snapshot', () => {
    const blueprint = createApplicationBlueprint(minimalContent, mockResolveContext())
    expect(blueprint).toMatchSnapshot()
  })

  it('includes mediaPlan with all 4 sections', () => {
    const blueprint = createApplicationBlueprint(minimalContent, mockResolveContext())
    expect(blueprint.mediaPlan.narrationText).toBeDefined()
    expect(blueprint.mediaPlan.captionPlan.mode).toBe('sentence-by-sentence')
    expect(blueprint.mediaPlan.audioPlan.ttsEngine).toBeDefined()
    expect(blueprint.mediaPlan.assetPlan.fallbackMode).toBe('text-only')
  })

  it('sets origin to preset', () => {
    const blueprint = createApplicationBlueprint(minimalContent, mockResolveContext())
    expect(blueprint.origin).toBe('preset')
  })

  it('handles empty narrationText', () => {
    const ctx = mockResolveContext({ narrationText: '' })
    const blueprint = createApplicationBlueprint(minimalContent, ctx)
    expect(blueprint.mediaPlan.narrationText).toBe('')
  })

  it('uses layout map-flow and choreography path-trace', () => {
    const blueprint = createApplicationBlueprint(minimalContent, mockResolveContext())
    expect(blueprint.layout).toBe('map-flow')
    expect(blueprint.choreography).toBe('path-trace')
  })

  it('includes anchorStatement headline element', () => {
    const blueprint = createApplicationBlueprint(minimalContent, mockResolveContext())
    expect(blueprint.elements.find(e => e.id === 'application-anchorStatement')).toBeDefined()
  })

  it('generates correct number of step title elements for 3 steps', () => {
    const blueprint = createApplicationBlueprint(minimalContent, mockResolveContext())
    // 3 steps × 1 title element each = 3
    const stepTitleEls = blueprint.elements.filter(e => e.id.match(/application-steps-\d+-title/))
    expect(stepTitleEls).toHaveLength(3)
  })

  it('generates detail caption element only for steps with detail', () => {
    const content: ApplicationContent = {
      anchorStatement: 'How to apply',
      steps: [
        { title: 'Step One', detail: 'Detail one' },
        { title: 'Step Two' },
      ],
    }
    const blueprint = createApplicationBlueprint(content, mockResolveContext())
    expect(blueprint.elements.find(e => e.id === 'application-steps-0-detail')).toBeDefined()
    expect(blueprint.elements.find(e => e.id === 'application-steps-1-detail')).toBeUndefined()
  })

  it('generates correct element count for 1 step', () => {
    const content: ApplicationContent = {
      anchorStatement: 'Single step',
      steps: [{ title: 'Only Step' }],
    }
    const blueprint = createApplicationBlueprint(content, mockResolveContext())
    const stepEls = blueprint.elements.filter(e => e.id.startsWith('application-steps-'))
    expect(stepEls).toHaveLength(1) // title only
  })

  it('generates correct element count for 4 steps (max)', () => {
    const content: ApplicationContent = {
      anchorStatement: 'Max steps',
      steps: Array.from({ length: 4 }, (_, i) => ({ title: `Step ${i + 1}` })),
    }
    const blueprint = createApplicationBlueprint(content, mockResolveContext())
    const stepEls = blueprint.elements.filter(e => e.id.match(/application-steps-\d+-title/))
    expect(stepEls).toHaveLength(4)
  })

  it('includes paths shape element only when showPaths is true', () => {
    const with_ = createApplicationBlueprint(
      { ...minimalContent, showPaths: true },
      mockResolveContext()
    )
    const without = createApplicationBlueprint(minimalContent, mockResolveContext())
    expect(with_.elements.find(e => e.id === 'application-paths')).toBeDefined()
    expect(without.elements.find(e => e.id === 'application-paths')).toBeUndefined()
  })

  it('includes checkmarks element only when showCheckmarks is true', () => {
    const with_ = createApplicationBlueprint(
      { ...minimalContent, showCheckmarks: true },
      mockResolveContext()
    )
    const without = createApplicationBlueprint(minimalContent, mockResolveContext())
    expect(with_.elements.find(e => e.id === 'application-emphasis')).toBeDefined()
    expect(without.elements.find(e => e.id === 'application-emphasis')).toBeUndefined()
  })

  it('uses durationFrames from context', () => {
    const ctx = mockResolveContext({ durationFrames: 120 })
    const blueprint = createApplicationBlueprint(minimalContent, ctx)
    expect(blueprint.durationFrames).toBe(120)
  })
})
