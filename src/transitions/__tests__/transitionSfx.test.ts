import { describe, it, expect } from "vitest";
import {
  TRANSITION_SFX,
  SFX_VOLUME,
  resolveTransitionSfx,
} from "../transitionSfx";
import type { TransitionIntent } from "../mapTransitionIntent";

describe("TRANSITION_SFX constant", () => {
  it("maps directional to whoosh", () => {
    expect(TRANSITION_SFX.directional).toBe("whoosh-placeholder.mp3");
  });

  it("maps morph to shimmer", () => {
    expect(TRANSITION_SFX.morph).toBe("shimmer-placeholder.mp3");
  });

  it("maps fade to null (silent)", () => {
    expect(TRANSITION_SFX.fade).toBeNull();
  });

  it("maps cut to null (silent)", () => {
    expect(TRANSITION_SFX.cut).toBeNull();
  });
});

describe("SFX_VOLUME", () => {
  it("is within 0.3–0.5 range", () => {
    expect(SFX_VOLUME).toBeGreaterThanOrEqual(0.3);
    expect(SFX_VOLUME).toBeLessThanOrEqual(0.5);
  });
});

describe("resolveTransitionSfx", () => {
  it("returns whoosh for directional transition", () => {
    const result = resolveTransitionSfx(["directional"]);
    expect(result).toEqual(["whoosh-placeholder.mp3"]);
  });

  it("returns null for fade transition", () => {
    const result = resolveTransitionSfx(["fade"]);
    expect(result).toEqual([null]);
  });

  it("returns null for cut transition", () => {
    const result = resolveTransitionSfx(["cut"]);
    expect(result).toEqual([null]);
  });

  it("returns shimmer for morph transition", () => {
    const result = resolveTransitionSfx(["morph"]);
    expect(result).toEqual(["shimmer-placeholder.mp3"]);
  });

  it("returns null for undefined intent", () => {
    const result = resolveTransitionSfx([undefined]);
    expect(result).toEqual([null]);
  });

  it("deduplicates consecutive identical SFX", () => {
    const intents: (TransitionIntent | undefined)[] = [
      "directional",
      "directional",
    ];
    const result = resolveTransitionSfx(intents);
    expect(result).toEqual(["whoosh-placeholder.mp3", null]);
  });

  it("does not dedup when different SFX are between", () => {
    const intents: (TransitionIntent | undefined)[] = [
      "directional",
      "morph",
      "directional",
    ];
    const result = resolveTransitionSfx(intents);
    expect(result).toEqual([
      "whoosh-placeholder.mp3",
      "shimmer-placeholder.mp3",
      "whoosh-placeholder.mp3",
    ]);
  });

  it("dedup applies even with null intents between", () => {
    // fade produces null SFX, so directional→fade→directional:
    // lastSfx after fade is still null (from fade), so second directional plays
    const intents: (TransitionIntent | undefined)[] = [
      "directional",
      "fade",
      "directional",
    ];
    const result = resolveTransitionSfx(intents);
    expect(result).toEqual([
      "whoosh-placeholder.mp3",
      null,
      "whoosh-placeholder.mp3",
    ]);
  });

  it("handles mixed sequence correctly", () => {
    const intents: (TransitionIntent | undefined)[] = [
      "fade",
      "directional",
      "directional",
      "cut",
      "morph",
      "morph",
    ];
    const result = resolveTransitionSfx(intents);
    expect(result).toEqual([
      null, // fade → silent
      "whoosh-placeholder.mp3", // directional → whoosh
      null, // directional → dedup'd
      null, // cut → silent
      "shimmer-placeholder.mp3", // morph → shimmer
      null, // morph → dedup'd
    ]);
  });

  it("handles empty array", () => {
    expect(resolveTransitionSfx([])).toEqual([]);
  });
});
