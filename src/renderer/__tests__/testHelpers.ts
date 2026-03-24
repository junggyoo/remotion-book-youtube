// ============================================================
// Test Helpers for Preset Blueprint Tests
// ============================================================

import type { Theme } from '@/types'
import type {
  CoverContent,
  ChapterDividerContent,
  KeyInsightContent,
  CompareContrastContent,
  QuoteContent,
  FrameworkContent,
  ApplicationContent,
  DataContent,
  ClosingContent,
} from '@/types'
import type { ResolveContext } from '../presetBlueprints/types'

// --- mockTheme ---

export const mockTheme: Theme = {
  mode: 'dark',
  genre: 'psychology',
  bg: 'tokens.colors.dark.bg',
  surface: 'tokens.colors.dark.surface',
  surfaceMuted: 'tokens.colors.dark.surfaceMuted',
  textStrong: 'tokens.colors.dark.textStrong',
  textMuted: 'tokens.colors.dark.textMuted',
  lineSubtle: 'tokens.colors.dark.lineSubtle',
  signal: 'tokens.colors.dark.signal',
  accent: 'tokens.colors.dark.accent',
  premium: 'tokens.colors.dark.premium',
}

// --- mockResolveContext ---

export function mockResolveContext(overrides: Partial<ResolveContext> = {}): ResolveContext {
  return {
    format: 'longform',
    theme: mockTheme,
    from: 0,
    durationFrames: 150,
    narrationText: 'Test narration text.',
    ...overrides,
  }
}

// --- MINIMAL_CONTENT_FIXTURES ---
// Minimal valid content for each of the 9 core scene types.
// Used by snapshot tests and drift detection.

export const MINIMAL_CONTENT_FIXTURES: Record<string, unknown> = {
  cover: {
    title: 'Test Book Title',
    author: 'Test Author',
    coverImageUrl: '/covers/test.jpg',
  } satisfies CoverContent,

  chapterDivider: {
    chapterNumber: 1,
    chapterTitle: 'Chapter One',
  } satisfies ChapterDividerContent,

  keyInsight: {
    headline: 'Key insight headline text here',
  } satisfies KeyInsightContent,

  compareContrast: {
    leftLabel: 'Before',
    leftContent: 'Old approach description',
    rightLabel: 'After',
    rightContent: 'New approach description',
  } satisfies CompareContrastContent,

  quote: {
    quoteText: 'A meaningful quote for testing purposes.',
    attribution: 'Test Author',
  } satisfies QuoteContent,

  framework: {
    frameworkLabel: 'Test Framework',
    items: [
      { number: 1, title: 'First Principle' },
      { number: 2, title: 'Second Principle' },
      { number: 3, title: 'Third Principle' },
    ],
  } satisfies FrameworkContent,

  application: {
    anchorStatement: 'How to apply this in practice',
    steps: [
      { title: 'Step One' },
      { title: 'Step Two' },
      { title: 'Step Three' },
    ],
  } satisfies ApplicationContent,

  data: {
    chartType: 'bar',
    dataLabel: 'Test Data',
    data: [
      { label: 'A', value: 10 },
      { label: 'B', value: 20 },
      { label: 'C', value: 30 },
    ],
  } satisfies DataContent,

  closing: {
    recapStatement: 'Final recap statement for the book summary.',
  } satisfies ClosingContent,
}
