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
  it("includes all required parts in the prompt", () => {
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
    expect(prompt).toContain("작은 습관의 힘");
    expect(prompt).toContain("selfHelp");
    expect(prompt).toContain("Do not");
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

  it("includes genre context from metadata", () => {
    const config: ThumbnailConfig = {
      hookText: "테스트",
      expression: "놀란 표정",
      gesture: "손 들기",
    };
    const psychologyMeta = { ...mockMetadata, genre: "psychology" as const };

    const prompt = buildPrompt(config, psychologyMeta);

    expect(prompt).toContain("psychology");
  });
});
