import { describe, it, expect } from 'vitest'
import {
  createPlanningPolicy,
  createFormatPolicy,
  matchPresets,
  detectGaps,
  ScenePlanSchema,
} from '../index'
import { validateBookFingerprint } from '@/analyzer/bookAnalyzer'
import { planNarrative } from '@/analyzer/narrativePlanner'
import { composeOpening } from '@/analyzer/openingComposer'
import { useTheme } from '@/design/themes/useTheme'
import type { BookFingerprint, VideoNarrativePlan, HookStrategy } from '@/types'
import path from 'path'
import fs from 'fs'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MIRACLE_MORNING_PATH = path.resolve(
  __dirname, '..', '..', '..', '.claude', 'skills', 'book-analyze', 'examples', 'miracle-morning.json',
)
const miracleData = JSON.parse(fs.readFileSync(MIRACLE_MORNING_PATH, 'utf-8'))
const MIRACLE_FP: BookFingerprint = validateBookFingerprint(miracleData.bookFingerprint)
const MIRACLE_PLAN: VideoNarrativePlan = miracleData.videoNarrativePlan
const MIRACLE_THEME = useTheme('dark', 'selfHelp')
const MIRACLE_OPENING = composeOpening(MIRACLE_FP, { format: 'longform', theme: MIRACLE_THEME })

// ---------------------------------------------------------------------------
// 1. planningPolicy
// ---------------------------------------------------------------------------

describe('planningPolicy', () => {
  it('createPlanningPolicy() returns spec defaults', () => {
    const policy = createPlanningPolicy()
    expect(policy.presetConfidenceThreshold).toBe(0.7)
    expect(policy.minSignatureScenes).toBe(2)
    expect(policy.maxSynthesizedScenes).toBe(5)
    expect(policy.openingMustBeDynamic).toBe(true)
    expect(policy.formatPolicy.format).toBe('longform')
  })

  it('overrides work correctly', () => {
    const policy = createPlanningPolicy({ presetConfidenceThreshold: 0.5 })
    expect(policy.presetConfidenceThreshold).toBe(0.5)
    expect(policy.minSignatureScenes).toBe(2) // unchanged
  })

  it('createFormatPolicy shorts returns correct defaults', () => {
    const fp = createFormatPolicy('shorts')
    expect(fp.format).toBe('shorts')
    expect(fp.maxElementsPerScene).toBe(6)
    expect(fp.captionDensity).toBe('high')
    expect(fp.sceneCountRange).toEqual([1, 3])
  })

  it('createFormatPolicy longform returns correct defaults', () => {
    const fp = createFormatPolicy('longform')
    expect(fp.maxElementsPerScene).toBe(12)
    expect(fp.captionDensity).toBe('medium')
    expect(fp.openingDurationSecRange).toEqual([20, 35])
    expect(fp.sceneCountRange).toEqual([8, 14])
  })
})

// ---------------------------------------------------------------------------
// 2. scenePlanner — slot expansion
// ---------------------------------------------------------------------------

describe('scenePlanner — slot expansion', () => {
  const policy = createPlanningPolicy()

  it('opening segment is skipped', () => {
    const plan = matchPresets(MIRACLE_PLAN, MIRACLE_FP, MIRACLE_OPENING, policy)
    const openingMatches = plan.presetMatches.filter((m) => m.segment === 'opening')
    expect(openingMatches).toHaveLength(0)
  })

  it('closing segment maps to closing with confidence 1.0', () => {
    const plan = matchPresets(MIRACLE_PLAN, MIRACLE_FP, MIRACLE_OPENING, policy)
    const closingMatches = plan.presetMatches.filter((m) => m.segment === 'closing')
    expect(closingMatches).toHaveLength(1)
    expect(closingMatches[0].sceneType).toBe('closing')
    expect(closingMatches[0].confidence).toBe(1.0)
  })

  it('core segment produces >= 3 slots for 6 SAVERS concepts', () => {
    const plan = matchPresets(MIRACLE_PLAN, MIRACLE_FP, MIRACLE_OPENING, policy)
    const coreMatches = plan.presetMatches.filter((m) => m.segment === 'core')
    expect(coreMatches.length).toBeGreaterThanOrEqual(3)
  })

  it('total slots within reasonable range', () => {
    const plan = matchPresets(MIRACLE_PLAN, MIRACLE_FP, MIRACLE_OPENING, policy)
    expect(plan.totalSlots).toBeGreaterThanOrEqual(6)
    expect(plan.totalSlots).toBeLessThanOrEqual(14)
  })
})

// ---------------------------------------------------------------------------
// 3. scenePlanner — confidence scoring
// ---------------------------------------------------------------------------

describe('scenePlanner — confidence scoring', () => {
  const policy = createPlanningPolicy()

  it('framework preset scores high for SAVERS explanation', () => {
    const plan = matchPresets(MIRACLE_PLAN, MIRACLE_FP, MIRACLE_OPENING, policy)
    const coreMatches = plan.presetMatches.filter((m) => m.segment === 'core')
    const frameworkMatches = coreMatches.filter((m) => m.sceneType === 'framework')
    expect(frameworkMatches.length).toBeGreaterThanOrEqual(1)
    for (const m of frameworkMatches) {
      expect(m.confidence).toBeGreaterThan(0.5)
    }
  })

  it('all confidence scores are in [0, 1]', () => {
    const plan = matchPresets(MIRACLE_PLAN, MIRACLE_FP, MIRACLE_OPENING, policy)
    for (const m of plan.presetMatches) {
      expect(m.confidence).toBeGreaterThanOrEqual(0)
      expect(m.confidence).toBeLessThanOrEqual(1)
    }
  })

  it('each PresetMatch has ScoreBreakdown', () => {
    const plan = matchPresets(MIRACLE_PLAN, MIRACLE_FP, MIRACLE_OPENING, policy)
    for (const m of plan.presetMatches) {
      expect(m.scoreBreakdown).toBeDefined()
      expect(m.scoreBreakdown.delivery).toBeGreaterThanOrEqual(0)
      expect(m.scoreBreakdown.explanation.length).toBeGreaterThan(0)
    }
  })
})

