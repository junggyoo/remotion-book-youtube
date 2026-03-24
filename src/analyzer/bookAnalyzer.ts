import { z } from 'zod'
import type { BookFingerprint, GenreKey } from '@/types'

// --- Zod Schema ---

const GenreKeySchema = z.enum([
  'selfHelp', 'psychology', 'business', 'philosophy', 'science', 'ai',
])

const StructureSchema = z.enum(['framework', 'narrative', 'argument', 'collection'])

const NarrativeArcTypeSchema = z.enum([
  'transformation', 'discovery', 'warning', 'instruction',
])

const HookStrategySchema = z.enum([
  'pain', 'contrarian', 'transformation',
  'identity', 'question', 'system', 'urgency',
])

const ContentModeSchema = z.enum([
  'actionable', 'conceptual', 'narrative', 'mixed',
])

const UrgencyLevelSchema = z.enum(['low', 'medium', 'high'])

const BookFingerprintSchema = z.object({
  genre: GenreKeySchema,
  subGenre: z.string().optional(),
  structure: StructureSchema,
  coreFramework: z.string().optional(),
  keyConceptCount: z.number().int().min(1),
  emotionalTone: z.array(z.string()).min(1),
  narrativeArcType: NarrativeArcTypeSchema,
  urgencyLevel: UrgencyLevelSchema,
  visualMotifs: z.array(z.string()),
  spatialMetaphors: z.array(z.string()),
  hookStrategy: HookStrategySchema,
  entryAngle: z.string().min(1),
  uniqueElements: z.array(z.string()),
  contentMode: ContentModeSchema,
})

// --- Genre-based defaults ---

interface GenreDefaults {
  emotionalTone: string[]
  narrativeArcType: BookFingerprint['narrativeArcType']
  urgencyLevel: BookFingerprint['urgencyLevel']
  hookStrategy: BookFingerprint['hookStrategy']
  contentMode: BookFingerprint['contentMode']
  visualMotifs: string[]
  spatialMetaphors: string[]
}

const GENRE_DEFAULTS: Record<GenreKey, GenreDefaults> = {
  selfHelp: {
    emotionalTone: ['uplifting'],
    narrativeArcType: 'transformation',
    urgencyLevel: 'medium',
    hookStrategy: 'transformation',
    contentMode: 'actionable',
    visualMotifs: ['path', 'growth'],
    spatialMetaphors: ['상승', '단계'],
  },
  psychology: {
    emotionalTone: ['reflective'],
    narrativeArcType: 'discovery',
    urgencyLevel: 'low',
    hookStrategy: 'question',
    contentMode: 'conceptual',
    visualMotifs: ['mirror', 'brain'],
    spatialMetaphors: ['층위', '연결'],
  },
  business: {
    emotionalTone: ['disciplined'],
    narrativeArcType: 'instruction',
    urgencyLevel: 'medium',
    hookStrategy: 'system',
    contentMode: 'actionable',
    visualMotifs: ['chart', 'gear'],
    spatialMetaphors: ['구조', '흐름'],
  },
  philosophy: {
    emotionalTone: ['reflective', 'calm'],
    narrativeArcType: 'discovery',
    urgencyLevel: 'low',
    hookStrategy: 'question',
    contentMode: 'conceptual',
    visualMotifs: ['tree', 'horizon'],
    spatialMetaphors: ['깊이', '층위'],
  },
  science: {
    emotionalTone: ['intense'],
    narrativeArcType: 'discovery',
    urgencyLevel: 'medium',
    hookStrategy: 'contrarian',
    contentMode: 'conceptual',
    visualMotifs: ['atom', 'wave'],
    spatialMetaphors: ['스케일', '연결'],
  },
  ai: {
    emotionalTone: ['intense', 'urgent'],
    narrativeArcType: 'warning',
    urgencyLevel: 'high',
    hookStrategy: 'urgency',
    contentMode: 'mixed',
    visualMotifs: ['network', 'circuit'],
    spatialMetaphors: ['분기', '확장'],
  },
}

// --- Public API ---

/**
 * Strictly validates an unknown input as a BookFingerprint.
 * Throws ZodError if invalid.
 */
export function validateBookFingerprint(input: unknown): BookFingerprint {
  return BookFingerprintSchema.parse(input) as BookFingerprint
}

/**
 * Required fields for normalization — minimum viable input.
 */
type BookFingerprintRequired = Pick<
  BookFingerprint,
  'genre' | 'structure' | 'keyConceptCount' | 'entryAngle'
>

/**
 * Normalizes a partial BookFingerprint by filling genre-based defaults
 * for any missing optional fields.
 */
export function normalizeBookFingerprint(
  partial: BookFingerprintRequired & Partial<BookFingerprint>,
): BookFingerprint {
  const defaults = GENRE_DEFAULTS[partial.genre]

  const fingerprint: BookFingerprint = {
    genre: partial.genre,
    subGenre: partial.subGenre,
    structure: partial.structure,
    coreFramework: partial.coreFramework,
    keyConceptCount: partial.keyConceptCount,
    emotionalTone: partial.emotionalTone ?? defaults.emotionalTone,
    narrativeArcType: partial.narrativeArcType ?? defaults.narrativeArcType,
    urgencyLevel: partial.urgencyLevel ?? defaults.urgencyLevel,
    visualMotifs: partial.visualMotifs ?? defaults.visualMotifs,
    spatialMetaphors: partial.spatialMetaphors ?? defaults.spatialMetaphors,
    hookStrategy: partial.hookStrategy ?? defaults.hookStrategy,
    entryAngle: partial.entryAngle,
    uniqueElements: partial.uniqueElements ?? [],
    contentMode: partial.contentMode ?? defaults.contentMode,
  }

  // Validate the assembled result
  return validateBookFingerprint(fingerprint)
}
