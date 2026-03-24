// ============================================================
// Drift Detection: factory VCL elements vs scene-catalog.json LAYERS
//
// Strategy: match by props.layer (zIndex number) — every factory element
// sets props.layer from CATALOG.layers.X, so the number is the ground truth.
//
// Bidirectional check:
//   Forward:  every non-utility catalog layer zIndex has at least one
//             VCL element with that props.layer value
//   Reverse:  every non-structural VCL element has a props.layer value
//             that corresponds to a known catalog layer
//
// Uses enriched fixtures that activate all optional fields so optional layers
// (e.g. supportText, cta, paths) are present in the generated blueprints.
// ============================================================

import sceneCatalog from '@/schema/scene-catalog.json'
import { presetBlueprintRegistry } from '../presetBlueprints'
import { mockResolveContext } from './testHelpers'
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

// Utility catalog layers with no VCL element counterpart.
// 'emphasis' is a renderer-applied visual effect layer (scale/highlight),
// not a static content element — excluded from forward check.
const UTILITY_LAYER_NAMES = new Set(['background', 'hud', 'emphasis'])

// VCL element types that are structural/decoration — not tied to a specific catalog layer
const STRUCTURAL_VCL_TYPES = new Set(['texture-overlay'])

type CatalogScenes = Record<string, { layers: Record<string, number> }>
const catalogScenes = (sceneCatalog.scenes as unknown) as CatalogScenes

// ============================================================
// Enriched fixtures — activate ALL optional fields so every
// catalog layer has a corresponding VCL element
// ============================================================

const ENRICHED_FIXTURES: Record<string, unknown> = {
  cover: {
    title: 'Test Book Title',
    subtitle: 'A subtitle',           // activates baseContent layer
    author: 'Test Author',
    coverImageUrl: '/covers/test.jpg',
    brandLabel: 'Editorial Signal',
  } satisfies CoverContent,

  chapterDivider: {
    chapterNumber: 1,
    chapterTitle: 'Chapter One',
    chapterSubtitle: 'A subtitle',    // activates baseContent layer
  } satisfies ChapterDividerContent,

  keyInsight: {
    headline: 'Key insight headline text here',
    supportText: 'Support text here', // activates supportText layer
    useSignalBar: true,               // activates signalBar layer
  } satisfies KeyInsightContent,

  compareContrast: {
    leftLabel: 'Before',
    leftContent: 'Old approach description',
    rightLabel: 'After',
    rightContent: 'New approach description',
    leftTag: 'before',               // activates labels layer (tag)
    rightTag: 'after',               // activates labels layer (tag)
    showConnector: true,             // activates emphasis layer
  } satisfies CompareContrastContent,

  quote: {
    quoteText: 'A meaningful quote for testing purposes.',
    attribution: 'Test Author',
  } satisfies QuoteContent,

  framework: {
    frameworkLabel: 'Test Framework',
    items: [
      { number: 1, title: 'First', description: 'Desc one' },
      { number: 2, title: 'Second' },
    ],
    showConnectors: true,             // activates connectors layer
  } satisfies FrameworkContent,

  application: {
    anchorStatement: 'How to apply this in practice',
    steps: [
      { title: 'Step One', detail: 'Detail' },
      { title: 'Step Two' },
    ],
    showPaths: true,                  // activates paths layer
  } satisfies ApplicationContent,

  data: {
    chartType: 'bar',
    dataLabel: 'Test Data',
    data: [
      { label: 'A', value: 10 },
      { label: 'B', value: 20 },
    ],
    annotation: 'Some note',          // activates annotation layer
    sourceCredit: 'Source: Test',     // activates sourceCredit layer
  } satisfies DataContent,

  closing: {
    recapStatement: 'Final recap statement.',
    ctaText: 'Subscribe now',         // activates cta layer
    showBrandLabel: true,             // activates brandLabel layer
  } satisfies ClosingContent,
}

// ============================================================
// Tests
// ============================================================

describe('Drift Detection: factory VCL elements vs catalog LAYERS', () => {
  Object.entries(presetBlueprintRegistry).forEach(([sceneType, factory]) => {
    describe(sceneType, () => {
      const content = ENRICHED_FIXTURES[sceneType]
      const blueprint = factory(content, mockResolveContext())

      const catalogLayerEntries = Object.entries(catalogScenes[sceneType].layers)
      const nonUtilityLayers = catalogLayerEntries.filter(([name]) => !UTILITY_LAYER_NAMES.has(name))
      const nonUtilityZIndexSet = new Set(nonUtilityLayers.map(([, z]) => z))

      // For forward check: ALL elements (texture-overlay counts for "texture" layer)
      const elementLayerValues = blueprint.elements.map(e => e.props.layer as number)

      // For reverse check: exclude structural/decoration types
      const nonStructuralElements = blueprint.elements.filter(
        e => !STRUCTURAL_VCL_TYPES.has(e.type as string)
      )

      // --- Forward: catalog layer → VCL element ---
      it('forward: every non-utility catalog layer has at least one VCL element with that layer zIndex', () => {
        for (const [layerName, layerZ] of nonUtilityLayers) {
          const hasElement = elementLayerValues.includes(layerZ)
          expect(
            hasElement,
            `No VCL element found for catalog layer "${layerName}" (z=${layerZ}) in scene "${sceneType}". ` +
            `Element layer values: [${elementLayerValues.join(', ')}]`
          ).toBe(true)
        }
      })

      // --- Reverse: VCL element → catalog layer ---
      it('reverse: every non-structural VCL element has a props.layer matching a known catalog layer zIndex', () => {
        // Collect all catalog layer zIndex values (including utility) for the reverse check
        const allLayerZIndexSet = new Set(catalogLayerEntries.map(([, z]) => z))

        for (const el of nonStructuralElements) {
          const elLayer = el.props.layer as number
          const isKnown = allLayerZIndexSet.has(elLayer)
          expect(
            isKnown,
            `VCL element "${el.id}" (type: ${el.type}) has props.layer=${elLayer} which does not match ` +
            `any catalog layer zIndex in "${sceneType}". ` +
            `Known zIndex values: [${[...allLayerZIndexSet].join(', ')}]`
          ).toBe(true)
        }
      })
    })
  })
})
