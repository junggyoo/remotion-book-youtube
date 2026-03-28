import { describe, it, expect } from "vitest";
import { compositeText, wrapText } from "../composite";
import sharp from "sharp";

describe("wrapText", () => {
  it("does not wrap short text", () => {
    const lines = wrapText("짧은 텍스트", 15);
    expect(lines).toEqual(["짧은 텍스트"]);
  });

  it("wraps text exceeding maxChars into two lines", () => {
    const lines = wrapText("1%의 변화가 인생을 바꾼다", 12);
    expect(lines).toHaveLength(2);
    expect(lines[0].length).toBeLessThanOrEqual(12);
    expect(lines[1].length).toBeGreaterThan(0);
  });

  it("handles text that is exactly maxChars", () => {
    const text = "가나다라마바사아자차카타파하가"; // 15 chars
    const lines = wrapText(text, 15);
    expect(lines).toEqual([text]);
  });
});

describe("compositeText", () => {
  it("returns a valid PNG buffer with text composited", async () => {
    const testImage = await sharp({
      create: {
        width: 1280,
        height: 720,
        channels: 4,
        background: { r: 30, g: 30, b: 50, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const result = await compositeText(testImage, "테스트 텍스트");

    const metadata = await sharp(result).metadata();
    expect(metadata.format).toBe("png");
    expect(metadata.width).toBe(1280);
    expect(metadata.height).toBe(720);
  });

  it("handles two-line text", async () => {
    const testImage = await sharp({
      create: {
        width: 1280,
        height: 720,
        channels: 4,
        background: { r: 30, g: 30, b: 50, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const result = await compositeText(testImage, "1%의 변화가 인생을 바꾼다");

    const metadata = await sharp(result).metadata();
    expect(metadata.format).toBe("png");
    expect(metadata.width).toBe(1280);
    expect(metadata.height).toBe(720);
  });
});
