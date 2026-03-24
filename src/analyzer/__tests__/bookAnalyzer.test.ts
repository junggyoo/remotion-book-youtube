import { describe, it, expect } from 'vitest'
import { validateBookFingerprint, normalizeBookFingerprint } from '../bookAnalyzer'
import { planNarrative } from '../narrativePlanner'
import type { BookFingerprint } from '@/types'

// --- Fixtures ---

const VALID_FINGERPRINT: BookFingerprint = {
  genre: 'selfHelp',
  subGenre: 'morning-routine',
  structure: 'framework',
  coreFramework: 'SAVERS (Silence, Affirmations, Visualization, Exercise, Reading, Scribing)',
  keyConceptCount: 6,
  emotionalTone: ['uplifting', 'disciplined'],
  narrativeArcType: 'transformation',
  urgencyLevel: 'high',
  visualMotifs: ['sunrise', 'wheel', 'ladder', 'mirror'],
  spatialMetaphors: ['순환', '상승', '층위'],
  hookStrategy: 'transformation',
  entryAngle: '교통사고로 죽을 뻔한 남자가 발견한, 아침 1시간의 비밀',
  uniqueElements: ['SAVERS 6단계 순환 바퀴 시각화', '30일 챌린지 3구간 타임라인'],
  contentMode: 'actionable',
}

// --- validateBookFingerprint ---

describe('validateBookFingerprint', () => {
  it('accepts a valid complete BookFingerprint', () => {
    const result = validateBookFingerprint(VALID_FINGERPRINT)
    expect(result).toEqual(VALID_FINGERPRINT)
  })

  it('accepts fingerprint without optional fields', () => {
    const minimal = { ...VALID_FINGERPRINT }
    delete (minimal as Record<string, unknown>).subGenre
    delete (minimal as Record<string, unknown>).coreFramework

    const result = validateBookFingerprint(minimal)
    expect(result.genre).toBe('selfHelp')
    expect(result.subGenre).toBeUndefined()
    expect(result.coreFramework).toBeUndefined()
  })

  it('throws on missing required field (genre)', () => {
    const invalid = { ...VALID_FINGERPRINT }
    delete (invalid as Record<string, unknown>).genre
    expect(() => validateBookFingerprint(invalid)).toThrow()
  })

  it('throws on invalid genre value', () => {
    const invalid = { ...VALID_FINGERPRINT, genre: 'cooking' }
    expect(() => validateBookFingerprint(invalid)).toThrow()
  })

  it('throws on invalid structure value', () => {
    const invalid = { ...VALID_FINGERPRINT, structure: 'random' }
    expect(() => validateBookFingerprint(invalid)).toThrow()
  })

  it('throws on keyConceptCount < 1', () => {
    const invalid = { ...VALID_FINGERPRINT, keyConceptCount: 0 }
    expect(() => validateBookFingerprint(invalid)).toThrow()
  })

  it('throws on empty emotionalTone array', () => {
    const invalid = { ...VALID_FINGERPRINT, emotionalTone: [] }
    expect(() => validateBookFingerprint(invalid)).toThrow()
  })

  it('throws on empty entryAngle', () => {
    const invalid = { ...VALID_FINGERPRINT, entryAngle: '' }
    expect(() => validateBookFingerprint(invalid)).toThrow()
  })

  it('throws on invalid hookStrategy', () => {
    const invalid = { ...VALID_FINGERPRINT, hookStrategy: 'invalid' }
    expect(() => validateBookFingerprint(invalid)).toThrow()
  })
})

// --- normalizeBookFingerprint ---

describe('normalizeBookFingerprint', () => {
  it('fills default emotionalTone based on genre', () => {
    const result = normalizeBookFingerprint({
      genre: 'psychology',
      structure: 'narrative',
      keyConceptCount: 3,
      entryAngle: '테스트 진입 각도',
    })
    expect(result.emotionalTone).toEqual(['reflective'])
  })

  it('fills default hookStrategy based on genre', () => {
    const result = normalizeBookFingerprint({
      genre: 'business',
      structure: 'framework',
      keyConceptCount: 5,
      entryAngle: '비즈니스 관점',
    })
    expect(result.hookStrategy).toBe('system')
  })

  it('fills default contentMode based on genre', () => {
    const result = normalizeBookFingerprint({
      genre: 'philosophy',
      structure: 'argument',
      keyConceptCount: 4,
      entryAngle: '철학적 질문',
    })
    expect(result.contentMode).toBe('conceptual')
  })

  it('preserves explicitly provided values over defaults', () => {
    const result = normalizeBookFingerprint({
      genre: 'selfHelp',
      structure: 'framework',
      keyConceptCount: 6,
      entryAngle: '테스트',
      emotionalTone: ['urgent', 'intense'],
      hookStrategy: 'pain',
      contentMode: 'narrative',
    })
    expect(result.emotionalTone).toEqual(['urgent', 'intense'])
    expect(result.hookStrategy).toBe('pain')
    expect(result.contentMode).toBe('narrative')
  })

  it('fills empty uniqueElements as empty array', () => {
    const result = normalizeBookFingerprint({
      genre: 'ai',
      structure: 'argument',
      keyConceptCount: 3,
      entryAngle: 'AI 위험성',
    })
    expect(result.uniqueElements).toEqual([])
  })

  it('returns a fully valid BookFingerprint', () => {
    const result = normalizeBookFingerprint({
      genre: 'science',
      structure: 'collection',
      keyConceptCount: 10,
      entryAngle: '과학 에세이 모음',
    })
    // Should not throw
    expect(() => validateBookFingerprint(result)).not.toThrow()
  })
})

