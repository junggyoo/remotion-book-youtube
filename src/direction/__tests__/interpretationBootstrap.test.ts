import { describe, it, expect } from "vitest";
import {
  resolveDirectionFromFingerprint,
  resolveSceneFamily,
} from "../interpretationBootstrap";

describe("interpretationBootstrap", () => {
  describe("resolveDirectionFromFingerprint", () => {
    it("psychology genre → analytical", () => {
      const result = resolveDirectionFromFingerprint({
        genre: "psychology",
        structure: "framework",
        emotionalTone: ["disciplined"],
      });
      expect(result.name).toBe("analytical");
    });

    it("selfHelp genre → persuasive", () => {
      const result = resolveDirectionFromFingerprint({
        genre: "selfHelp",
        structure: "framework",
        emotionalTone: ["uplifting"],
      });
      expect(result.name).toBe("persuasive");
    });

    it("business genre → systematic", () => {
      const result = resolveDirectionFromFingerprint({
        genre: "business",
        structure: "argument",
        emotionalTone: ["disciplined"],
      });
      expect(result.name).toBe("systematic");
    });

    it("philosophy genre → contemplative", () => {
      const result = resolveDirectionFromFingerprint({
        genre: "philosophy",
        structure: "narrative",
        emotionalTone: ["reflective"],
      });
      expect(result.name).toBe("contemplative");
    });

    it("science genre → investigative", () => {
      const result = resolveDirectionFromFingerprint({
        genre: "science",
        structure: "framework",
        emotionalTone: ["disciplined"],
      });
      expect(result.name).toBe("investigative");
    });

    it("emotionalTone override: urgent → urgent", () => {
      const result = resolveDirectionFromFingerprint({
        genre: "selfHelp",
        structure: "framework",
        emotionalTone: ["urgent"],
      });
      expect(result.name).toBe("urgent");
    });

    it("emotionalTone override: hopeful → inspirational", () => {
      const result = resolveDirectionFromFingerprint({
        genre: "business",
        structure: "framework",
        emotionalTone: ["hopeful"],
      });
      expect(result.name).toBe("inspirational");
    });
  });

  describe("resolveSceneFamily", () => {
    it("cover → opening-hook", () => {
      expect(resolveSceneFamily("cover")).toBe("opening-hook");
    });
    it("highlight → opening-hook", () => {
      expect(resolveSceneFamily("highlight")).toBe("opening-hook");
    });
    it("keyInsight → concept-introduction", () => {
      expect(resolveSceneFamily("keyInsight")).toBe("concept-introduction");
    });
    it("framework+framework → system-model", () => {
      expect(resolveSceneFamily("framework", "framework")).toBe("system-model");
    });
    it("framework+narrative → mechanism-explanation", () => {
      expect(resolveSceneFamily("framework", "narrative")).toBe(
        "mechanism-explanation",
      );
    });
    it("compareContrast → tension-comparison", () => {
      expect(resolveSceneFamily("compareContrast")).toBe("tension-comparison");
    });
    it("application → progression-journey", () => {
      expect(resolveSceneFamily("application")).toBe("progression-journey");
    });
    it("quote → reflective-anchor", () => {
      expect(resolveSceneFamily("quote")).toBe("reflective-anchor");
    });
    it("chapterDivider → structural-bridge", () => {
      expect(resolveSceneFamily("chapterDivider")).toBe("structural-bridge");
    });
    it("closing → closing-synthesis", () => {
      expect(resolveSceneFamily("closing")).toBe("closing-synthesis");
    });
    it("data → evidence-stack", () => {
      expect(resolveSceneFamily("data")).toBe("evidence-stack");
    });
    it("timeline → progression-journey", () => {
      expect(resolveSceneFamily("timeline")).toBe("progression-journey");
    });
  });
});
