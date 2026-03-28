import { describe, it, expect } from "vitest";
import {
  BASE_POLICY,
  CHANNEL_PRIORITY,
  RECOVERY_WINDOW_FRAMES,
  HOLD_COMPLETION_FRAMES,
  getEffectivePolicy,
  getActiveChannelCap,
  shouldChannelActivate,
} from "@/design/tokens/emphasisPolicy";
import type { ChannelKey, ChannelPolicy } from "@/types";

describe("emphasisPolicy tokens", () => {
  // -------------------------------------------------------------------------
  // CHANNEL_PRIORITY ordering
  // -------------------------------------------------------------------------
  describe("CHANNEL_PRIORITY", () => {
    it("has sceneText > subtitle > background > camera order", () => {
      expect(CHANNEL_PRIORITY).toEqual([
        "sceneText",
        "subtitle",
        "background",
        "camera",
      ]);
    });

    it("has exactly 4 channels", () => {
      expect(CHANNEL_PRIORITY).toHaveLength(4);
    });
  });

  // -------------------------------------------------------------------------
  // Constants
  // -------------------------------------------------------------------------
  describe("constants", () => {
    it("RECOVERY_WINDOW_FRAMES is 12", () => {
      expect(RECOVERY_WINDOW_FRAMES).toBe(12);
    });

    it("HOLD_COMPLETION_FRAMES is 18", () => {
      expect(HOLD_COMPLETION_FRAMES).toBe(18);
    });
  });

  // -------------------------------------------------------------------------
  // BASE_POLICY per scene type
  // -------------------------------------------------------------------------
  describe("BASE_POLICY", () => {
    it("highlight enables subtitle, sceneText, camera but not background", () => {
      expect(BASE_POLICY.highlight).toEqual({
        subtitle: true,
        sceneText: true,
        camera: true,
        background: false,
      });
    });

    it("keyInsight enables subtitle, sceneText, background but not camera", () => {
      expect(BASE_POLICY.keyInsight).toEqual({
        subtitle: true,
        sceneText: true,
        camera: false,
        background: true,
      });
    });

    it("cover disables all channels", () => {
      expect(BASE_POLICY.cover).toEqual({
        subtitle: false,
        sceneText: false,
        camera: false,
        background: false,
      });
    });

    it("quote enables subtitle and sceneText only", () => {
      expect(BASE_POLICY.quote).toEqual({
        subtitle: true,
        sceneText: true,
        camera: false,
        background: false,
      });
    });

    it("covers all SceneType values", () => {
      const expectedTypes = [
        "highlight",
        "keyInsight",
        "framework",
        "quote",
        "compareContrast",
        "cover",
        "closing",
        "chapterDivider",
        "application",
        "data",
        "timeline",
        "transition",
        "listReveal",
        "splitQuote",
        "custom",
      ];
      for (const t of expectedTypes) {
        expect(BASE_POLICY).toHaveProperty(t);
      }
    });
  });

  // -------------------------------------------------------------------------
  // getEffectivePolicy
  // -------------------------------------------------------------------------
  describe("getEffectivePolicy", () => {
    it("balanced returns base policy as-is", () => {
      const policy = getEffectivePolicy("highlight", "balanced");
      expect(policy).toEqual(BASE_POLICY.highlight);
    });

    it("text-first disables camera", () => {
      const policy = getEffectivePolicy("highlight", "text-first");
      expect(policy.camera).toBe(false);
      // highlight base has camera:true, text-first overrides to false
      expect(policy.sceneText).toBe(true);
      expect(policy.subtitle).toBe(true);
    });

    it("diagram-first disables sceneText, enables background", () => {
      const policy = getEffectivePolicy("highlight", "diagram-first");
      expect(policy.sceneText).toBe(false);
      expect(policy.background).toBe(true);
      // camera should remain from base (true for highlight)
      expect(policy.camera).toBe(true);
    });

    it("defaults to balanced when no emphasisStyle given", () => {
      const policy = getEffectivePolicy("framework");
      expect(policy).toEqual(BASE_POLICY.framework);
    });

    it("falls back to closing policy for unknown scene type", () => {
      const policy = getEffectivePolicy("nonexistent" as any);
      expect(policy).toEqual(BASE_POLICY.closing);
    });
  });

  // -------------------------------------------------------------------------
  // getActiveChannelCap
  // -------------------------------------------------------------------------
  describe("getActiveChannelCap", () => {
    it("returns the given cap for longform", () => {
      expect(getActiveChannelCap(2, "longform")).toBe(2);
      expect(getActiveChannelCap(3, "longform")).toBe(3);
    });

    it("forces cap=1 for shorts", () => {
      expect(getActiveChannelCap(3, "shorts")).toBe(1);
      expect(getActiveChannelCap(2, "shorts")).toBe(1);
    });

    it("defaults to cap=2 longform when no args", () => {
      expect(getActiveChannelCap()).toBe(2);
    });

    it("enforces minimum cap of 1", () => {
      expect(getActiveChannelCap(0, "longform")).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // shouldChannelActivate
  // -------------------------------------------------------------------------
  describe("shouldChannelActivate", () => {
    const fullPolicy: ChannelPolicy = {
      sceneText: true,
      subtitle: true,
      background: true,
      camera: true,
    };

    it("returns false when channel is disabled in policy", () => {
      const policy: ChannelPolicy = { ...fullPolicy, camera: false };
      expect(shouldChannelActivate("camera", policy, new Set(), 2, false)).toBe(
        false,
      );
    });

    it("returns false during recovery window", () => {
      expect(
        shouldChannelActivate("sceneText", fullPolicy, new Set(), 2, true),
      ).toBe(false);
    });

    it("returns true when already active (regardless of cap)", () => {
      const active = new Set<ChannelKey>(["sceneText", "subtitle"]);
      expect(
        shouldChannelActivate("sceneText", fullPolicy, active, 2, false),
      ).toBe(true);
    });

    it("returns true when under cap", () => {
      const active = new Set<ChannelKey>(["sceneText"]);
      expect(
        shouldChannelActivate("subtitle", fullPolicy, active, 2, false),
      ).toBe(true);
    });

    it("blocks lower-priority channel when cap is reached", () => {
      // sceneText + subtitle active (cap=2), camera (lowest priority) blocked
      const active = new Set<ChannelKey>(["sceneText", "subtitle"]);
      expect(
        shouldChannelActivate("camera", fullPolicy, active, 2, false),
      ).toBe(false);
    });

    it("blocks background when cap=2 and sceneText + subtitle are active", () => {
      const active = new Set<ChannelKey>(["sceneText", "subtitle"]);
      expect(
        shouldChannelActivate("background", fullPolicy, active, 2, false),
      ).toBe(false);
    });

    it("allows higher-priority channel to preempt when cap is reached", () => {
      // background + camera active (cap=2), sceneText (highest) can preempt
      const active = new Set<ChannelKey>(["background", "camera"]);
      expect(
        shouldChannelActivate("sceneText", fullPolicy, active, 2, false),
      ).toBe(true);
    });

    it("simultaneousMotionCap=1 allows only one channel", () => {
      const active = new Set<ChannelKey>(["sceneText"]);
      expect(
        shouldChannelActivate("subtitle", fullPolicy, active, 1, false),
      ).toBe(false);
      expect(
        shouldChannelActivate("camera", fullPolicy, active, 1, false),
      ).toBe(false);
    });

    it("text-first policy: sceneText active, camera blocked by policy", () => {
      const textFirstPolicy: ChannelPolicy = {
        sceneText: true,
        subtitle: true,
        background: false,
        camera: false,
      };
      expect(
        shouldChannelActivate(
          "sceneText",
          textFirstPolicy,
          new Set(),
          2,
          false,
        ),
      ).toBe(true);
      expect(
        shouldChannelActivate("camera", textFirstPolicy, new Set(), 2, false),
      ).toBe(false);
      expect(
        shouldChannelActivate(
          "background",
          textFirstPolicy,
          new Set(),
          2,
          false,
        ),
      ).toBe(false);
    });
  });
});
