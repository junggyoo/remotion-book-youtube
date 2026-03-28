import { describe, it, expect } from "vitest";
import { generateThumbnailConfig } from "../auto-config";
import type { BookFingerprint } from "@/types";

const baseFingerprint: BookFingerprint = {
  genre: "selfHelp",
  structure: "framework",
  coreFramework: "습관 루프",
  keyConceptCount: 4,
  emotionalTone: ["hopeful", "determined"],
  narrativeArcType: "transformation",
  urgencyLevel: "medium",
  visualMotifs: ["growth", "compound"],
  spatialMetaphors: ["ladder"],
  hookStrategy: "transformation",
  entryAngle: "작은 변화가 큰 결과를 만든다",
  uniqueElements: ["1% 법칙"],
  contentMode: "actionable",
};

describe("generateThumbnailConfig", () => {
  it("generates a valid ThumbnailConfig from BookFingerprint", () => {
    const result = generateThumbnailConfig(baseFingerprint);

    expect(result.hookText).toBeTruthy();
    expect(result.hookText.length).toBeLessThanOrEqual(30);
    expect(result.expression).toBeTruthy();
    expect(result.gesture).toBeTruthy();
    expect(result.mood).toBeDefined();
    expect(result.backgroundStyle).toBeTruthy();
  });

  it("maps pain hookStrategy to distressed expression", () => {
    const fp = { ...baseFingerprint, hookStrategy: "pain" as const };
    const result = generateThumbnailConfig(fp);

    expect(result.expression).toContain("고민");
  });

  it("maps contrarian hookStrategy to dismissive gesture", () => {
    const fp = { ...baseFingerprint, hookStrategy: "contrarian" as const };
    const result = generateThumbnailConfig(fp);

    expect(result.gesture).toContain("X");
  });

  it("maps high urgency to urgent mood", () => {
    const fp = { ...baseFingerprint, urgencyLevel: "high" as const };
    const result = generateThumbnailConfig(fp);

    expect(result.mood).toBe("urgent");
  });

  it("maps low urgency to confident mood", () => {
    const fp = { ...baseFingerprint, urgencyLevel: "low" as const };
    const result = generateThumbnailConfig(fp);

    expect(result.mood).toBe("confident");
  });

  it("uses entryAngle as hookText base", () => {
    const fp = { ...baseFingerprint, entryAngle: "돈의 흐름을 바꿔라" };
    const result = generateThumbnailConfig(fp);

    expect(result.hookText).toBe("돈의 흐름을 바꿔라");
  });

  it("truncates hookText to 30 chars if entryAngle is too long", () => {
    const fp = {
      ...baseFingerprint,
      entryAngle:
        "이것은 삼십자를 훨씬 초과하는 아주 아주 아주 긴 엔트리 앵글입니다",
    };
    const result = generateThumbnailConfig(fp);

    expect(result.hookText.length).toBeLessThanOrEqual(30);
  });

  it("extracts accentWord from coreFramework when available", () => {
    const fp = { ...baseFingerprint, coreFramework: "현금흐름 사분면" };
    const result = generateThumbnailConfig(fp);

    expect(result.accentWord).toBe("현금흐름 사분면");
  });

  it("extracts accentWord from uniqueElements when no coreFramework", () => {
    const fp = {
      ...baseFingerprint,
      coreFramework: undefined,
      uniqueElements: ["1% 법칙"],
    };
    const result = generateThumbnailConfig(fp);

    expect(result.accentWord).toBe("1% 법칙");
  });
});

describe("generateThumbnailConfig - real book scenarios", () => {
  it("generates reasonable config for a business book", () => {
    const businessFp: BookFingerprint = {
      genre: "business",
      structure: "framework",
      coreFramework: "현금흐름 사분면",
      keyConceptCount: 4,
      emotionalTone: ["provocative", "determined"],
      narrativeArcType: "revelation",
      urgencyLevel: "high",
      visualMotifs: ["money", "flow"],
      spatialMetaphors: ["quadrant"],
      hookStrategy: "contrarian",
      entryAngle: "월급쟁이는 절대 부자가 못 된다",
      uniqueElements: ["부자 아빠 vs 가난한 아빠"],
      contentMode: "actionable",
    };

    const result = generateThumbnailConfig(businessFp);

    expect(result.hookText).toBe("월급쟁이는 절대 부자가 못 된다");
    expect(result.accentWord).toBe("현금흐름 사분면");
    expect(result.mood).toBe("urgent");
    expect(result.backgroundStyle).toContain("gold");
    expect(result.gesture).toContain("X");
  });

  it("generates reasonable config for a psychology book", () => {
    const psychFp: BookFingerprint = {
      genre: "psychology",
      structure: "narrative",
      keyConceptCount: 3,
      emotionalTone: ["curious", "insightful"],
      narrativeArcType: "exploration",
      urgencyLevel: "low",
      visualMotifs: ["mirror", "depth"],
      spatialMetaphors: ["layers"],
      hookStrategy: "question",
      entryAngle: "왜 우리는 스스로를 속이는가",
      uniqueElements: ["인지 편향"],
      contentMode: "conceptual",
    };

    const result = generateThumbnailConfig(psychFp);

    expect(result.hookText).toBe("왜 우리는 스스로를 속이는가");
    expect(result.accentWord).toBe("인지 편향");
    expect(result.mood).toBe("confident");
    expect(result.backgroundStyle).toContain("purple");
    expect(result.gesture).toContain("턱");
  });
});
