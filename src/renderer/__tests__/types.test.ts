// ============================================================
// Unit tests for buildDefaultMediaPlan
// ============================================================

import { buildDefaultMediaPlan } from '../presetBlueprints/types'
import { mockResolveContext } from './testHelpers'

describe('buildDefaultMediaPlan', () => {
  it('returns a complete MediaPlan with all 4 sections', () => {
    const plan = buildDefaultMediaPlan('Test narration.', mockResolveContext())
    expect(plan.narrationText).toBeDefined()
    expect(plan.captionPlan).toBeDefined()
    expect(plan.audioPlan).toBeDefined()
    expect(plan.assetPlan).toBeDefined()
  })

  it('passes narrationText through unchanged', () => {
    const plan = buildDefaultMediaPlan('Hello world.', mockResolveContext())
    expect(plan.narrationText).toBe('Hello world.')
  })

  it('returns valid MediaPlan when narrationText is empty string', () => {
    const plan = buildDefaultMediaPlan('', mockResolveContext())
    expect(plan.narrationText).toBe('')
    expect(plan.captionPlan.mode).toBe('sentence-by-sentence')
    expect(plan.audioPlan.ttsEngine).toBeDefined()
    expect(plan.assetPlan.fallbackMode).toBe('text-only')
  })

  it('uses default ttsEngine edge-tts when narrationConfig is absent', () => {
    const plan = buildDefaultMediaPlan('Text', mockResolveContext())
    expect(plan.audioPlan.ttsEngine).toBe('edge-tts')
  })

  it('uses narrationConfig.ttsEngine when provided', () => {
    const ctx = mockResolveContext({
      narrationConfig: { ttsEngine: 'elevenlabs', voiceKey: 'some-voice' },
    })
    const plan = buildDefaultMediaPlan('Text', ctx)
    expect(plan.audioPlan.ttsEngine).toBe('elevenlabs')
  })

  it('uses default voiceKey ko-KR-SunHiNeural when narrationConfig is absent', () => {
    const plan = buildDefaultMediaPlan('Text', mockResolveContext())
    expect(plan.audioPlan.voiceKey).toBe('ko-KR-SunHiNeural')
  })

  it('uses narrationConfig.voiceKey when provided', () => {
    const ctx = mockResolveContext({
      narrationConfig: { voiceKey: 'custom-voice' },
    })
    const plan = buildDefaultMediaPlan('Text', ctx)
    expect(plan.audioPlan.voiceKey).toBe('custom-voice')
  })

  it('uses default speed 1.0 when not provided', () => {
    const plan = buildDefaultMediaPlan('Text', mockResolveContext())
    expect(plan.audioPlan.speed).toBe(1.0)
  })

  it('uses default pitch +0Hz when not provided', () => {
    const plan = buildDefaultMediaPlan('Text', mockResolveContext())
    expect(plan.audioPlan.pitch).toBe('+0Hz')
  })

  it('uses default captionPlan values', () => {
    const plan = buildDefaultMediaPlan('Text', mockResolveContext())
    expect(plan.captionPlan.mode).toBe('sentence-by-sentence')
    expect(plan.captionPlan.maxCharsPerLine).toBe(28)
    expect(plan.captionPlan.maxLines).toBe(2)
    expect(plan.captionPlan.leadFrames).toBe(3)
    expect(plan.captionPlan.trailFrames).toBe(6)
    expect(plan.captionPlan.transitionStyle).toBe('fade-slide')
  })

  it('uses default assetPlan with empty required array and text-only fallback', () => {
    const plan = buildDefaultMediaPlan('Text', mockResolveContext())
    expect(plan.assetPlan.required).toEqual([])
    expect(plan.assetPlan.fallbackMode).toBe('text-only')
  })
})
