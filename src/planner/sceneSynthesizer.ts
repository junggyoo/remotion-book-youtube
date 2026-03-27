// ============================================================
// SceneSynthesizer — DSGS Stage 6
// Converts SceneGap[] → SynthesizedBlueprint[] via VCL engine.
// ============================================================

import type {
  SceneGap,
  SynthesizedBlueprint,
  SceneType,
  SceneContent,
  VCLElement,
  FrameworkContent,
  KeyInsightContent,
  ApplicationContent,
  LayoutType,
} from "@/types";
import type { ResolveContext } from "@/renderer/presetBlueprints/types";
import type { BookArtDirection } from "@/planning/types";
import { buildDefaultMediaPlan } from "@/renderer/presetBlueprints/types";
import { resolveLayout, selectChoreography } from "./synthesizerMappings";
import {
  buildRadialElements,
  buildTimelineElements,
  buildSplitElements,
  buildEmphasisElements,
  buildGridElements,
  type RadialItem,
  type TimelineStep,
} from "./elementBuilders";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_SYNTH_DURATION_FRAMES = 180; // 6 seconds at 30fps
const PROMOTABLE_CONFIDENCE_THRESHOLD = 0.8;

// ---------------------------------------------------------------------------
// SynthesizerContext — extends ResolveContext with synthesis-specific data
// ---------------------------------------------------------------------------

