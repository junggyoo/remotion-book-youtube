import type { PlanningPolicy, FormatPolicy } from '@/types'

// ---------------------------------------------------------------------------
// Format Policy Defaults (DSGS Spec 3-6)
// ---------------------------------------------------------------------------

const LONGFORM_DEFAULTS: FormatPolicy = {
  format: 'longform',
  maxElementsPerScene: 12,
  captionDensity: 'medium',
  openingDurationSecRange: [20, 35],
  sceneCountRange: [8, 14],
}

const SHORTS_DEFAULTS: FormatPolicy = {
  format: 'shorts',
  maxElementsPerScene: 6,
  captionDensity: 'high',
  openingDurationSecRange: [5, 10],
  sceneCountRange: [1, 3],
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function createFormatPolicy(
  format: 'longform' | 'shorts',
  overrides?: Partial<FormatPolicy>,
): FormatPolicy {
  const base = format === 'longform' ? LONGFORM_DEFAULTS : SHORTS_DEFAULTS
  return { ...base, ...overrides, format }
}

export function createPlanningPolicy(
  overrides?: Partial<PlanningPolicy>,
): PlanningPolicy {
  const format = overrides?.formatPolicy?.format ?? 'longform'
  return {
    presetConfidenceThreshold: 0.7,
    minSignatureScenes: 2,
    maxSynthesizedScenes: 5,
    openingMustBeDynamic: true,
    formatPolicy: createFormatPolicy(format),
    ...overrides,
  }
}
