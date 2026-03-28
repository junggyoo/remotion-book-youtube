import { describe, it, expect } from "vitest";
import { loadFaceImages, saveThumbnail } from "../generate";
import fs from "fs";
import path from "path";
import os from "os";

describe("loadFaceImages", () => {
  it("loads jpg and png files from directory", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "face-test-"));
    fs.writeFileSync(path.join(tmpDir, "face1.jpg"), Buffer.from("fake-jpg"));
    fs.writeFileSync(path.join(tmpDir, "face2.png"), Buffer.from("fake-png"));
    fs.writeFileSync(path.join(tmpDir, "readme.txt"), "not an image");

    const images = loadFaceImages(tmpDir);

    expect(images).toHaveLength(2);
    expect(images[0].mimeType).toBe("image/jpeg");
    expect(images[1].mimeType).toBe("image/png");

    fs.rmSync(tmpDir, { recursive: true });
  });

  it("throws if directory is empty or has no images", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "face-test-empty-"));

    expect(() => loadFaceImages(tmpDir)).toThrow("No face reference images");

    fs.rmSync(tmpDir, { recursive: true });
  });
});

describe("saveThumbnail", () => {
  it("saves image buffer and prompt to output directory", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "thumb-out-"));
    const imageBuffer = Buffer.from("fake-image-data");
    const prompt = "test prompt";

    const result = saveThumbnail(tmpDir, "test-book", imageBuffer, prompt);

    expect(fs.existsSync(result.imagePath)).toBe(true);
    expect(fs.existsSync(result.promptPath)).toBe(true);
    expect(fs.readFileSync(result.promptPath, "utf-8")).toBe("test prompt");

    fs.rmSync(tmpDir, { recursive: true });
  });
});
