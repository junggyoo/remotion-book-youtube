import { presetBlueprintRegistry, hasPresetBlueprint } from '../presetBlueprints'

describe('presetBlueprintRegistry', () => {
  it('has exactly 9 core scene types', () => {
    expect(Object.keys(presetBlueprintRegistry)).toHaveLength(9)
  })

  it('contains all 9 core scene types', () => {
    const types = Object.keys(presetBlueprintRegistry)
    expect(types).toContain('cover')
    expect(types).toContain('chapterDivider')
    expect(types).toContain('keyInsight')
    expect(types).toContain('compareContrast')
    expect(types).toContain('quote')
    expect(types).toContain('framework')
    expect(types).toContain('application')
    expect(types).toContain('data')
    expect(types).toContain('closing')
  })

  it('all registry values are functions', () => {
    for (const factory of Object.values(presetBlueprintRegistry)) {
      expect(typeof factory).toBe('function')
    }
  })
})

describe('hasPresetBlueprint', () => {
  it('returns true for cover', () => {
    expect(hasPresetBlueprint('cover')).toBe(true)
  })

  it('returns true for all 9 core scene types', () => {
    const coreTypes = [
      'cover', 'chapterDivider', 'keyInsight', 'compareContrast',
      'quote', 'framework', 'application', 'data', 'closing',
    ]
    for (const type of coreTypes) {
      expect(hasPresetBlueprint(type)).toBe(true)
    }
  })

  it('returns false for timeline (newer type without catalog entry)', () => {
    expect(hasPresetBlueprint('timeline')).toBe(false)
  })

  it('returns false for highlight', () => {
    expect(hasPresetBlueprint('highlight')).toBe(false)
  })

  it('returns false for transition', () => {
    expect(hasPresetBlueprint('transition')).toBe(false)
  })

  it('returns false for listReveal', () => {
    expect(hasPresetBlueprint('listReveal')).toBe(false)
  })

  it('returns false for splitQuote', () => {
    expect(hasPresetBlueprint('splitQuote')).toBe(false)
  })

  it('returns false for unknown strings', () => {
    expect(hasPresetBlueprint('unknown')).toBe(false)
    expect(hasPresetBlueprint('')).toBe(false)
  })
})
