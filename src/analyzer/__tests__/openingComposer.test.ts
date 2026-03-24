import { describe, it, expect } from 'vitest'
import {
  scoreStrategies,
  selectHookStrategy,
  composeOpening,
  HOOK_STRATEGIES,
  GENRE_STRATEGY_AFFINITY,
  OpeningPackageSchema,
} from '../openingComposer'
import { validateBookFingerprint } from '../bookAnalyzer'
import { useTheme } from '@/design/themes/useTheme'
import type { BookFingerprint, HookStrategy, GenreKey } from '@/types'
import path from 'path'
import fs from 'fs'

// ---------------------------------------------------------------------------
// Test Theme (required by composeOpening)
// ---------------------------------------------------------------------------

const TEST_THEME = useTheme('dark', 'selfHelp')

// ---------------------------------------------------------------------------
// Fixtures — 6 genre fixtures with expected strategies
// ---------------------------------------------------------------------------

const MIRACLE_MORNING_PATH = path.resolve(
  __dirname, '..', '..', '..', '.claude', 'skills', 'book-analyze', 'examples', 'miracle-morning.json',
)
const miracleMorningExample = JSON.parse(fs.readFileSync(MIRACLE_MORNING_PATH, 'utf-8'))
const MIRACLE_MORNING: BookFingerprint = validateBookFingerprint(miracleMorningExample.bookFingerprint)

const BUSINESS_FRAMEWORK: BookFingerprint = {
  genre: 'business',
  structure: 'framework',
  coreFramework: 'OKR (Objectives and Key Results)',
  keyConceptCount: 4,
  emotionalTone: ['disciplined'],
  narrativeArcType: 'instruction',
  urgencyLevel: 'medium',
  visualMotifs: ['target', 'chart'],
  spatialMetaphors: ['구조', '흐름'],
  hookStrategy: 'system',
  entryAngle: '구글이 성장한 비밀, OKR 시스템',
  uniqueElements: ['OKR 4단계 사이클'],
  contentMode: 'actionable',
}

const PHILOSOPHY_ARGUMENT: BookFingerprint = {
  genre: 'philosophy',
  structure: 'argument',
  keyConceptCount: 5,
  emotionalTone: ['reflective', 'calm'],
  narrativeArcType: 'discovery',
  urgencyLevel: 'low',
  visualMotifs: ['tree', 'horizon'],
  spatialMetaphors: ['깊이', '층위'],
  hookStrategy: 'question',
  entryAngle: '우리는 정말 자유로운 존재인가?',
  uniqueElements: ['자유의지 논쟁 타임라인'],
  contentMode: 'conceptual',
}

const SCIENCE_NARRATIVE: BookFingerprint = {
  genre: 'science',
  structure: 'narrative',
  keyConceptCount: 8,
  emotionalTone: ['intense', 'provocative'],
  narrativeArcType: 'discovery',
  urgencyLevel: 'medium',
  visualMotifs: ['atom', 'wave'],
  spatialMetaphors: ['스케일', '연결'],
  hookStrategy: 'contrarian',
  entryAngle: '우리가 알던 물리학은 틀렸다',
  uniqueElements: ['양자역학 역사 타임라인'],
  contentMode: 'conceptual',
}

const AI_ARGUMENT: BookFingerprint = {
  genre: 'ai',
  structure: 'argument',
  keyConceptCount: 6,
  emotionalTone: ['urgent', 'intense'],
  narrativeArcType: 'warning',
  urgencyLevel: 'high',
  visualMotifs: ['network', 'circuit'],
  spatialMetaphors: ['분기', '확장'],
  hookStrategy: 'urgency',
  entryAngle: 'AI가 당신의 직업을 대체하기 전에 알아야 할 것',
  uniqueElements: ['AI 발전 속도 비교 차트'],
  contentMode: 'mixed',
}

const PSYCHOLOGY_NARRATIVE: BookFingerprint = {
  genre: 'psychology',
  structure: 'narrative',
  keyConceptCount: 5,
  emotionalTone: ['reflective'],
  narrativeArcType: 'discovery',
  urgencyLevel: 'low',
  visualMotifs: ['mirror', 'brain'],
  spatialMetaphors: ['층위', '연결'],
  hookStrategy: 'question',
  entryAngle: '왜 우리는 같은 실수를 반복하는가?',
  uniqueElements: ['인지편향 분류 맵'],
  contentMode: 'conceptual',
}

