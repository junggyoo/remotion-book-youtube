/**
 * useEmphasisGate — Channel-level emphasis activation gate (P2-4).
 *
 * Each channel component (CameraLayer, SubtitleLayer, BeatElement) calls this
 * hook to determine whether it should respond to emphasis. This implements
 * distributed coordination: no central orchestrator, each component queries
 * the shared BeatTimelineState.
 *
 * Priority order: sceneText > subtitle > background > camera.
 * When simultaneousMotionCap is exceeded, lower-priority channels are gated.
 * During recovery window (12f after emphasis), all new activations are blocked.
 */

import { useMemo } from "react";
import type {
  ChannelKey,
  EmphasisStyle,
  SceneType,
  FormatKey,
  BeatTimelineState,
} from "@/types";
import {
  getEffectivePolicy,
  getActiveChannelCap,
  shouldChannelActivate,
} from "@/design/tokens/emphasisPolicy";

interface UseEmphasisGateOptions {
  /** Which channel this component represents */
  channelKey: ChannelKey;
  /** Scene type for policy lookup */
  sceneType: SceneType;
  /** BookArtDirection.emphasisStyle */
  emphasisStyle?: EmphasisStyle;
  /** BookArtDirection.simultaneousMotionCap */
  simultaneousMotionCap?: number;
  /** Current format */
  format?: FormatKey;
  /** Beat timeline state (from useBeatTimeline) */
  beatTimeline: Pick<
    BeatTimelineState,
    "activeChannels" | "isInRecoveryWindow"
  >;
}

interface EmphasisGateResult {
  /** Whether this channel should respond to emphasis */
  isChannelActive: boolean;
  /** Whether we're in the recovery window after emphasis */
  isRecovering: boolean;
}

/**
 * Determine if a specific channel should respond to emphasis.
 *
 * Usage:
 * ```ts
 * const { isChannelActive, isRecovering } = useEmphasisGate({
 *   channelKey: "camera",
 *   sceneType: "highlight",
 *   beatTimeline,
 * });
 * // If !isChannelActive, suppress emphasis-driven motion
 * ```
 */
export function useEmphasisGate({
  channelKey,
  sceneType,
  emphasisStyle = "balanced",
  simultaneousMotionCap = 2,
  format = "longform",
  beatTimeline,
}: UseEmphasisGateOptions): EmphasisGateResult {
  const policy = useMemo(
    () => getEffectivePolicy(sceneType, emphasisStyle),
    [sceneType, emphasisStyle],
  );

  const cap = useMemo(
    () => getActiveChannelCap(simultaneousMotionCap, format),
    [simultaneousMotionCap, format],
  );

  const isChannelActive = shouldChannelActivate(
    channelKey,
    policy,
    beatTimeline.activeChannels,
    cap,
    beatTimeline.isInRecoveryWindow,
    sceneType,
  );

  return {
    isChannelActive,
    isRecovering: beatTimeline.isInRecoveryWindow,
  };
}
