# SynthesizedBlueprint Template

## Required Fields

```typescript
{
  // Meta
  id: string              // "synth-{segment}-{slotIndex}-{index}"
  intent: string          // from SceneGap.intent
  origin: 'synthesized'   // always 'synthesized'

  // VCL
  layout: LayoutType      // resolved from requiredCapabilities
  elements: VCLElement[]  // built by element builders
  choreography: ChoreographyType  // layout-compatible only
  motionPreset: MotionPresetKey   // from layoutToChoreography mapping

  // Timing
  format: 'longform' | 'shorts'
  theme: Theme
  from: number            // assigned by pipeline orchestrator
  durationFrames: number  // default 180 (6s @30fps)

  // Media (P0-3 critical)
  mediaPlan: MediaPlan    // via buildDefaultMediaPlan()

  // Synthesis-specific
  lifecycle: 'ephemeral' | 'candidate-promotable'
  fallbackPreset: SceneType       // from gap.bestPresetMatch.sceneType
  fallbackContent: SceneContent   // from gap.bestPresetMatch.content
  synthesisConfidence?: number    // 0~1, mapping fidelity
}
```

## Lifecycle Classification

| Priority | Confidence | Result               |
| -------- | ---------- | -------------------- |
| must     | >= 0.8     | candidate-promotable |
| must     | < 0.8      | ephemeral            |
| nice     | any        | ephemeral            |

## Element Assembly Pattern

1. Check content type (FrameworkContent, ApplicationContent, etc.)
2. Map to appropriate element builder
3. Each builder returns `VCLElement[]` with:
   - Unique `id` per element (prefix: `synth-{builderType}-`)
   - `type` matching primitiveRegistry keys
   - `props.layer` for zIndex ordering
   - `props.index` for stagger choreography

## Fallback Guarantee

Every SynthesizedBlueprint MUST have:

- `fallbackPreset`: a valid SceneType from scene-catalog.json
- `fallbackContent`: content matching fallbackPreset's expected shape
- These come directly from `gap.bestPresetMatch` (the rejected preset match)

## MediaPlan Defaults

Use `buildDefaultMediaPlan(narrationText, ctx)`:

- captionPlan: 28 chars/line, 2 lines, fade-slide
- audioPlan: edge-tts, ko-KR-SunHiNeural, speed 1.0
- assetPlan: empty required[], text-only fallback