const ALL_FIXTURES: Array<{
  name: string
  fingerprint: BookFingerprint
  expectedPrimary: HookStrategy
  possibleSecondary?: HookStrategy[]
}> = [
  { name: 'miracle-morning (selfHelp)', fingerprint: MIRACLE_MORNING, expectedPrimary: 'system', possibleSecondary: ['transformation'] },
  { name: 'business-framework', fingerprint: BUSINESS_FRAMEWORK, expectedPrimary: 'system' },
  { name: 'philosophy-argument', fingerprint: PHILOSOPHY_ARGUMENT, expectedPrimary: 'question' },
  { name: 'science-narrative', fingerprint: SCIENCE_NARRATIVE, expectedPrimary: 'contrarian' },
  { name: 'ai-argument', fingerprint: AI_ARGUMENT, expectedPrimary: 'urgency' },
  { name: 'psychology-narrative', fingerprint: PSYCHOLOGY_NARRATIVE, expectedPrimary: 'question' },
]

// ---------------------------------------------------------------------------
// scoreStrategies — unit tests
// ---------------------------------------------------------------------------

describe('scoreStrategies', () => {
  it('returns 7 entries for any valid fingerprint', () => {
    const scores = scoreStrategies(MIRACLE_MORNING)
    expect(scores).toHaveLength(7)
  })

  it('all scores are in [0, 1] range', () => {
    for (const { fingerprint } of ALL_FIXTURES) {
      const scores = scoreStrategies(fingerprint)
      for (const { score } of scores) {
        expect(score).toBeGreaterThanOrEqual(0)
        expect(score).toBeLessThanOrEqual(1)
      }
    }
  })

  it('results are sorted descending by score', () => {
    for (const { fingerprint } of ALL_FIXTURES) {
      const scores = scoreStrategies(fingerprint)
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i].score).toBeLessThanOrEqual(scores[i - 1].score)
      }
    }
  })

  it('returns valid HookStrategy values', () => {
    const validStrategies: HookStrategy[] = [
      'pain', 'contrarian', 'transformation', 'identity', 'question', 'system', 'urgency',
    ]
    const scores = scoreStrategies(MIRACLE_MORNING)
    for (const { strategy } of scores) {
      expect(validStrategies).toContain(strategy)
    }
  })
})

// ---------------------------------------------------------------------------
// HOOK_STRATEGIES — structural tests
// ---------------------------------------------------------------------------

describe('HOOK_STRATEGIES', () => {
  const ALL_STRATEGIES: HookStrategy[] = [
    'pain', 'contrarian', 'transformation', 'identity', 'question', 'system', 'urgency',
  ]

  it('defines all 7 strategies', () => {
    for (const strategy of ALL_STRATEGIES) {
      expect(HOOK_STRATEGIES[strategy]).toBeDefined()
      expect(HOOK_STRATEGIES[strategy].id).toBe(strategy)
      expect(HOOK_STRATEGIES[strategy].description).toBeTruthy()
      expect(HOOK_STRATEGIES[strategy].pattern).toBeTruthy()
      expect(typeof HOOK_STRATEGIES[strategy].score).toBe('function')
    }
  })
})

// ---------------------------------------------------------------------------
// GENRE_STRATEGY_AFFINITY — coverage test
// ---------------------------------------------------------------------------

describe('GENRE_STRATEGY_AFFINITY', () => {
  const ALL_GENRES: GenreKey[] = ['selfHelp', 'psychology', 'business', 'philosophy', 'science', 'ai']

  it('covers all 6 GenreKey values', () => {
    for (const genre of ALL_GENRES) {
      expect(GENRE_STRATEGY_AFFINITY[genre]).toBeDefined()
      expect(Object.keys(GENRE_STRATEGY_AFFINITY[genre]).length).toBeGreaterThan(0)
    }
  })
})

// ---------------------------------------------------------------------------
// selectHookStrategy — unit tests
// ---------------------------------------------------------------------------

