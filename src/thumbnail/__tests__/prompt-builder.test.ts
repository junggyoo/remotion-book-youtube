import { describe, it, expect } from "vitest";
import { buildPrompt } from "../prompt-builder";
import type { ThumbnailConfig } from "../types";

const mockMetadata = {
  id: "atomic-habits",
  title: "Atomic Habits",
  author: "James Clear",
  genre: "selfHelp" as const,
};

describe("buildPrompt", () => {
  it("includes layout, person, and negative rules", () => {
    const config: ThumbnailConfig = {
      hookText: "작은 습관의 힘",
      expression: "확신에 찬 표정",
      gesture: "손가락으로 가리킴",
    };

    const prompt = buildPrompt(config, mockMetadata);

    expect(prompt).toContain("16:9");
    expect(prompt).toContain("1280x720");
    expect(prompt).toContain("확신에 찬 표정");
    expect(prompt).toContain("손가락으로 가리킴");
    expect(prompt).toContain("selfHelp");
    expect(prompt).toContain("Do not");
  });

  it("does NOT include hookText or text style instructions", () => {
    const config: ThumbnailConfig = {
      hookText: "작은 습관의 힘",
      expression: "확신에 찬 표정",
      gesture: "손가락으로 가리킴",
    };

    const prompt = buildPrompt(config, mockMetadata);

    expect(prompt).not.toContain("작은 습관의 힘");
    expect(prompt).not.toContain("Korean text on image");
    expect(prompt).not.toContain("Text style");
    expect(prompt).not.toContain("bold white Korean text");
  });

  it("includes whitespace reservation for text overlay", () => {
    const config: ThumbnailConfig = {
      hookText: "테스트",
      expression: "놀란 표정",
      gesture: "손 들기",
    };

    const prompt = buildPrompt(config, mockMetadata);

    expect(prompt).toContain("upper-left");
    expect(prompt).toContain("text overlay");
  });

  it("uses default mood and background when not specified", () => {
    const config: ThumbnailConfig = {
      hookText: "테스트",
      expression: "놀란 표정",
      gesture: "손 들기",
    };

    const prompt = buildPrompt(config, mockMetadata);

    expect(prompt).toContain("dramatic");
    expect(prompt).toContain("dark cinematic gradient");
  });

  it("uses custom mood and background when specified", () => {
    const config: ThumbnailConfig = {
      hookText: "테스트",
      expression: "놀란 표정",
      gesture: "손 들기",
      mood: "mysterious",
      backgroundStyle: "foggy blue atmosphere",
    };

    const prompt = buildPrompt(config, mockMetadata);

    expect(prompt).toContain("mysterious");
    expect(prompt).toContain("foggy blue atmosphere");
    expect(prompt).not.toContain("dark cinematic gradient");
  });
});
