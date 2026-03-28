import { describe, it, expect } from "vitest";
import type { Caption } from "@remotion/captions";
import type { BGMDuckingConfig } from "@/types";
import { computeBgmVolume, DEFAULT_DUCKING_CONFIG } from "../bgmDucker";

const FPS = 30;

const defaultConfig: BGMDuckingConfig = {
  narratingVolume: 0.04,
  silenceVolume: 0.12,
  attackFrames: 6,
  releaseFrames: 18,
  minSilenceBeforeRelease: 12,
};

/** Helper: create a Caption at given ms range */
function cap(startMs: number, endMs: number, text = "test"): Caption {
  return {
    startMs,
    endMs,
    text,
    timestampMs: startMs,
    confidence: 1,
  } as Caption;
}

describe("computeBgmVolume", () => {
  it("returns silenceVolume when no captions", () => {
    expect(computeBgmVolume(0, [], defaultConfig, FPS)).toBe(
      defaultConfig.silenceVolume,
    );
    expect(computeBgmVolume(100, [], defaultConfig, FPS)).toBe(
      defaultConfig.silenceVolume,
    );
  });

  it("returns narratingVolume during active caption (past attack)", () => {
    // Caption from 0ms to 5000ms. At frame 30 (1000ms), well past attack.
    const captions = [cap(0, 5000)];
    const vol = computeBgmVolume(30, captions, defaultConfig, FPS);
    expect(vol).toBe(defaultConfig.narratingVolume);
  });

  it("ramps down during attack phase", () => {
    // Caption starts at 1000ms = frame 30. Check frame 31 (just entered).
    const captions = [cap(1000, 5000)];

    // Frame 30 = exactly at caption start, framesSinceCaptionStart = 0
    const volStart = computeBgmVolume(30, captions, defaultConfig, FPS);
    expect(volStart).toBe(defaultConfig.silenceVolume); // start of ramp

    // Frame 33 = 3 frames in, halfway through 6-frame attack
    const volMid = computeBgmVolume(33, captions, defaultConfig, FPS);
    expect(volMid).toBeGreaterThan(defaultConfig.narratingVolume);
    expect(volMid).toBeLessThan(defaultConfig.silenceVolume);

    // Frame 36 = 6 frames in, attack complete
    const volEnd = computeBgmVolume(36, captions, defaultConfig, FPS);
    expect(volEnd).toBe(defaultConfig.narratingVolume);
  });

  it("stays ducked during short gap (anti-pumping)", () => {
    // Two captions with a 200ms gap (~6 frames at 30fps).
    // minSilenceBeforeRelease = 12 frames, so 6 < 12 => stay ducked.
    const captions = [cap(0, 1000), cap(1200, 3000)];

    // Frame at 1100ms (~frame 33) is in the gap
    const gapFrame = Math.round((1100 / 1000) * FPS); // frame 33
    const vol = computeBgmVolume(gapFrame, captions, defaultConfig, FPS);
    expect(vol).toBe(defaultConfig.narratingVolume);
  });

  it("releases after sufficiently long gap", () => {
    // Two captions with a 2000ms gap (~60 frames). 60 > 12 => release.
    const captions = [cap(0, 1000), cap(3000, 5000)];

    // Well into the gap, past releaseFrames (18 frames = 600ms after gap start)
    // Gap starts at 1000ms. At 2000ms (frame 60), 1000ms into gap = 30 frames > 18.
    const vol = computeBgmVolume(60, captions, defaultConfig, FPS);
    expect(vol).toBe(defaultConfig.silenceVolume);
  });

  it("returns silenceVolume before first caption", () => {
    const captions = [cap(2000, 4000)];
    // Frame 0 = 0ms, before the caption
    expect(computeBgmVolume(0, captions, defaultConfig, FPS)).toBe(
      defaultConfig.silenceVolume,
    );
  });

  it("releases after last caption ends", () => {
    const captions = [cap(0, 1000)];
    // 1000ms = frame 30 (caption just ended). Frame 60 = 30 frames later > releaseFrames(18).
    const vol = computeBgmVolume(60, captions, defaultConfig, FPS);
    expect(vol).toBe(defaultConfig.silenceVolume);
  });

  it("exports DEFAULT_DUCKING_CONFIG matching expected defaults", () => {
    expect(DEFAULT_DUCKING_CONFIG).toEqual(defaultConfig);
  });
});
