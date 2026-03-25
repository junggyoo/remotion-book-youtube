// ============================================================
// Editorial Signal — Blueprint Validator
// Validates SceneBlueprint and SynthesizedBlueprint instances
// against FormatPolicy and design system rules.
// ============================================================

import type {
  SceneBlueprint,
  SynthesizedBlueprint,
  ValidationResult,
  ValidationLevel,
  FormatPolicy,
  VCLElement,
  LayoutType,
  ChoreographyType,
  MotionPresetKey,
  SceneType,
} from '@/types'
import motionPresetsJson from '@/design/tokens/motion-presets.json'

// --- Constants ---

const VALID_FONT_FAMILIES = [
  'Pretendard',
  'Inter',
  'system-ui',
  'sans-serif',
  'Noto Serif KR',
] as const

const VALID_LAYOUT_TYPES: LayoutType[] = [
  'center-focus',
  'left-anchor',
  'split-compare',
  'grid-expand',
  'quote-hold',
  'map-flow',
  'top-anchor',
  'band-divider',
  'split-two',
  'timeline-h',
  'timeline-v',
  'radial',
  'pyramid',
  'flowchart',
  'stacked-layers',
  'orbit',
  'matrix-2x2',
  'scattered-cards',
  'comparison-bar',
  'grid-n',
]

const VALID_CHOREOGRAPHY_TYPES: ChoreographyType[] = [
  'reveal-sequence',
  'stagger-clockwise',
  'count-up',
  'path-trace',
  'split-reveal',
  'stack-build',
  'zoom-focus',
  'wave-fill',
  'morph-transition',
  'pulse-emphasis',
]

const VALID_MOTION_PRESET_KEYS: MotionPresetKey[] = [
  'gentle',
  'smooth',
  'snappy',
  'heavy',
  'dramatic',
]

const VALID_SCENE_TYPES: SceneType[] = [
  'cover',
  'chapterDivider',
  'keyInsight',
  'compareContrast',
  'quote',
  'framework',
  'application',
  'data',
  'closing',
  'timeline',
  'highlight',
  'transition',
  'listReveal',
  'splitQuote',
  'custom',
]

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{3,8}$/

// --- Motion preset validation helpers ---

// Collect all known spring config keys from presets that have springConfig or config fields
function buildKnownSpringConfigs(): Set<string> {
  // We compare against known preset structures, not build a set of configs
  return new Set()
}

function isKnownPresetSpringConfig(obj: Record<string, unknown>): boolean {
  // Check if this config matches any known preset config
  const presets = motionPresetsJson.presets as Record<string, unknown>
  for (const presetName of Object.keys(presets)) {
    const preset = presets[presetName] as Record<string, unknown>
    // smooth/snappy/heavy use config:{stiffness,damping,mass}
    if (preset.config && typeof preset.config === 'object') {
      const cfg = preset.config as Record<string, unknown>
      if (
        cfg.stiffness === obj.stiffness &&
        cfg.damping === obj.damping &&
        cfg.mass === obj.mass
      ) {
        return true
      }
    }
    // dramatic uses springConfig
    if (preset.springConfig && typeof preset.springConfig === 'object') {
      const cfg = preset.springConfig as Record<string, unknown>
      if (
        cfg.stiffness === obj.stiffness &&
        cfg.damping === obj.damping &&
        cfg.mass === obj.mass
      ) {
        return true
      }
    }
  }
  return false
}

// --- Internal helpers ---

function scanPropsForHexColors(props: Record<string, unknown>): string[] {
  const found: string[] = []

  function scan(value: unknown): void {
    if (typeof value === 'string') {
      if (HEX_COLOR_REGEX.test(value)) {
        found.push(value)
      }
    } else if (Array.isArray(value)) {
      for (const item of value) {
        scan(item)
      }
    } else if (value !== null && typeof value === 'object') {
      for (const v of Object.values(value as Record<string, unknown>)) {
        scan(v)
      }
    }
  }

  scan(props)
  return found
}

