import type {
  OpeningPackage,
  BookFingerprint,
  HookStrategy,
  GenreKey,
  ValidationResult,
  ValidationLevel,
} from '@/types'
import { QUALITY_GATE } from '@/types'
import genreKeywords from './genre-keywords.json'

// --- Types ---

export interface OpeningValidationResult extends ValidationResult {
  openingGenericness: number
  hookStrategyValid: boolean
  transitionBridgeValid: boolean
}

// --- Helpers ---

const VALID_HOOK_STRATEGIES: HookStrategy[] = [
  'pain',
  'contrarian',
  'transformation',
  'identity',
  'question',
  'system',
  'urgency',
]

function extractNarrationText(opening: OpeningPackage): string {
  const hookText = opening.hook.mediaPlan?.narrationText ?? ''
  const introText = opening.intro.mediaPlan?.narrationText ?? ''
  return `${hookText} ${introText}`
}

/**
 * Computes how generic (non-book-specific) the opening narration is.
 * Score range: 0 (fully unique) ~ 1 (fully generic).
 */
export function computeOpeningGenericness(
  opening: OpeningPackage,
  fingerprint: BookFingerprint,
): number {
  const genre = fingerprint.genre as GenreKey
  const keywords: string[] =
    (genreKeywords.genreKeywords as Record<string, string[]>)[genre] ?? []

  if (keywords.length === 0) return 0

  const narrationText = extractNarrationText(opening)

  // Count matched default genre keywords
  const matchedCount = keywords.filter((kw) => narrationText.includes(kw)).length
  const overlapRatio = matchedCount / keywords.length

  let penalty = 0

  // Penalty: hookStrategy is the most common one for this genre
  const mostCommonStrategy =
    (genreKeywords.commonHookStrategies as Record<string, string>)[genre] ?? ''
  if (opening.hookStrategy === mostCommonStrategy) {
    penalty += 0.15
  }

  // Penalty: no book-specific proper nouns referenced
  const uniqueElements = fingerprint.uniqueElements ?? []
  const coreFramework = fingerprint.coreFramework ?? ''
  const bookSpecificTerms = [...uniqueElements, coreFramework].filter(Boolean)

  const hasBookSpecificReference = bookSpecificTerms.some((term) =>
    narrationText.includes(term),
  )
  if (!hasBookSpecificReference) {
    penalty += 0.1
  }

  return Math.min(1, Math.max(0, overlapRatio + penalty))
}

// --- Main export ---

export function validateOpening(
  opening: OpeningPackage,
  fingerprint: BookFingerprint,
): OpeningValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Structural checks
  const hookStrategyValid = VALID_HOOK_STRATEGIES.includes(opening.hookStrategy)
  if (!hookStrategyValid) {
    errors.push(
      `Invalid hookStrategy: "${opening.hookStrategy}". Must be one of: ${VALID_HOOK_STRATEGIES.join(', ')}`,
    )
  }

  const transitionBridgeValid =
    typeof opening.transitionBridge?.transitionToBody === 'string' &&
    opening.transitionBridge.transitionToBody.trim().length > 0
  if (!transitionBridgeValid) {
    errors.push('transitionBridge.transitionToBody is empty or missing')
  }

  // Genericness score
  const openingGenericness = computeOpeningGenericness(opening, fingerprint)
  if (openingGenericness >= QUALITY_GATE.openingGenericnessMax) {
    errors.push(
      `Opening genericness score ${openingGenericness.toFixed(2)} exceeds threshold ${QUALITY_GATE.openingGenericnessMax}`,
    )
  }

  // Duration range check
  const { packageDurationSec } = opening
  const MIN_DURATION = 20
  const MAX_DURATION = 35
  if (packageDurationSec < MIN_DURATION || packageDurationSec > MAX_DURATION) {
    warnings.push(
      `packageDurationSec ${packageDurationSec}s is out of recommended range (${MIN_DURATION}~${MAX_DURATION}s)`,
    )
  }

  // Hook narration lacks uniqueElements reference
  const hookNarration = opening.hook.mediaPlan?.narrationText ?? ''
  const uniqueElements = fingerprint.uniqueElements ?? []
  const hasUniqueRef = uniqueElements.some((el) => hookNarration.includes(el))
  if (!hasUniqueRef && uniqueElements.length > 0) {
    warnings.push(
      'Hook narration does not reference any uniqueElements from BookFingerprint',
    )
  }

  const level: ValidationLevel = errors.length > 0 ? 'BLOCKED' : 'PASS'

  return {
    level,
    errors,
    warnings,
    openingGenericness,
    hookStrategyValid,
    transitionBridgeValid,
  }
}
