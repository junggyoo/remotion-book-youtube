// ============================================================
// Editorial Signal — Quality Metrics
// Computes SceneQualityMetrics for a SceneBlueprint and checks
// against the QUALITY_GATE thresholds.
// ============================================================

import type {
  SceneBlueprint,
  SceneQualityMetrics,
  FormatPolicy,
  BookFingerprint,
  OpeningPackage,
  VCLElement,
  VCLElementType,
} from '@/types'
import { QUALITY_GATE } from '@/types'
import { validateBlueprint } from './blueprintValidator'
import { computeOpeningGenericness } from './openingValidator'

// --- Constants ---

// Korean characters reading speed (characters per second)
const KOREAN_READING_SPEED_CPS = 6

// Text VCL element types that contain displayable Korean text
const TEXT_ELEMENT_TYPES: VCLElementType[] = [
  'headline',
  'body-text',
  'label',
  'caption',
  'quote-text',
  'number-display',
]

// Layouts that are horizontal-only and thus problematic for shorts
const HORIZONTAL_ONLY_LAYOUTS = [
  'timeline-h',
  'comparison-bar',
  'split-two',
  'split-compare',
] as const

// --- Helpers ---

function isTextElement(type: VCLElementType): boolean {
  return (TEXT_ELEMENT_TYPES as VCLElementType[]).includes(type)
}

function extractKoreanChars(text: string): number {
  // Korean Unicode range: AC00–D7A3 (Hangul syllables), plus Jamo ranges
  const koreanRegex = /[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]/g
  return (text.match(koreanRegex) ?? []).length
}

function extractTextFromProps(props: Record<string, unknown>): string {
  const texts: string[] = []

  function scan(value: unknown, key?: string): void {
    if (typeof value === 'string' && key) {
      const lk = key.toLowerCase()
      if (
        lk === 'text' ||
        lk === 'content' ||
        lk === 'label' ||
        lk === 'value' ||
        lk === 'caption' ||
        lk === 'title' ||
        lk === 'body' ||
        lk === 'quote'
      ) {
        texts.push(value)
      }
    } else if (Array.isArray(value)) {
      for (const item of value) {
        scan(item)
      }
    } else if (value !== null && typeof value === 'object') {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        scan(v, k)
      }
    }
  }

  scan(props)
  return texts.join(' ')
}

function countTotalKoreanCharsInElements(elements: VCLElement[]): number {
  let total = 0
  for (const element of elements) {
    if (isTextElement(element.type)) {
      const text = extractTextFromProps(element.props)
      total += extractKoreanChars(text)
    }
  }
  return total
}

// --- Metric computations ---

/**
 * readabilityScore: min(1, displayTimeSec / requiredReadTimeSec)
 * displayTimeSec = durationFrames / 30
 * requiredReadTimeSec = totalKoreanChars / 6
 */
function computeReadabilityScore(blueprint: SceneBlueprint): number {
  const displayTimeSec = blueprint.durationFrames / 30
  const totalKoreanChars = countTotalKoreanCharsInElements(blueprint.elements)

  if (totalKoreanChars === 0) {
    // No Korean text — full score (display time is fine for visual-only scenes)
    return 1.0
  }

  const requiredReadTimeSec = totalKoreanChars / KOREAN_READING_SPEED_CPS
  return Math.min(1, displayTimeSec / requiredReadTimeSec)
}

/**
 * brandConsistencyScore: 1 - (violationCount * penalty)
 * BLOCKED violations: penalty 0.15
 * WARNING violations: penalty 0.05
 * Floor: 0
 */
function computeBrandConsistencyScore(
  blueprint: SceneBlueprint,
  policy: FormatPolicy,
): number {
  const result = validateBlueprint(blueprint, policy)

  const blockedCount = result.errors.length
  const warningCount = result.warnings.length

  const score = 1 - blockedCount * 0.15 - warningCount * 0.05
  return Math.max(0, score)
}

/**
 * visualComplexityScore: 1 - max(0, (elements.length / maxElementsPerScene) - 0.8) * 5
 * INFORMATIONAL ONLY — not gated.
 */
function computeVisualComplexityScore(
  blueprint: SceneBlueprint,
  policy: FormatPolicy,
): number {
  const ratio = blueprint.elements.length / policy.maxElementsPerScene
  return 1 - Math.max(0, ratio - 0.8) * 5
}

/**
 * shortsAdaptability: elements.length <= 3, no horizontal-only layouts.
 * -0.25 per violation, floor 0. INFORMATIONAL.
 */
function computeShortsAdaptability(blueprint: SceneBlueprint): number {
  let score = 1.0

  if (blueprint.elements.length > 3) {
    score -= 0.25
  }

  const layout = blueprint.layout as string
  if ((HORIZONTAL_ONLY_LAYOUTS as readonly string[]).includes(layout)) {
    score -= 0.25
  }

  return Math.max(0, score)
}

// --- Exported functions ---

export function computeQualityMetrics(
  blueprint: SceneBlueprint,
  policy: FormatPolicy,
  fingerprint?: BookFingerprint,
  openingPackage?: OpeningPackage,
): SceneQualityMetrics {
  const readabilityScore = computeReadabilityScore(blueprint)
  const brandConsistencyScore = computeBrandConsistencyScore(blueprint, policy)
  const visualComplexityScore = computeVisualComplexityScore(blueprint, policy)
  const renderStability = 1.0 // placeholder as specified
  const shortsAdaptability = computeShortsAdaptability(blueprint)

  // openingGenericness: delegate to openingValidator, undefined for non-opening scenes.
  // Only computed when both openingPackage and fingerprint are provided.
  let openingGenericness: number | undefined
  if (openingPackage !== undefined && fingerprint !== undefined) {
    openingGenericness = computeOpeningGenericness(openingPackage, fingerprint)
  }

  return {
    readabilityScore,
    brandConsistencyScore,
    visualComplexityScore,
    renderStability,
    shortsAdaptability,
    openingGenericness,
  }
}

export function meetsQualityGate(metrics: SceneQualityMetrics): {
  pass: boolean
  failures: string[]
} {
  const failures: string[] = []

  // Gate: readabilityScore >= 0.8
  if (metrics.readabilityScore < QUALITY_GATE.readabilityScore) {
    failures.push(
      `readabilityScore ${metrics.readabilityScore.toFixed(3)} < ${QUALITY_GATE.readabilityScore} (required)`,
    )
  }

  // Gate: brandConsistencyScore >= 0.85
  if (metrics.brandConsistencyScore < QUALITY_GATE.brandConsistencyScore) {
    failures.push(
      `brandConsistencyScore ${metrics.brandConsistencyScore.toFixed(3)} < ${QUALITY_GATE.brandConsistencyScore} (required)`,
    )
  }

  // Gate: renderStability >= 0.95
  if (metrics.renderStability < QUALITY_GATE.renderStability) {
    failures.push(
      `renderStability ${metrics.renderStability.toFixed(3)} < ${QUALITY_GATE.renderStability} (required)`,
    )
  }

  // Gate: openingGenericness <= 0.35 (only if defined)
  if (
    metrics.openingGenericness !== undefined &&
    metrics.openingGenericness > QUALITY_GATE.openingGenericnessMax
  ) {
    failures.push(
      `openingGenericness ${metrics.openingGenericness.toFixed(3)} > ${QUALITY_GATE.openingGenericnessMax} (required)`,
    )
  }

  // visualComplexityScore and shortsAdaptability are INFORMATIONAL — not gated

  return {
    pass: failures.length === 0,
    failures,
  }
}
