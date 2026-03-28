import { describe, it, expect } from "vitest";
import {
  getChannelPriority,
  shouldChannelActivate,
  CHANNEL_PRIORITY,
} from "../emphasisPolicy";
import type { ChannelKey, ChannelPolicy } from "@/types";

// ---------------------------------------------------------------------------
// getChannelPriority
// ---------------------------------------------------------------------------

describe("getChannelPriority", () => {
  it("returns default priority for scene types without override", () => {
    const priority = getChannelPriority("closing");
    expect(priority).toEqual(["sceneText", "subtitle", "background", "camera"]);
  });

  it("returns camera-first priority for highlight scenes", () => {
    const priority = getChannelPriority("highlight");
    expect(priority).toEqual(["camera", "sceneText", "subtitle", "background"]);
  });

  it("falls back to default priority for custom scenes", () => {
    const priority = getChannelPriority("custom");
    expect(priority).toEqual(["sceneText", "subtitle", "background", "camera"]);
  });

  it("returns background-first for data scenes", () => {
    const priority = getChannelPriority("data");
    expect(priority).toEqual(["background", "subtitle", "sceneText", "camera"]);
  });
});

// ---------------------------------------------------------------------------
// shouldChannelActivate with sceneType
// ---------------------------------------------------------------------------

describe("shouldChannelActivate with sceneType", () => {
  const allEnabledPolicy: ChannelPolicy = {
    sceneText: true,
    subtitle: true,
    background: true,
    camera: true,
  };

  it("uses default priority when sceneType is not provided", () => {
    // At cap=1 with subtitle active, sceneText (higher default priority) can preempt
    const active = new Set<ChannelKey>(["subtitle"]);
    expect(
      shouldChannelActivate("sceneText", allEnabledPolicy, active, 1, false),
    ).toBe(true);
    // camera (lower default priority) cannot preempt subtitle
    expect(
      shouldChannelActivate("camera", allEnabledPolicy, active, 1, false),
    ).toBe(false);
  });

  it("uses highlight priority when sceneType is highlight", () => {
    // In highlight scenes, camera is highest priority
    // At cap=1 with subtitle active, camera can preempt because it's higher priority
    const active = new Set<ChannelKey>(["subtitle"]);
    expect(
      shouldChannelActivate(
        "camera",
        allEnabledPolicy,
        active,
        1,
        false,
        "highlight",
      ),
    ).toBe(true);
  });

  it("uses data priority when sceneType is data", () => {
    // In data scenes, background is highest priority
    // At cap=1 with sceneText active, background can preempt
    const active = new Set<ChannelKey>(["sceneText"]);
    expect(
      shouldChannelActivate(
        "background",
        allEnabledPolicy,
        active,
        1,
        false,
        "data",
      ),
    ).toBe(true);
    // camera is lowest in data priority, cannot preempt sceneText
    expect(
      shouldChannelActivate(
        "camera",
        allEnabledPolicy,
        active,
        1,
        false,
        "data",
      ),
    ).toBe(false);
  });

  it("falls back to default priority for scene types without override", () => {
    // closing has no override, so default priority applies
    const active = new Set<ChannelKey>(["subtitle"]);
    // sceneText is higher than subtitle in default → can preempt
    expect(
      shouldChannelActivate(
        "sceneText",
        allEnabledPolicy,
        active,
        1,
        false,
        "closing",
      ),
    ).toBe(true);
    // camera is lower than subtitle in default → cannot preempt
    expect(
      shouldChannelActivate(
        "camera",
        allEnabledPolicy,
        active,
        1,
        false,
        "closing",
      ),
    ).toBe(false);
  });
});
