/**
 * Emphasis Channel Policy tokens (P2-4).
 *
 * Defines per-scene-type channel activation rules for emphasis response.
 * Channels: sceneText, subtitle, background, camera.
 * Priority order: sceneText > subtitle > background > camera.
 *
 * simultaneousMotionCap limits how many channels can respond at once.
 * Recovery window prevents chaotic consecutive reactions.
 */

import type {
  ChannelKey,
  ChannelPolicy,
  EmphasisStyle,
  SceneType,
  FormatKey,
} from "@/types";

// ---------------------------------------------------------------------------
// Channel priority (highest first)
// ---------------------------------------------------------------------------

export const CHANNEL_PRIORITY: readonly ChannelKey[] = [
  "sceneText",
  "subtitle",
  "background",
  "camera",
] as const;

const DEFAULT_PRIORITY: ChannelKey[] = [
  "sceneText",
  "subtitle",
  "background",
  "camera",
];

const SCENE_PRIORITY_OVERRIDES: Partial<Record<SceneType, ChannelKey[]>> = {
  highlight: ["camera", "sceneText", "subtitle", "background"],
  data: ["background", "subtitle", "sceneText", "camera"],
};

/**
 * Get channel priority ordering for a given scene type.
 * Returns scene-specific override if defined, otherwise the default priority.
 */
export function getChannelPriority(sceneType: SceneType): ChannelKey[] {
  return SCENE_PRIORITY_OVERRIDES[sceneType] ?? DEFAULT_PRIORITY;
}

// ---------------------------------------------------------------------------
// Recovery window
// ---------------------------------------------------------------------------

/** Frames of stillness after an emphasis beat ends (P2-4 spec: 12f) */
export const RECOVERY_WINDOW_FRAMES = 12;

/** Extended hold frames when completionBehavior is "hold" (P2-4 spec: 18f) */
export const HOLD_COMPLETION_FRAMES = 18;

// ---------------------------------------------------------------------------
// Base channel policy per scene type
// ---------------------------------------------------------------------------

export const BASE_POLICY: Record<SceneType, ChannelPolicy> = {
  highlight: {
    subtitle: true,
    sceneText: true,
    camera: true,
    background: false,
  },
  keyInsight: {
    subtitle: true,
    sceneText: true,
    camera: false,
    background: true,
  },
  framework: {
    subtitle: true,
    sceneText: true,
    camera: false,
    background: true,
  },
  quote: {
    subtitle: true,
    sceneText: true,
    camera: false,
    background: false,
  },
  compareContrast: {
    subtitle: true,
    sceneText: false,
    camera: false,
    background: true,
  },
  cover: {
    subtitle: false,
    sceneText: false,
    camera: false,
    background: false,
  },
  closing: {
    subtitle: true,
    sceneText: false,
    camera: false,
    background: false,
  },
  chapterDivider: {
    subtitle: false,
    sceneText: false,
    camera: false,
    background: true,
  },
  application: {
    subtitle: true,
    sceneText: true,
    camera: false,
    background: false,
  },
  data: {
    subtitle: true,
    sceneText: false,
    camera: false,
    background: false,
  },
  timeline: {
    subtitle: true,
    sceneText: true,
    camera: false,
    background: false,
  },
  transition: {
    subtitle: false,
    sceneText: false,
    camera: false,
    background: false,
  },
  listReveal: {
    subtitle: true,
    sceneText: true,
    camera: false,
    background: false,
  },
  splitQuote: {
    subtitle: true,
    sceneText: true,
    camera: false,
    background: false,
  },
  custom: {
    subtitle: true,
    sceneText: true,
    camera: false,
    background: false,
  },
};

// ---------------------------------------------------------------------------
// Effective policy (base + emphasisStyle override)
// ---------------------------------------------------------------------------

/**
 * Compute effective channel policy for a scene type and emphasis style.
 *
 * - text-first: disables camera (focus on text channels)
 * - diagram-first: disables sceneText, enables background (focus on visual)
 * - balanced: uses base policy as-is
 */
export function getEffectivePolicy(
  sceneType: SceneType,
  emphasisStyle: EmphasisStyle = "balanced",
): ChannelPolicy {
  const base = BASE_POLICY[sceneType] ?? BASE_POLICY.closing;

  if (emphasisStyle === "text-first") {
    return { ...base, camera: false };
  }
  if (emphasisStyle === "diagram-first") {
    return { ...base, sceneText: false, background: true };
  }
  return base;
}

// ---------------------------------------------------------------------------
// Simultaneous motion cap
// ---------------------------------------------------------------------------

/**
 * Get effective simultaneous motion cap.
 * Shorts format forces cap to 1 (small screen = one reaction at a time).
 * "both" format uses the given cap (same as longform — per-composition format is resolved upstream).
 */
export function getActiveChannelCap(
  simultaneousMotionCap: number = 2,
  format: FormatKey = "longform",
): number {
  if (format === "shorts") return 1;
  return Math.max(1, simultaneousMotionCap);
}

// ---------------------------------------------------------------------------
// Channel gating logic (pure function, no hooks)
// ---------------------------------------------------------------------------

/**
 * Determine if a channel should be active given the current state.
 * Used by useEmphasisGate hook and tests.
 *
 * @returns true if the channel is allowed to respond to emphasis
 */
export function shouldChannelActivate(
  channelKey: ChannelKey,
  policy: ChannelPolicy,
  activeChannels: Set<ChannelKey>,
  cap: number,
  isInRecoveryWindow: boolean,
  sceneType?: SceneType,
): boolean {
  // Channel disabled by policy
  if (!policy[channelKey]) return false;

  // During recovery window, no new activations
  if (isInRecoveryWindow) return false;

  // Already active — stay active
  if (activeChannels.has(channelKey)) return true;

  // Use scene-type-specific priority if provided, otherwise global default
  const priority = sceneType ? getChannelPriority(sceneType) : CHANNEL_PRIORITY;

  // Cap check: if at capacity, only higher-priority channels can activate
  if (activeChannels.size >= cap) {
    const myPriority = priority.indexOf(channelKey);
    const lowestActivePriority = Math.max(
      ...Array.from(activeChannels).map((ch) => priority.indexOf(ch)),
    );
    // Can only activate if higher priority (lower index) than lowest active
    return myPriority < lowestActivePriority;
  }

  return true;
}