function scanPropsForInvalidFonts(props: Record<string, unknown>): string[] {
  const found: string[] = []
  const validFonts = VALID_FONT_FAMILIES as readonly string[]

  function scan(value: unknown, key?: string): void {
    if (
      typeof value === 'string' &&
      key &&
      (key === 'fontFamily' || key.toLowerCase().includes('font'))
    ) {
      // Check if value is a font-family string containing an invalid font
      const fontParts = value.split(',').map((f) => f.trim().replace(/['"]/g, ''))
      for (const part of fontParts) {
        if (part && !validFonts.includes(part)) {
          found.push(value)
          break
        }
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
  return found
}

function scanPropsForSpringConfig(props: Record<string, unknown>): boolean {
  // gentle has no spring (type: interpolate) — no spring config to check
  // smooth/snappy/heavy use config:{stiffness,damping,mass}
  // dramatic uses springConfig:{stiffness,damping,mass}
  // We look for any object with stiffness+damping+mass that is NOT a known preset

  function scan(value: unknown): boolean {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>
      // Check if this looks like a spring config (has stiffness, damping, mass)
      if (
        'stiffness' in obj &&
        'damping' in obj &&
        'mass' in obj &&
        typeof obj.stiffness === 'number' &&
        typeof obj.damping === 'number' &&
        typeof obj.mass === 'number'
      ) {
        // Verify it matches a known preset config
        if (!isKnownPresetSpringConfig(obj)) {
          return true // non-preset spring config found
        }
      }
      for (const v of Object.values(obj)) {
        if (scan(v)) return true
      }
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (scan(item)) return true
      }
    }
    return false
  }

  return scan(props)
}

function scanPropsForScaleViolation(props: Record<string, unknown>): number[] {
  const violations: number[] = []
  const MAX_SCALE = motionPresetsJson.defaults.maxScaleEmphasis // 1.06

  function scan(value: unknown, key?: string): void {
    if (
      typeof value === 'number' &&
      key &&
      key.toLowerCase().includes('scale') &&
      value > MAX_SCALE
    ) {
      violations.push(value)
    } else if (Array.isArray(value)) {
      for (const item of value) {
        scan(item, key)
      }
    } else if (value !== null && typeof value === 'object') {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        scan(v, k)
      }
    }
  }

  scan(props)
  return violations
}

const ACCENT_PROP_KEYWORDS = ['accent', 'signal', 'premium', 'highlight'] as const

function countAccentUsages(elements: VCLElement[]): number {
  let count = 0

  function hasAccentInProps(props: Record<string, unknown>): boolean {
    function scan(value: unknown, key?: string): boolean {
      if (typeof value === 'string' && key) {
        const lowerKey = key.toLowerCase()
        const lowerVal = value.toLowerCase()
        if (
          ACCENT_PROP_KEYWORDS.some(
            (kw) => lowerKey.includes(kw) || lowerVal.includes(kw),
          )
        ) {
          return true
        }
      } else if (Array.isArray(value)) {
        return value.some((item) => scan(item))
      } else if (value !== null && typeof value === 'object') {
        return Object.entries(value as Record<string, unknown>).some(([k, v]) =>
          scan(v, k),
        )
      }
      return false
    }
    return scan(props)
  }

  for (const element of elements) {
    if (hasAccentInProps(element.props)) {
      count++
    }
  }

  return count
}

// --- Main validation logic ---

function runChecks(
  blueprint: SceneBlueprint,
  policy: FormatPolicy,
  isSynthesized: boolean,
): { errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  const { elements, layout, choreography, motionPreset, mediaPlan } = blueprint

  // 1. Hardcoded hex colors
  for (const element of elements) {
    const hexColors = scanPropsForHexColors(element.props)
    if (hexColors.length > 0) {
      errors.push(
        `Element "${element.id}" (${element.type}): hardcoded hex colors found: ${hexColors.join(', ')}`,
      )
    }
  }

  // 2. Invalid font tokens
  for (const element of elements) {
    const invalidFonts = scanPropsForInvalidFonts(element.props)
    if (invalidFonts.length > 0) {
      errors.push(
        `Element "${element.id}" (${element.type}): invalid fontFamily tokens: ${invalidFonts.join(', ')}`,
      )
    }
  }

  // 3. Non-preset spring config
  for (const element of elements) {
    if (scanPropsForSpringConfig(element.props)) {
      errors.push(
        `Element "${element.id}" (${element.type}): non-preset spring config detected — use motionPresets.presets.*`,
      )
    }
  }

  // 4. Scale > 1.06
  for (const element of elements) {
    const scaleViolations = scanPropsForScaleViolation(element.props)
    if (scaleViolations.length > 0) {
      errors.push(
        `Element "${element.id}" (${element.type}): scale emphasis exceeds 1.06: ${scaleViolations.join(', ')}`,
      )
    }
  }

  // 5. Accent count > 2 per scene
  const accentCount = countAccentUsages(elements)
  if (accentCount > 2) {
    errors.push(
      `Blueprint "${blueprint.id}": accent usage count ${accentCount} exceeds maximum of 2 per scene`,
    )
  }

  // 6. Missing fallbackPreset (synthesized only)
  if (isSynthesized) {
    const synth = blueprint as SynthesizedBlueprint
    if (!synth.fallbackPreset) {
      errors.push(`SynthesizedBlueprint "${blueprint.id}": missing required fallbackPreset`)
    } else if (!VALID_SCENE_TYPES.includes(synth.fallbackPreset)) {
      errors.push(
        `SynthesizedBlueprint "${blueprint.id}": fallbackPreset "${synth.fallbackPreset}" is not a valid SceneType`,
      )
    }

    // 7. Missing fallbackContent (synthesized only)
    if (!synth.fallbackContent) {
      errors.push(`SynthesizedBlueprint "${blueprint.id}": missing required fallbackContent`)
    }
  }

  // 8. Incomplete mediaPlan
  if (!mediaPlan) {
    errors.push(`Blueprint "${blueprint.id}": missing mediaPlan`)
  } else {
    if (!mediaPlan.narrationText || mediaPlan.narrationText.trim().length === 0) {
      errors.push(`Blueprint "${blueprint.id}": mediaPlan.narrationText is empty`)
    }
    if (!mediaPlan.captionPlan) {
      errors.push(`Blueprint "${blueprint.id}": mediaPlan.captionPlan is missing`)
    }
    if (!mediaPlan.audioPlan) {
      errors.push(`Blueprint "${blueprint.id}": mediaPlan.audioPlan is missing`)
    }
    if (!mediaPlan.assetPlan) {
      errors.push(`Blueprint "${blueprint.id}": mediaPlan.assetPlan is missing`)
    }
  }

  // 9. Elements exceed policy.maxElementsPerScene
  if (elements.length > policy.maxElementsPerScene) {
    errors.push(
      `Blueprint "${blueprint.id}": element count ${elements.length} exceeds policy maximum ${policy.maxElementsPerScene}`,
    )
  }

  // 10. Invalid layout
  if (!VALID_LAYOUT_TYPES.includes(layout)) {
    errors.push(
      `Blueprint "${blueprint.id}": invalid layout "${layout}" — not in LayoutType union`,
    )
  }

  // 11. Invalid choreography
  if (!VALID_CHOREOGRAPHY_TYPES.includes(choreography)) {
    errors.push(
      `Blueprint "${blueprint.id}": invalid choreography "${choreography}" — not in ChoreographyType union`,
    )
  }

  // 12. Invalid motionPreset
  if (!VALID_MOTION_PRESET_KEYS.includes(motionPreset)) {
    errors.push(
      `Blueprint "${blueprint.id}": invalid motionPreset "${motionPreset}" — not in MotionPresetKey union`,
    )
  }

  // 13. Caption line length > 28 or maxLines > 2 (WARNING)
  if (mediaPlan?.captionPlan) {
    const { maxCharsPerLine, maxLines } = mediaPlan.captionPlan
    if (maxCharsPerLine > 28) {
      warnings.push(
        `Blueprint "${blueprint.id}": captionPlan.maxCharsPerLine ${maxCharsPerLine} exceeds 28`,
      )
    }
    if (maxLines > 2) {
      warnings.push(
        `Blueprint "${blueprint.id}": captionPlan.maxLines ${maxLines} exceeds 2`,
      )
    }
  }

  // 14. Y offset > 24 (WARNING)
  const MAX_Y_OFFSET = motionPresetsJson.defaults.maxRevealYOffset // 24
  for (const element of elements) {
    function scanForYOffset(props: Record<string, unknown>): number[] {
      const found: number[] = []
      function scan(value: unknown, key?: string): void {
        if (
          typeof value === 'number' &&
          key &&
          (key.toLowerCase().includes('translatey') ||
            key.toLowerCase().includes('offsety') ||
            key === 'y') &&
          Math.abs(value) > MAX_Y_OFFSET
        ) {
          found.push(value)
        } else if (Array.isArray(value)) {
          for (const item of value) {
            if (typeof item === 'number' && Math.abs(item) > MAX_Y_OFFSET) {
              // Only flag if within a y-related array context
            }
            scan(item, key)
          }
        } else if (value !== null && typeof value === 'object') {
          for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
            scan(v, k)
          }
        }
      }
      scan(props)
      return found
    }

    const yViolations = scanForYOffset(element.props)
    if (yViolations.length > 0) {
      warnings.push(
        `Element "${element.id}" (${element.type}): Y offset ${yViolations.join(', ')} exceeds max ${MAX_Y_OFFSET}px`,
      )
    }
  }

  return { errors, warnings }
}

// --- Exported functions ---

export function validateBlueprint(
  blueprint: SceneBlueprint,
  policy: FormatPolicy,
): ValidationResult {
  const isSynthesized = blueprint.origin === 'synthesized'
  const { errors, warnings } = runChecks(blueprint, policy, isSynthesized)
  const level: ValidationLevel = errors.length > 0 ? 'BLOCKED' : 'PASS'
  return { level, errors, warnings }
}

export function validateSynthesizedBlueprint(
  blueprint: SynthesizedBlueprint,
  policy: FormatPolicy,
): ValidationResult {
  const { errors, warnings } = runChecks(blueprint, policy, true)
  const level: ValidationLevel = errors.length > 0 ? 'BLOCKED' : 'PASS'
  return { level, errors, warnings }
}

export function validateBlueprints(
  blueprints: SceneBlueprint[],
  policy: FormatPolicy,
): { results: Map<string, ValidationResult>; overallLevel: ValidationLevel } {
  const results = new Map<string, ValidationResult>()
  let hasBlocked = false

  for (const blueprint of blueprints) {
    let result: ValidationResult

    if (blueprint.origin === 'synthesized') {
      result = validateSynthesizedBlueprint(blueprint as SynthesizedBlueprint, policy)
    } else {
      result = validateBlueprint(blueprint, policy)
    }

    results.set(blueprint.id, result)
    if (result.level === 'BLOCKED') {
      hasBlocked = true
    }
  }

  return {
    results,
    overallLevel: hasBlocked ? 'BLOCKED' : 'PASS',
  }
}