// --- planNarrative ---

describe('planNarrative', () => {
  const STRUCTURES: BookFingerprint['structure'][] = [
    'framework', 'narrative', 'argument', 'collection',
  ]

  it.each(STRUCTURES)('produces 6 segments for structure=%s', (structure) => {
    const fp = { ...VALID_FINGERPRINT, structure }
    const plan = planNarrative(fp, 480)
    expect(plan.segments).toHaveLength(6)
  })

  it.each(STRUCTURES)('durationRatio sums to ~1.0 for structure=%s', (structure) => {
    const fp = { ...VALID_FINGERPRINT, structure }
    const plan = planNarrative(fp, 480)
    const sum = plan.segments.reduce((a, s) => a + s.durationRatio, 0)
    expect(Math.abs(sum - 1.0)).toBeLessThan(0.001)
  })

  it.each(STRUCTURES)('emotionalCurve has >= 3 points for structure=%s', (structure) => {
    const fp = { ...VALID_FINGERPRINT, structure }
    const plan = planNarrative(fp, 480)
    expect(plan.emotionalCurve.length).toBeGreaterThanOrEqual(3)
  })

  it('returns correct totalDurationSec', () => {
    const plan = planNarrative(VALID_FINGERPRINT, 480)
    expect(plan.totalDurationSec).toBe(480)
  })

  it('includes all 6 segment roles', () => {
    const plan = planNarrative(VALID_FINGERPRINT, 480)
    const roles = plan.segments.map((s) => s.role)
    expect(roles).toEqual([
      'opening', 'setup', 'core', 'climax', 'resolution', 'closing',
    ])
  })

  it('each segment has non-empty intent and requiredDelivery', () => {
    const plan = planNarrative(VALID_FINGERPRINT, 480)
    for (const segment of plan.segments) {
      expect(segment.intent.length).toBeGreaterThan(0)
      expect(segment.requiredDelivery.length).toBeGreaterThan(0)
    }
  })

  it('emotionalCurve timestamps are monotonically increasing', () => {
    const plan = planNarrative(VALID_FINGERPRINT, 480)
    for (let i = 1; i < plan.emotionalCurve.length; i++) {
      expect(plan.emotionalCurve[i].timestamp).toBeGreaterThanOrEqual(
        plan.emotionalCurve[i - 1].timestamp,
      )
    }
  })

  it('emotionalCurve intensities are within [0, 1]', () => {
    const plan = planNarrative(VALID_FINGERPRINT, 480)
    for (const point of plan.emotionalCurve) {
      expect(point.intensity).toBeGreaterThanOrEqual(0)
      expect(point.intensity).toBeLessThanOrEqual(1)
    }
  })

  it('emotionalCurve last point has timestamp 1.0', () => {
    const plan = planNarrative(VALID_FINGERPRINT, 480)
    const last = plan.emotionalCurve[plan.emotionalCurve.length - 1]
    expect(last.timestamp).toBe(1.0)
  })

  it('throws on non-positive targetDurationSec', () => {
    expect(() => planNarrative(VALID_FINGERPRINT, 0)).toThrow()
    expect(() => planNarrative(VALID_FINGERPRINT, -10)).toThrow()
  })

  it('segment ratios respect canonical spec ranges', () => {
    const SPEC_RANGES: Record<string, [number, number]> = {
      opening: [0.05, 0.08],
      setup: [0.10, 0.15],
      core: [0.50, 0.60],
      climax: [0.10, 0.15],
      resolution: [0.10, 0.15],
      closing: [0.03, 0.05],
    }

    for (const structure of STRUCTURES) {
      const fp = { ...VALID_FINGERPRINT, structure }
      const plan = planNarrative(fp, 480)
      for (const segment of plan.segments) {
        const [min, max] = SPEC_RANGES[segment.role]
        expect(segment.durationRatio).toBeGreaterThanOrEqual(min)
        expect(segment.durationRatio).toBeLessThanOrEqual(max)
      }
    }
  })
})

// --- miracle-morning.json integration ---

import path from 'path'
import fs from 'fs'

describe('miracle-morning.json example', () => {
  const examplePath = path.resolve(__dirname, '..', '..', '..', '.claude', 'skills', 'book-analyze', 'examples', 'miracle-morning.json')
  const example = JSON.parse(fs.readFileSync(examplePath, 'utf-8'))

  it('bookFingerprint passes validation', () => {
    expect(() => validateBookFingerprint(example.bookFingerprint)).not.toThrow()
  })

  it('bookFingerprint has correct genre and structure', () => {
    const fp = validateBookFingerprint(example.bookFingerprint)
    expect(fp.genre).toBe('selfHelp')
    expect(fp.structure).toBe('framework')
    expect(fp.keyConceptCount).toBe(6)
  })

  it('videoNarrativePlan segment ratios sum to ~1.0', () => {
    const plan = example.videoNarrativePlan
    const sum = plan.segments.reduce(
      (a: number, s: { durationRatio: number }) => a + s.durationRatio,
      0,
    )
    expect(Math.abs(sum - 1.0)).toBeLessThan(0.001)
  })

  it('videoNarrativePlan has correct totalDurationSec', () => {
    expect(example.videoNarrativePlan.totalDurationSec).toBe(480)
  })

  it('planNarrative output matches example structure', () => {
    const fp = validateBookFingerprint(example.bookFingerprint)
    const plan = planNarrative(fp, 480)
    expect(plan.segments).toHaveLength(6)
    expect(plan.emotionalCurve.length).toBeGreaterThanOrEqual(3)
    expect(plan.totalDurationSec).toBe(480)
  })
})
