import type {
  BookFingerprint,
  VideoNarrativePlan,
  NarrativeSegment,
  EmotionalPoint,
  SegmentRole,
} from '@/types'

// --- Segment ratio tables (canonical spec: opening 5-8%, setup 10-15%, core 50-60%, climax 10-15%, resolution 10-15%, closing 3-5%) ---

type RatioTable = Record<SegmentRole, number>

const SEGMENT_RATIOS: Record<BookFingerprint['structure'], RatioTable> = {
  framework: {
    opening: 0.06,
    setup: 0.12,
    core: 0.52,
    climax: 0.12,
    resolution: 0.13,
    closing: 0.05,
  },
  narrative: {
    opening: 0.07,
    setup: 0.13,
    core: 0.50,
    climax: 0.14,
    resolution: 0.12,
    closing: 0.04,
  },
  argument: {
    opening: 0.08,
    setup: 0.12,
    core: 0.50,
    climax: 0.13,
    resolution: 0.13,
    closing: 0.04,
  },
  collection: {
    opening: 0.06,
    setup: 0.10,
    core: 0.55,
    climax: 0.12,
    resolution: 0.12,
    closing: 0.05,
  },
}

// --- Segment role order ---

const SEGMENT_ORDER: SegmentRole[] = [
  'opening', 'setup', 'core', 'climax', 'resolution', 'closing',
]

// --- Emotional tone → base intensity mapping ---

const TONE_INTENSITY: Record<string, number> = {
  uplifting: 0.6,
  disciplined: 0.5,
  reflective: 0.4,
  urgent: 0.8,
  hopeful: 0.55,
  provocative: 0.7,
  calm: 0.3,
  intense: 0.85,
}

const URGENCY_MULTIPLIER: Record<BookFingerprint['urgencyLevel'], number> = {
  low: 0.8,
  medium: 1.0,
  high: 1.2,
}

// --- Segment role → emotional curve shape multiplier ---

const ROLE_CURVE: Record<SegmentRole, [number, number]> = {
  opening: [0.3, 0.5],
  setup: [0.5, 0.6],
  core: [0.6, 0.8],
  climax: [0.85, 1.0],
  resolution: [0.7, 0.5],
  closing: [0.4, 0.3],
}

// --- Intent templates ---

const INTENT_TEMPLATES: Record<SegmentRole, (fp: BookFingerprint) => string> = {
  opening: (fp) => `${fp.hookStrategy} 전략으로 시청자 주의 확보`,
  setup: (fp) => `${fp.genre} 장르의 맥락 설정 — "${fp.entryAngle}"`,
  core: (fp) =>
    fp.coreFramework
      ? `핵심 프레임워크(${fp.coreFramework}) 설명`
      : `핵심 개념 ${fp.keyConceptCount}개 전달`,
  climax: (fp) => `핵심 인사이트 강조 — ${fp.contentMode} 모드`,
  resolution: () => '적용 방법 및 실생활 연결',
  closing: () => '요약 및 CTA',
}

const DELIVERY_TEMPLATES: Record<SegmentRole, (fp: BookFingerprint) => string[]> = {
  opening: (fp) => [`hook: ${fp.hookStrategy}`, 'attention-grab'],
  setup: () => ['context-setting', 'book-intro'],
  core: (fp) =>
    fp.coreFramework
      ? [`framework: ${fp.coreFramework}`, 'step-by-step']
      : ['key-concepts', 'evidence'],
  climax: () => ['peak-insight', 'emotional-peak'],
  resolution: () => ['application', 'real-life-example'],
  closing: () => ['recap', 'cta'],
}

// --- Public API ---

/**
 * Generates a VideoNarrativePlan from a BookFingerprint and target duration.
 * Segment ratios are structure-aware and spec-compliant.
 */
export function planNarrative(
  fingerprint: BookFingerprint,
  targetDurationSec: number,
): VideoNarrativePlan {
  if (targetDurationSec <= 0) {
    throw new Error(`targetDurationSec must be positive, got ${targetDurationSec}`)
  }

  const ratios = SEGMENT_RATIOS[fingerprint.structure]

  // Validate ratio sum (floating-point tolerance)
  const ratioSum = Object.values(ratios).reduce((a, b) => a + b, 0)
  if (Math.abs(ratioSum - 1.0) >= 0.001) {
    throw new Error(`Internal error: segment ratios sum to ${ratioSum}, expected ~1.0`)
  }

  const segments: NarrativeSegment[] = SEGMENT_ORDER.map((role) => ({
    role,
    durationRatio: ratios[role],
    intent: INTENT_TEMPLATES[role](fingerprint),
    requiredDelivery: DELIVERY_TEMPLATES[role](fingerprint),
  }))

  const emotionalCurve = generateEmotionalCurve(fingerprint, segments)

  return {
    totalDurationSec: targetDurationSec,
    segments,
    emotionalCurve,
  }
}

// --- Emotional curve generation ---

function computeBaseIntensity(fingerprint: BookFingerprint): number {
  const tones = fingerprint.emotionalTone
  if (tones.length === 0) return 0.5

  const sum = tones.reduce((acc, tone) => {
    return acc + (TONE_INTENSITY[tone] ?? 0.5)
  }, 0)
  const avgIntensity = sum / tones.length

  const multiplier = URGENCY_MULTIPLIER[fingerprint.urgencyLevel]
  return Math.min(1.0, Math.max(0.0, avgIntensity * multiplier))
}

function generateEmotionalCurve(
  fingerprint: BookFingerprint,
  segments: NarrativeSegment[],
): EmotionalPoint[] {
  const baseIntensity = computeBaseIntensity(fingerprint)
  const points: EmotionalPoint[] = []

  let cumulativeRatio = 0

  for (const segment of segments) {
    const [startMul, endMul] = ROLE_CURVE[segment.role]

    // Point at start of segment
    points.push({
      timestamp: cumulativeRatio,
      intensity: clamp(baseIntensity * startMul),
      label: `${segment.role}-start`,
    })

    cumulativeRatio += segment.durationRatio
  }

  // Final point at end
  const lastSegment = segments[segments.length - 1]
  const [, endMul] = ROLE_CURVE[lastSegment.role]
  points.push({
    timestamp: 1.0,
    intensity: clamp(baseIntensity * endMul),
    label: 'end',
  })

  return points
}

function clamp(value: number): number {
  return Math.min(1.0, Math.max(0.0, value))
}
