import { describe, it, expect } from "vitest";
import type { VCLElement } from "@/types";
import { countUp } from "../choreography/countUp";

const makeEl = (type = "text"): VCLElement =>
  ({
    id: Math.random().toString(36).slice(2),
    type,
    props: {},
  }) as unknown as VCLElement;

const TOTAL_DURATION = 120;

describe("countUp choreography", () => {
  it("returns empty array for 0 elements", () => {
    expect(countUp([], TOTAL_DURATION, "smooth")).toEqual([]);
  });

  it("returns 1 timing for 1 element", () => {
    const result = countUp([makeEl()], TOTAL_DURATION, "smooth");
    expect(result).toHaveLength(1);
    expect(result[0].delayFrames).toBe(0);
    expect(result[0].durationFrames).toBeGreaterThan(0);
  });

  it("number-display gets 1.5x hold duration", () => {
    const standardEl = makeEl("text");
    const numberEl = makeEl("number-display");
    const [standardResult] = countUp([standardEl], TOTAL_DURATION, "smooth");
    const [numberResult] = countUp([numberEl], TOTAL_DURATION, "smooth");
    expect(numberResult.durationFrames).toBe(
      Math.round(standardResult.durationFrames * 1.5),
    );
  });

  it("standard elements get base duration", () => {
    const result = countUp(
      [makeEl("text"), makeEl("label")],
      TOTAL_DURATION,
      "smooth",
    );
    for (const timing of result) {
      expect(timing.durationFrames).toBe(30); // BASE_DURATION
    }
  });

  it("number-display gets 45 frames (30 * 1.5)", () => {
    const result = countUp(
      [makeEl("number-display")],
      TOTAL_DURATION,
      "smooth",
    );
    expect(result[0].durationFrames).toBe(45);
  });

  it("delays increase by stagger per element", () => {
    const result = countUp(
      [makeEl(), makeEl(), makeEl()],
      TOTAL_DURATION,
      "smooth", // stagger = 6
    );
    expect(result[0].delayFrames).toBe(0);
    expect(result[1].delayFrames).toBe(6);
    expect(result[2].delayFrames).toBe(12);
  });

  it("uses preset-specific stagger (snappy=4)", () => {
    const result = countUp([makeEl(), makeEl()], TOTAL_DURATION, "snappy");
    expect(result[1].delayFrames).toBe(4);
  });

  it("uses preset-specific stagger (gentle=8)", () => {
    const result = countUp([makeEl(), makeEl()], TOTAL_DURATION, "gentle");
    expect(result[1].delayFrames).toBe(8);
  });

  it("uses preset-specific stagger (dramatic=7)", () => {
    const result = countUp([makeEl(), makeEl()], TOTAL_DURATION, "dramatic");
    expect(result[1].delayFrames).toBe(7);
  });

  it("mixed elements: number-display and standard have different durations", () => {
    const elements = [makeEl("text"), makeEl("number-display"), makeEl("text")];
    const result = countUp(elements, TOTAL_DURATION, "smooth");
    expect(result[0].durationFrames).toBe(30);
    expect(result[1].durationFrames).toBe(45);
    expect(result[2].durationFrames).toBe(30);
  });

  it("delays are sequential regardless of element type", () => {
    const elements = [
      makeEl("number-display"),
      makeEl("text"),
      makeEl("number-display"),
    ];
    const result = countUp(elements, TOTAL_DURATION, "heavy"); // stagger = 5
    expect(result[0].delayFrames).toBe(0);
    expect(result[1].delayFrames).toBe(5);
    expect(result[2].delayFrames).toBe(10);
  });

  it("falls back to default stagger for unknown preset", () => {
    const result = countUp(
      [makeEl(), makeEl()],
      TOTAL_DURATION,
      "unknown-preset" as never,
    );
    // default stagger = 6
    expect(result[1].delayFrames).toBe(6);
  });
});