export interface SynthesizerContext extends ResolveContext {
  /** Emotional tones from BookFingerprint for choreography selection. */
  emotionalTones: string[];
  /** Art direction for layout bias and motion character weighting. */
  artDirection?: BookArtDirection;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * DSGS Stage 6: Synthesize gaps into custom blueprints via VCL engine.
 *
 * For each SceneGap:
 * 1. resolveLayout — capabilities → LayoutType
 * 2. buildElements — intent + layout → VCLElement[]
 * 3. selectChoreography — layout + emotionalTone → ChoreographyType + MotionPresetKey
 * 4. buildMediaPlan — delegates to buildDefaultMediaPlan
 * 5. determineFallback — bestPresetMatch → fallbackPreset + fallbackContent
 * 6. classifyLifecycle — priority + confidence → ephemeral | candidate-promotable
 */
export function synthesizeGaps(
  gaps: SceneGap[],
  ctx: SynthesizerContext,
): SynthesizedBlueprint[] {
  return gaps.map((gap, index) => synthesizeOne(gap, ctx, index));
}

// ---------------------------------------------------------------------------
// Internal: Synthesize a single gap
// ---------------------------------------------------------------------------

function synthesizeOne(
  gap: SceneGap,
  ctx: SynthesizerContext,
  index: number,
): SynthesizedBlueprint {
  // 1. Resolve layout (with art direction layoutBias weighting)
  const { layout, confidence } = resolveLayout(
    gap.requiredCapabilities,
    ctx.artDirection?.layoutBias,
  );

  // 2. Build VCL elements from gap content
  const elements = buildElementsFromGap(gap, layout);

  // 3. Select choreography (with layout compatibility + art direction motion character)
  const { choreography, motionPreset } = selectChoreography(
    layout,
    ctx.emotionalTones,
    ctx.artDirection?.motionCharacter,
  );

  // 4. Build media plan
  const narrationText = extractNarrationText(gap);
  const mediaPlan = buildDefaultMediaPlan(narrationText, ctx);

  // 5. Determine fallback
  const { fallbackPreset, fallbackContent } = determineFallback(gap);

  // 6. Classify lifecycle
  const lifecycle = classifyLifecycle(gap.priority, confidence);

  return {
    id: `synth-${gap.segment}-${gap.slotIndex}-${index}`,
    intent: gap.intent,
    origin: "synthesized",
    layout,
    elements,
    choreography,
    motionPreset,
    format: ctx.format,
    theme: ctx.theme,
    from: ctx.from,
    durationFrames: ctx.durationFrames || DEFAULT_SYNTH_DURATION_FRAMES,
    mediaPlan,
    lifecycle,
    fallbackPreset,
    fallbackContent,
    synthesisConfidence: confidence,
  };
}

// ---------------------------------------------------------------------------
// Element Builder Dispatch
// ---------------------------------------------------------------------------

function buildElementsFromGap(gap: SceneGap, layout: LayoutType): VCLElement[] {
  const content = gap.bestPresetMatch.content;

  // Radial layouts (cyclic-flow, motif-wheel, etc.)
  if (layout === "radial") {
    return buildRadialFromContent(content, gap.intent);
  }

  // Timeline layouts
  if (layout === "timeline-h") {
    return buildTimelineFromContent(content, gap.intent);
  }

  // Split layouts (before-after, transformation)
  if (layout === "split-two") {
    return buildSplitFromContent(content, gap.intent);
  }

  // Grid layouts (web, rhizome)
  if (layout === "grid-n" || layout === "grid-expand") {
    return buildGridFromContent(content, gap.intent);
  }

  // Center-focus fallback (emphasis, dramatic, custom)
  return buildEmphasisFromContent(content, gap.intent);
}

// ---------------------------------------------------------------------------
// Content → Element Adapters
// ---------------------------------------------------------------------------

function buildRadialFromContent(
  content: SceneContent,
  intent: string,
): VCLElement[] {
  // Try to extract framework items for radial display
  if (isFrameworkContent(content)) {
    const items: RadialItem[] = content.items.map((item) => ({
      label: item.title,
      description: item.description,
      iconId: item.iconId,
    }));
    return buildRadialElements(content.frameworkLabel, items);
  }

  // Fallback: parse intent for items
  return buildRadialElements(extractHeadline(content, intent), [
    { label: intent },
  ]);
}

function buildTimelineFromContent(
  content: SceneContent,
  intent: string,
): VCLElement[] {
  // Try application steps as timeline
  if (isApplicationContent(content)) {
    const steps: TimelineStep[] = content.steps.map((step) => ({
      label: step.title,
      description: step.detail,
    }));
    return buildTimelineElements(steps, content.anchorStatement);
  }

  // Try framework items as timeline
  if (isFrameworkContent(content)) {
    const steps: TimelineStep[] = content.items.map((item) => ({
      label: item.title,
      description: item.description,
    }));
    return buildTimelineElements(steps, content.frameworkLabel);
  }

  // Fallback: single-item timeline
  return buildTimelineElements(
    [{ label: extractHeadline(content, intent) }],
    intent,
  );
}

function buildSplitFromContent(
  content: SceneContent,
  intent: string,
): VCLElement[] {
  // Try compareContrast content shape
  if ("leftLabel" in content && "rightLabel" in content) {
    const cc = content as {
      leftLabel: string;
      leftContent: string;
      rightLabel: string;
      rightContent: string;
      leftTag?: string;
      rightTag?: string;
    };
    return buildSplitElements(
      { label: cc.leftLabel, content: cc.leftContent, tag: cc.leftTag },
      { label: cc.rightLabel, content: cc.rightContent, tag: cc.rightTag },
    );
  }

  // Fallback: before/after from intent
  return buildSplitElements(
    { label: "Before", content: intent },
    { label: "After", content: intent },
  );
}

function buildGridFromContent(
  content: SceneContent,
  intent: string,
): VCLElement[] {
  if (isFrameworkContent(content)) {
    return buildGridElements(
      content.items.map((item) => ({
        label: item.title,
        description: item.description,
      })),
      content.frameworkLabel,
    );
  }

  return buildGridElements([{ label: extractHeadline(content, intent) }]);
}

function buildEmphasisFromContent(
  content: SceneContent,
  intent: string,
): VCLElement[] {
  const headline = extractHeadline(content, intent);
  const support = extractSupportText(content);
  return buildEmphasisElements(headline, support);
}

// ---------------------------------------------------------------------------
// Content Type Guards
// ---------------------------------------------------------------------------

function isFrameworkContent(
  content: SceneContent,
): content is FrameworkContent {
  return (
    "frameworkLabel" in content &&
    "items" in content &&
    Array.isArray((content as FrameworkContent).items)
  );
}

function isApplicationContent(
  content: SceneContent,
): content is ApplicationContent {
  return (
    "anchorStatement" in content &&
    "steps" in content &&
    Array.isArray((content as ApplicationContent).steps)
  );
}

// ---------------------------------------------------------------------------
// Content Extractors
// ---------------------------------------------------------------------------

function extractHeadline(content: SceneContent, fallback: string): string {
  if ("headline" in content) return (content as KeyInsightContent).headline;
  if ("title" in content) return (content as { title: string }).title;
  if ("frameworkLabel" in content)
    return (content as FrameworkContent).frameworkLabel;
  if ("anchorStatement" in content)
    return (content as ApplicationContent).anchorStatement;
  return fallback;
}

function extractSupportText(content: SceneContent): string | undefined {
  if ("supportText" in content)
    return (content as KeyInsightContent).supportText;
  return undefined;
}

function extractNarrationText(gap: SceneGap): string {
  // Use intent as narration source — the pipeline will refine it later
  return gap.intent;
}

// ---------------------------------------------------------------------------
// Fallback & Lifecycle
// ---------------------------------------------------------------------------

function determineFallback(gap: SceneGap): {
  fallbackPreset: SceneType;
  fallbackContent: SceneContent;
} {
  return {
    fallbackPreset: gap.bestPresetMatch.sceneType,
    fallbackContent: gap.bestPresetMatch.content,
  };
}

function classifyLifecycle(
  priority: "must" | "nice",
  confidence: number,
): "ephemeral" | "candidate-promotable" {
  if (priority === "must" && confidence >= PROMOTABLE_CONFIDENCE_THRESHOLD) {
    return "candidate-promotable";
  }
  return "ephemeral";
}