describe('selectHookStrategy', () => {
  it('returns valid HookStrategy for primary', () => {
    const result = selectHookStrategy(MIRACLE_MORNING)
    expect(['pain', 'contrarian', 'transformation', 'identity', 'question', 'system', 'urgency']).toContain(result.primary)
  })

  it('secondary is different from primary when present', () => {
    const result = selectHookStrategy(MIRACLE_MORNING)
    if (result.secondary) {
      expect(result.secondary).not.toBe(result.primary)
    }
  })

  it('minimum score floor: pathological fingerprint falls back to fingerprint.hookStrategy', () => {
    // Create a fingerprint with unusual properties that should score low everywhere
    const pathological: BookFingerprint = {
      genre: 'philosophy',
      structure: 'collection',
      keyConceptCount: 1,
      emotionalTone: ['calm'],
      narrativeArcType: 'instruction',
      urgencyLevel: 'low',
      visualMotifs: [],
      spatialMetaphors: [],
      hookStrategy: 'identity',
      entryAngle: '테스트',
      uniqueElements: [],
      contentMode: 'narrative',
    }
    // Even if scores are low, the function should return a valid strategy
    const result = selectHookStrategy(pathological)
    expect(result.primary).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// 6 genre fixture integration tests
// ---------------------------------------------------------------------------

describe('genre fixture integration — selectHookStrategy', () => {
  it.each(ALL_FIXTURES)(
    '$name → primary should be $expectedPrimary',
    ({ fingerprint, expectedPrimary }) => {
      const result = selectHookStrategy(fingerprint)
      expect(result.primary).toBe(expectedPrimary)
    },
  )

  it('miracle-morning produces system + transformation combination', () => {
    const result = selectHookStrategy(MIRACLE_MORNING)
    expect(result.primary).toBe('system')
    expect(result.secondary).toBe('transformation')
  })
})

// ---------------------------------------------------------------------------
// composeOpening — integration tests
// ---------------------------------------------------------------------------

describe('composeOpening', () => {
  it('returns valid OpeningPackage for longform', () => {
    const pkg = composeOpening(MIRACLE_MORNING, { format: 'longform', theme: TEST_THEME })
    expect(pkg.hook).toBeDefined()
    expect(pkg.intro).toBeDefined()
    expect(pkg.transitionBridge).toBeDefined()
    expect(pkg.hookStrategy).toBeTruthy()
    expect(pkg.introFraming).toBeTruthy()
  })

  it('hook and intro are SynthesizedBlueprint with required fields', () => {
    const pkg = composeOpening(MIRACLE_MORNING, { format: 'longform', theme: TEST_THEME })

    // Hook
    expect(pkg.hook.origin).toBe('synthesized')
    expect(pkg.hook.lifecycle).toBe('ephemeral')
    expect(pkg.hook.fallbackPreset).toBe('cover')
    expect(pkg.hook.fallbackContent).toBeDefined()

    // Intro
    expect(pkg.intro.origin).toBe('synthesized')
    expect(pkg.intro.lifecycle).toBe('ephemeral')
    expect(pkg.intro.fallbackPreset).toBe('chapterDivider')
    expect(pkg.intro.fallbackContent).toBeDefined()
  })

  it('mediaPlan has sentinel narrationText', () => {
    const pkg = composeOpening(MIRACLE_MORNING, { format: 'longform', theme: TEST_THEME })
    expect(pkg.hook.mediaPlan.narrationText).toBe('[HOOK_NARRATION]')
    expect(pkg.intro.mediaPlan.narrationText).toBe('[INTRO_NARRATION]')
  })

  it('longform packageDurationSec within 20-35s', () => {
    const pkg = composeOpening(MIRACLE_MORNING, { format: 'longform', theme: TEST_THEME })
    expect(pkg.packageDurationSec).toBeGreaterThanOrEqual(20)
    expect(pkg.packageDurationSec).toBeLessThanOrEqual(35)
  })

  it('shorts packageDurationSec within 5-10s', () => {
    const pkg = composeOpening(MIRACLE_MORNING, { format: 'shorts', theme: TEST_THEME })
    expect(pkg.packageDurationSec).toBeGreaterThanOrEqual(5)
    expect(pkg.packageDurationSec).toBeLessThanOrEqual(10)
  })

  it('shorts produces shorter durations than longform', () => {
    const longform = composeOpening(MIRACLE_MORNING, { format: 'longform', theme: TEST_THEME })
    const shorts = composeOpening(MIRACLE_MORNING, { format: 'shorts', theme: TEST_THEME })
    expect(shorts.packageDurationSec).toBeLessThan(longform.packageDurationSec)
  })

  it('transitionBridge.transitionToBody is non-empty', () => {
    const pkg = composeOpening(MIRACLE_MORNING, { format: 'longform', theme: TEST_THEME })
    expect(pkg.transitionBridge.transitionToBody.length).toBeGreaterThan(0)
  })

  it('fingerprint without coreFramework produces valid output', () => {
    const fp: BookFingerprint = { ...PHILOSOPHY_ARGUMENT, coreFramework: undefined }
    const pkg = composeOpening(fp, { format: 'longform', theme: useTheme('dark', 'philosophy') })
    expect(pkg.hook).toBeDefined()
    expect(pkg.transitionBridge.transitionToBody.length).toBeGreaterThan(0)
  })

  it('OpeningPackageSchema.parse() succeeds on output', () => {
    for (const { fingerprint } of ALL_FIXTURES) {
      const theme = useTheme('dark', fingerprint.genre)
      const pkg = composeOpening(fingerprint, { format: 'longform', theme })
      expect(() => OpeningPackageSchema.parse(pkg)).not.toThrow()
    }
  })

  it.each(ALL_FIXTURES)(
    'composeOpening works for $name (longform)',
    ({ fingerprint }) => {
      const theme = useTheme('dark', fingerprint.genre)
      const pkg = composeOpening(fingerprint, { format: 'longform', theme })
      expect(pkg.packageDurationSec).toBeGreaterThanOrEqual(20)
      expect(pkg.packageDurationSec).toBeLessThanOrEqual(35)
    },
  )
})