// ---------------------------------------------------------------------------
// 4. gapDetector — question triggers
// ---------------------------------------------------------------------------

describe('gapDetector — question triggers', () => {
  const policy = createPlanningPolicy()

  it('Q1 triggers for SAVERS 순환 구조', () => {
    const plan = matchPresets(MIRACLE_PLAN, MIRACLE_FP, MIRACLE_OPENING, policy)
    const result = detectGaps(plan, MIRACLE_FP, MIRACLE_PLAN)
    const q1Gaps = result.gaps.filter((g) => g.gapReason.includes('Q1'))
    expect(q1Gaps.length).toBeGreaterThanOrEqual(1)
    expect(q1Gaps[0].requiredCapabilities).toContain('cyclic-flow')
  })

  it('Q3 triggers for 30일 챌린지 타임라인', () => {
    const plan = matchPresets(MIRACLE_PLAN, MIRACLE_FP, MIRACLE_OPENING, policy)
    const result = detectGaps(plan, MIRACLE_FP, MIRACLE_PLAN)
    const q3Gaps = result.gaps.filter((g) => g.gapReason.includes('Q3'))
    expect(q3Gaps.length).toBeGreaterThanOrEqual(1)
    expect(q3Gaps[0].requiredCapabilities).toContain('timeline-h')
  })

  it('Q5 does NOT trigger for Miracle Morning (uplifting, not intense)', () => {
    const plan = matchPresets(MIRACLE_PLAN, MIRACLE_FP, MIRACLE_OPENING, policy)
    const result = detectGaps(plan, MIRACLE_FP, MIRACLE_PLAN)
    const q5Gaps = result.gaps.filter((g) => g.gapReason.includes('Q5'))
    expect(q5Gaps).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// 5. gapDetector — policy enforcement
// ---------------------------------------------------------------------------

describe('gapDetector — policy enforcement', () => {
  it('minSignatureScenes=2 ensures at least 2 gaps', () => {
    const policy = createPlanningPolicy({ minSignatureScenes: 2 })
    const plan = matchPresets(MIRACLE_PLAN, MIRACLE_FP, MIRACLE_OPENING, policy)
    const result = detectGaps(plan, MIRACLE_FP, MIRACLE_PLAN)
    expect(result.gaps.length).toBeGreaterThanOrEqual(2)
  })

  it('maxSynthesizedScenes=1 caps gaps and promotes others back', () => {
    const policy = createPlanningPolicy({ maxSynthesizedScenes: 1 })
    const plan = matchPresets(MIRACLE_PLAN, MIRACLE_FP, MIRACLE_OPENING, policy)
    const result = detectGaps(plan, MIRACLE_FP, MIRACLE_PLAN)
    expect(result.gaps.length).toBeLessThanOrEqual(1)
  })

  it('priority assignment: Q1 gap is must, Q3 gap is nice', () => {
    const policy = createPlanningPolicy()
    const plan = matchPresets(MIRACLE_PLAN, MIRACLE_FP, MIRACLE_OPENING, policy)
    const result = detectGaps(plan, MIRACLE_FP, MIRACLE_PLAN)
    const q1 = result.gaps.find((g) => g.gapReason.includes('Q1'))
    const q3 = result.gaps.find((g) => g.gapReason.includes('Q3'))
    if (q1) expect(q1.priority).toBe('must')
    if (q3) expect(q3.priority).toBe('nice')
  })
})

// ---------------------------------------------------------------------------
// 6. Integration: matchPresets → detectGaps pipeline
// ---------------------------------------------------------------------------

describe('integration: full pipeline', () => {
  it('Miracle Morning produces gaps with correct reasons', () => {
    const policy = createPlanningPolicy()
    const plan = matchPresets(MIRACLE_PLAN, MIRACLE_FP, MIRACLE_OPENING, policy)
    const result = detectGaps(plan, MIRACLE_FP, MIRACLE_PLAN)

    expect(result.gaps.length).toBeGreaterThanOrEqual(2)
    expect(result.gaps.length).toBeLessThanOrEqual(5)

    const reasons = result.gaps.map((g) => g.gapReason)
    const hasQ1 = reasons.some((r) => r.includes('Q1'))
    const hasQ3 = reasons.some((r) => r.includes('Q3'))
    expect(hasQ1).toBe(true)
    expect(hasQ3).toBe(true)
  })

  it('total slots = presetMatches + gaps', () => {
    const policy = createPlanningPolicy()
    const plan = matchPresets(MIRACLE_PLAN, MIRACLE_FP, MIRACLE_OPENING, policy)
    const result = detectGaps(plan, MIRACLE_FP, MIRACLE_PLAN)
    expect(result.presetMatches.length + result.gaps.length).toBe(result.totalSlots)
  })

  it('ScenePlanSchema validates output', () => {
    const policy = createPlanningPolicy()
    const plan = matchPresets(MIRACLE_PLAN, MIRACLE_FP, MIRACLE_OPENING, policy)
    const result = detectGaps(plan, MIRACLE_FP, MIRACLE_PLAN)
    expect(() => ScenePlanSchema.parse(result)).not.toThrow()
  })
})
