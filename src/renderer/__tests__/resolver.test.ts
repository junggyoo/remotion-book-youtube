import { resolvePresetBlueprint } from '../resolvePresetBlueprint'
import { mockResolveContext, MINIMAL_CONTENT_FIXTURES } from './testHelpers'
import type { TypedScene } from '@/types'

function makeScene(type: string, content: unknown): TypedScene {
  return {
    id: `test-${type}`,
    type: type as TypedScene['type'],
    content,
  } as TypedScene
}

describe('resolvePresetBlueprint', () => {
  it('returns SceneBlueprint for cover', () => {
    const scene = makeScene('cover', MINIMAL_CONTENT_FIXTURES.cover)
    const result = resolvePresetBlueprint(scene, mockResolveContext())
    expect(result).not.toBeNull()
    expect(result!.origin).toBe('preset')
  })

  it.each([
    'cover', 'chapterDivider', 'keyInsight', 'compareContrast',
    'quote', 'framework', 'application', 'data', 'closing',
  ])('returns non-null for core type: %s', (type) => {
    const scene = makeScene(type, MINIMAL_CONTENT_FIXTURES[type])
    const result = resolvePresetBlueprint(scene, mockResolveContext())
    expect(result).not.toBeNull()
  })

  it('returns null for timeline (newer type without catalog entry)', () => {
    const scene = makeScene('timeline', { timelineLabel: 'T', events: [] })
    const result = resolvePresetBlueprint(scene, mockResolveContext())
    expect(result).toBeNull()
  })

  it('returns null for highlight', () => {
    const scene = makeScene('highlight', { mainText: 'text' })
    const result = resolvePresetBlueprint(scene, mockResolveContext())
    expect(result).toBeNull()
  })

  it('throws when format is "both"', () => {
    const scene = makeScene('cover', MINIMAL_CONTENT_FIXTURES.cover)
    const ctx = { ...mockResolveContext(), format: 'both' as 'longform' }
    expect(() => resolvePresetBlueprint(scene, ctx)).toThrow(
      'format "both" is not allowed in ResolveContext'
    )
  })

  it('uses scene.narrationText when ctx.narrationText is not provided', () => {
    const scene = {
      ...makeScene('cover', MINIMAL_CONTENT_FIXTURES.cover),
      narrationText: 'Scene narration',
    }
    const ctx = { ...mockResolveContext(), narrationText: undefined }
    const result = resolvePresetBlueprint(scene, ctx)
    expect(result!.mediaPlan.narrationText).toBe('Scene narration')
  })

  it('prefers ctx.narrationText over scene.narrationText', () => {
    const scene = {
      ...makeScene('cover', MINIMAL_CONTENT_FIXTURES.cover),
      narrationText: 'Scene narration',
    }
    const ctx = mockResolveContext({ narrationText: 'Context narration' })
    const result = resolvePresetBlueprint(scene, ctx)
    expect(result!.mediaPlan.narrationText).toBe('Context narration')
  })

  it('falls back to empty string when no narrationText in ctx or scene', () => {
    const scene = makeScene('cover', MINIMAL_CONTENT_FIXTURES.cover)
    const ctx = { ...mockResolveContext(), narrationText: undefined }
    const result = resolvePresetBlueprint(scene, ctx)
    expect(result!.mediaPlan.narrationText).toBe('')
  })

  it('applies layoutArchetypeOverride from scene', () => {
    const scene = {
      ...makeScene('cover', MINIMAL_CONTENT_FIXTURES.cover),
      layoutArchetypeOverride: 'left-anchor' as const,
    }
    const result = resolvePresetBlueprint(scene, mockResolveContext())
    expect(result!.layout).toBe('left-anchor')
  })

  it('applies motionPresetOverride from scene', () => {
    const scene = {
      ...makeScene('cover', MINIMAL_CONTENT_FIXTURES.cover),
      motionPresetOverride: 'gentle' as const,
    }
    const result = resolvePresetBlueprint(scene, mockResolveContext())
    expect(result!.motionPreset).toBe('gentle')
  })

  it('applies durationFrames override from scene', () => {
    const scene = {
      ...makeScene('cover', MINIMAL_CONTENT_FIXTURES.cover),
      durationFrames: 300,
    }
    const result = resolvePresetBlueprint(scene, mockResolveContext())
    expect(result!.durationFrames).toBe(300)
  })

  it('every returned blueprint has a valid mediaPlan', () => {
    const scene = makeScene('keyInsight', MINIMAL_CONTENT_FIXTURES.keyInsight)
    const result = resolvePresetBlueprint(scene, mockResolveContext())
    expect(result!.mediaPlan.captionPlan).toBeDefined()
    expect(result!.mediaPlan.audioPlan).toBeDefined()
    expect(result!.mediaPlan.assetPlan).toBeDefined()
  })
})
