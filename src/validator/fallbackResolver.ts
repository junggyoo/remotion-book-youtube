import { z } from 'zod'
import type {
  SynthesizedBlueprint,
  ValidationResult,
  SceneType,
  SceneContent,
  OpeningPackage,
  GenreKey,
} from '@/types'
import { ContentSchemaMap } from '@/pipeline/validate'
import type { OpeningValidationResult } from './openingValidator'

// --- Types ---

export interface FallbackResolution {
  originalBlueprintId: string
  originalErrors: string[]
  fallbackSceneType: SceneType
  fallbackContent: SceneContent
  resolutionStatus: 'resolved' | 'fallback-also-failed'
  reason: string
}

// --- Genre-default presets for opening fallback ---

const GENRE_DEFAULT_HOOK_PRESET: Record<GenreKey, SceneType> = {
  selfHelp: 'keyInsight',
  psychology: 'quote',
  business: 'keyInsight',
  philosophy: 'quote',
  science: 'highlight',
  ai: 'highlight',
}

const GENRE_DEFAULT_INTRO_PRESET: Record<GenreKey, SceneType> = {
  selfHelp: 'chapterDivider',
  psychology: 'keyInsight',
  business: 'chapterDivider',
  philosophy: 'keyInsight',
  science: 'chapterDivider',
  ai: 'keyInsight',
}

// --- Main exports ---

/**
 * Resolves a fallback for a SynthesizedBlueprint that failed validation.
 * Uses blueprint.fallbackPreset + blueprint.fallbackContent.
 * Validates the fallback content against ContentSchemaMap to confirm resolution.
 */
export function resolveFallback(
  blueprint: SynthesizedBlueprint,
  validationResult: ValidationResult,
): FallbackResolution {
  const originalErrors = validationResult.errors
  const fallbackSceneType = blueprint.fallbackPreset
  const fallbackContent = blueprint.fallbackContent

  // Validate fallback content against the schema for its scene type
  // ContentSchemaMap excludes 'custom' — guard against it explicitly
  const schema = fallbackSceneType !== 'custom'
    ? ContentSchemaMap[fallbackSceneType as Exclude<SceneType, 'custom'>]
    : undefined

  if (!schema) {
    // 'custom' or unknown type — no schema available
    return {
      originalBlueprintId: blueprint.id,
      originalErrors,
      fallbackSceneType,
      fallbackContent,
      resolutionStatus: 'fallback-also-failed',
      reason: `No ContentSchemaMap entry for fallbackPreset "${fallbackSceneType}" — cannot validate fallback content`,
    }
  }

  const parseResult = schema.safeParse(fallbackContent)

  if (parseResult.success) {
    return {
      originalBlueprintId: blueprint.id,
      originalErrors,
      fallbackSceneType,
      fallbackContent,
      resolutionStatus: 'resolved',
      reason: `Fallback to preset "${fallbackSceneType}" validated successfully`,
    }
  } else {
    const fallbackErrors = parseResult.error.issues
      .map((issue: z.ZodIssue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ')

    return {
      originalBlueprintId: blueprint.id,
      originalErrors,
      fallbackSceneType,
      fallbackContent,
      resolutionStatus: 'fallback-also-failed',
      reason: `Fallback content for preset "${fallbackSceneType}" also failed validation: ${fallbackErrors}`,
    }
  }
}

/**
 * Resolves fallbacks for both hook and intro of an OpeningPackage.
 * Uses genre-default presets and logs the openingPresetUsedReason.
 */
export function resolveOpeningFallback(
  opening: OpeningPackage,
  validationResult: OpeningValidationResult,
  genre: GenreKey,
): {
  hook: FallbackResolution
  intro: FallbackResolution
  openingPresetUsedReason: string
} {
  const hookFallback = resolveFallback(opening.hook, validationResult)
  const introFallback = resolveFallback(opening.intro, validationResult)

  // Override fallback scene types with genre defaults if the blueprint fallback also failed
  const resolvedHookType =
    hookFallback.resolutionStatus === 'fallback-also-failed'
      ? GENRE_DEFAULT_HOOK_PRESET[genre]
      : hookFallback.fallbackSceneType

  const resolvedIntroType =
    introFallback.resolutionStatus === 'fallback-also-failed'
      ? GENRE_DEFAULT_INTRO_PRESET[genre]
      : introFallback.fallbackSceneType

  const openingPresetUsedReason = [
    `Opening validation failed with genericness score ${validationResult.openingGenericness.toFixed(2)} (threshold: 0.35).`,
    `Errors: ${validationResult.errors.join(' | ') || 'none'}.`,
    `Resolved hook to preset "${resolvedHookType}", intro to preset "${resolvedIntroType}" for genre "${genre}".`,
    hookFallback.resolutionStatus === 'fallback-also-failed'
      ? `Hook blueprint fallback also failed — used genre-default "${resolvedHookType}".`
      : `Hook blueprint fallback resolved: "${hookFallback.fallbackSceneType}".`,
    introFallback.resolutionStatus === 'fallback-also-failed'
      ? `Intro blueprint fallback also failed — used genre-default "${resolvedIntroType}".`
      : `Intro blueprint fallback resolved: "${introFallback.fallbackSceneType}".`,
  ].join(' ')

  return {
    hook: hookFallback,
    intro: introFallback,
    openingPresetUsedReason,
  }
}
