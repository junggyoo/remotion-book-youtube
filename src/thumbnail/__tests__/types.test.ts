import { describe, it, expect } from "vitest";
import { ThumbnailConfigSchema } from "../types";

describe("ThumbnailConfigSchema", () => {
  it("validates a complete thumbnail config", () => {
    const config = {
      hookText: "흔들리지 않는 사람의 비밀",
      expression: "놀란 표정, 입을 크게 벌림",
      gesture: "양손으로 얼굴을 받침",
      mood: "dramatic" as const,
      backgroundStyle: "dark gradient with subtle light streaks",
    };
    const result = ThumbnailConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("validates with only required fields", () => {
    const config = {
      hookText: "습관의 힘",
      expression: "확신에 찬 표정",
      gesture: "손가락으로 가리킴",
    };
    const result = ThumbnailConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("rejects empty hookText", () => {
    const config = {
      hookText: "",
      expression: "놀란 표정",
      gesture: "손 들기",
    };
    const result = ThumbnailConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it("rejects hookText over 30 chars", () => {
    const config = {
      hookText:
        "이것은삼십자를초과하는아주아주아주아주아주아주긴훅텍스트입니다",
      expression: "놀란 표정",
      gesture: "손 들기",
    };
    const result = ThumbnailConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it("rejects invalid mood value", () => {
    const config = {
      hookText: "테스트",
      expression: "놀란 표정",
      gesture: "손 들기",
      mood: "invalid",
    };
    const result = ThumbnailConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });
});
