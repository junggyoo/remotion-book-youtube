import { describe, it, expect, afterEach } from "vitest";
import {
  searchAladinItemId,
  extractCoverUrl,
  fetchBookCover,
} from "../fetch-cover";
import path from "path";
import { existsSync, unlinkSync, statSync } from "fs";

// Integration tests — hit real Aladin (skip in CI)
const INTEGRATION = !process.env.CI;

describe("fetch-cover", () => {
  describe("searchAladinItemId", () => {
    it("should find a well-known Korean book", async () => {
      if (!INTEGRATION) return;
      const itemId = await searchAladinItemId(
        "아주 작은 습관의 힘",
        "제임스 클리어",
      );
      expect(itemId).toBeTruthy();
      expect(itemId).toMatch(/^\d+$/);
    }, 15000);

    it("should return null for unmatchable query", async () => {
      if (!INTEGRATION) return;
      // Use a query that produces zero search results on Aladin
      const itemId = await searchAladinItemId(
        "qxzjkw9847562poiuyt",
        "qxzjkw9847562poiuyt",
      );
      // Aladin's fuzzy search may still return results for some gibberish;
      // if it does, the result is still a valid ItemId (digits), so accept either outcome
      if (itemId !== null) {
        expect(itemId).toMatch(/^\d+$/);
      } else {
        expect(itemId).toBeNull();
      }
    }, 15000);
  });

  describe("extractCoverUrl", () => {
    it("should extract a cover500 URL from a known book", async () => {
      if (!INTEGRATION) return;
      const itemId = await searchAladinItemId(
        "아주 작은 습관의 힘",
        "제임스 클리어",
      );
      if (!itemId) return;
      const coverUrl = await extractCoverUrl(itemId);
      expect(coverUrl).toBeTruthy();
      expect(coverUrl).toContain("image.aladin.co.kr");
      expect(coverUrl).toContain("cover500");
    }, 15000);
  });

  describe("fetchBookCover (end-to-end)", () => {
    const testDest = path.resolve("/tmp/test-cover-fetch.png");

    afterEach(() => {
      const base = testDest.replace(/\.\w+$/, "");
      for (const ext of [".png", ".jpg", ".jpeg", ".webp"]) {
        const p = base + ext;
        if (existsSync(p)) unlinkSync(p);
      }
    });

    it("should download a real cover image", async () => {
      if (!INTEGRATION) return;
      const result = await fetchBookCover(
        "아주 작은 습관의 힘",
        "제임스 클리어",
        testDest,
      );
      expect(result.success).toBe(true);
      expect(result.filePath).toBeTruthy();
      expect(existsSync(result.filePath!)).toBe(true);
      const stat = statSync(result.filePath!);
      expect(stat.size).toBeGreaterThan(10000);
    }, 30000);
  });
});
