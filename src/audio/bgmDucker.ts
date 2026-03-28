/**
 * BGM auto-ducking engine.
 *
 * Computes per-frame BGM volume that ducks under narration and includes
 * anti-pumping logic to avoid rapid volume oscillation during short gaps.
 */
import { interpolate } from "remotion";
import type { Caption } from "@remotion/captions";
import type { BGMDuckingConfig } from "@/types";

export const DEFAULT_DUCKING_CONFIG: BGMDuckingConfig = {
  narratingVolume: 0.04,
  silenceVolume: 0.12,
  attackFrames: 6,
  releaseFrames: 18,
  minSilenceBeforeRelease: 12,
};

/**
 * Compute BGM volume for a given frame.
 *
 * - During a caption -> duck to narratingVolume (with attack ramp)
 * - Short gap between captions (< minSilenceBeforeRelease) -> stay ducked (anti-pumping)
 * - Long silence -> release to silenceVolume (with release ramp)
 * - No captions at all -> silenceVolume
 */
export function computeBgmVolume(
  frame: number,
  captions: Caption[],
  config: BGMDuckingConfig = DEFAULT_DUCKING_CONFIG,
  fps: number = 30,
): number {
  if (!captions || captions.length === 0) {
    return config.silenceVolume;
  }

  const frameMs = (frame / fps) * 1000;

  // Check if we're inside any caption
  const isInCaption = captions.some(
    (c) => frameMs >= c.startMs && frameMs < c.endMs,
  );

  if (isInCaption) {
    // Find how many frames since caption start (for attack ramp)
    const activeCaption = captions.find(
      (c) => frameMs >= c.startMs && frameMs < c.endMs,
    )!;
    const captionStartFrame = (activeCaption.startMs / 1000) * fps;
    const framesSinceCaptionStart = frame - captionStartFrame;

    if (framesSinceCaptionStart < config.attackFrames) {
      // Ramp down from silenceVolume to narratingVolume
      return interpolate(
        framesSinceCaptionStart,
        [0, config.attackFrames],
        [config.silenceVolume, config.narratingVolume],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      );
    }
    return config.narratingVolume;
  }

  // We're in a gap — check if it's short enough to stay ducked (anti-pumping)
  const prevCaption = findPreviousCaption(captions, frameMs);
  const nextCaption = findNextCaption(captions, frameMs);

  if (prevCaption && nextCaption) {
    const gapMs = nextCaption.startMs - prevCaption.endMs;
    const gapFrames = (gapMs / 1000) * fps;

    if (gapFrames < config.minSilenceBeforeRelease) {
      // Short gap — stay ducked to prevent pumping
      return config.narratingVolume;
    }

    // Long gap — release with ramp
    const framesSinceGapStart = frame - (prevCaption.endMs / 1000) * fps;

    if (framesSinceGapStart < config.releaseFrames) {
      return interpolate(
        framesSinceGapStart,
        [0, config.releaseFrames],
        [config.narratingVolume, config.silenceVolume],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      );
    }
    return config.silenceVolume;
  }

  // Before first caption or after last caption
  if (prevCaption && !nextCaption) {
    // After last caption — release ramp
    const framesSinceEnd = frame - (prevCaption.endMs / 1000) * fps;
    if (framesSinceEnd < config.releaseFrames) {
      return interpolate(
        framesSinceEnd,
        [0, config.releaseFrames],
        [config.narratingVolume, config.silenceVolume],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      );
    }
    return config.silenceVolume;
  }

  // Before first caption
  return config.silenceVolume;
}

function findPreviousCaption(
  captions: Caption[],
  frameMs: number,
): Caption | null {
  let prev: Caption | null = null;
  for (const c of captions) {
    if (c.endMs <= frameMs) {
      if (!prev || c.endMs > prev.endMs) {
        prev = c;
      }
    }
  }
  return prev;
}

function findNextCaption(captions: Caption[], frameMs: number): Caption | null {
  let next: Caption | null = null;
  for (const c of captions) {
    if (c.startMs > frameMs) {
      if (!next || c.startMs < next.startMs) {
        next = c;
      }
    }
  }
  return next;
}
