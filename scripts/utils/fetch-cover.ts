/**
 * Fetches a book cover image from Aladin (알라딘) by title+author search.
 *
 * Flow:
 *   1. Search Aladin for the book → extract ItemId from result page
 *   2. Fetch the product page → extract cover500 image URL
 *   3. Download the image to the target path
 *
 * No API key required — uses public web pages only.
 */

import https from "https";
import http from "http";
import { writeFileSync, mkdirSync, existsSync, statSync } from "fs";
import path from "path";
import * as cheerio from "cheerio";

/** Placeholder files are ≤5KB. Real covers are >10KB typically. */
export const PLACEHOLDER_THRESHOLD = 5000;

/** HTTP request timeout in milliseconds */
const REQUEST_TIMEOUT_MS = 15_000;

export interface FetchCoverResult {
  success: boolean;
  filePath?: string;
  source?: string;
  error?: string;
}

/**
 * Fetches a URL and returns the response body as a string.
 * Follows redirects (up to 5). Times out after REQUEST_TIMEOUT_MS.
 */
function fetchText(url: string, maxRedirects = 5): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const req = client.get(
      url,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; EditorialSignal/1.0)",
        },
        timeout: REQUEST_TIMEOUT_MS,
      },
      (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          if (maxRedirects <= 0) return reject(new Error("Too many redirects"));
          return resolve(fetchText(res.headers.location, maxRedirects - 1));
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
        res.on("error", reject);
      },
    );
    req.on("timeout", () => {
      req.destroy();
      reject(
        new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms: ${url}`),
      );
    });
    req.on("error", reject);
  });
}

/**
 * Downloads a binary file from a URL to a local path.
 * Detects Content-Type to determine file extension.
 * Returns the actual file path (extension may differ from destPath).
 */
function downloadBinary(
  url: string,
  destPath: string,
  maxRedirects = 5,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const req = client.get(
      url,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; EditorialSignal/1.0)",
        },
        timeout: REQUEST_TIMEOUT_MS,
      },
      (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          if (maxRedirects <= 0) return reject(new Error("Too many redirects"));
          return resolve(
            downloadBinary(res.headers.location, destPath, maxRedirects - 1),
          );
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} downloading ${url}`));
        }

        // Detect actual extension from Content-Type
        const contentType = res.headers["content-type"] ?? "";
        let actualPath = destPath;
        if (contentType.includes("jpeg") || contentType.includes("jpg")) {
          actualPath = destPath.replace(/\.\w+$/, ".jpg");
        } else if (contentType.includes("png")) {
          actualPath = destPath.replace(/\.\w+$/, ".png");
        } else if (contentType.includes("webp")) {
          actualPath = destPath.replace(/\.\w+$/, ".webp");
        }
        // Fallback: use extension from URL
        if (actualPath === destPath && url.match(/\.(jpe?g|png|webp)/i)) {
          const ext = url.match(/\.(jpe?g|png|webp)/i)![0];
          actualPath = destPath.replace(/\.\w+$/, ext);
        }

        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          mkdirSync(path.dirname(actualPath), { recursive: true });
          writeFileSync(actualPath, Buffer.concat(chunks));
          resolve(actualPath);
        });
        res.on("error", reject);
      },
    );
    req.on("timeout", () => {
      req.destroy();
      reject(
        new Error(`Download timed out after ${REQUEST_TIMEOUT_MS}ms: ${url}`),
      );
    });
    req.on("error", reject);
  });
}

/**
 * Searches Aladin for a book and extracts the first matching ItemId.
 */
export async function searchAladinItemId(
  title: string,
  author: string,
): Promise<string | null> {
  const query = encodeURIComponent(`${title} ${author}`);
  const searchUrl = `https://www.aladin.co.kr/search/wsearchresult.aspx?SearchTarget=Book&SearchWord=${query}`;

  const html = await fetchText(searchUrl);
  const $ = cheerio.load(html);

  // Scope to #Search3_Result to skip banner ads at the top of the page
  const productLink = $('#Search3_Result .ss_book_list a[href*="ItemId="]')
    .first()
    .attr("href");
  if (!productLink) {
    // Fallback: try any ItemId link inside #Search3_Result
    const fallbackLink = $('#Search3_Result a[href*="ItemId="]')
      .first()
      .attr("href");
    if (!fallbackLink) return null;
    const fallbackMatch = fallbackLink.match(/ItemId=(\d+)/);
    return fallbackMatch ? fallbackMatch[1] : null;
  }

  const match = productLink.match(/ItemId=(\d+)/);
  return match ? match[1] : null;
}

/**
 * Given an Aladin ItemId, fetches the product page and extracts the cover500 image URL.
 */
export async function extractCoverUrl(itemId: string): Promise<string | null> {
  const productUrl = `https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=${itemId}`;
  const html = await fetchText(productUrl);
  const $ = cheerio.load(html);

  const coverImg = $('img[src*="image.aladin.co.kr/product"]')
    .filter((_, el) => {
      const src = $(el).attr("src") ?? "";
      return src.includes("cover") || src.includes("letslook");
    })
    .first()
    .attr("src");

  if (!coverImg) return null;

  // Normalize to cover500 variant for best quality
  const cover500 = coverImg
    .replace(/cover\d+/, "cover500")
    .replace(/coversum/, "cover500");

  return cover500.startsWith("//") ? `https:${cover500}` : cover500;
}

/**
 * Main entry point: search Aladin by title+author, download cover to destPath.
 * Returns the actual saved file path (extension may differ based on Content-Type).
 */
export async function fetchBookCover(
  title: string,
  author: string,
  destPath: string,
): Promise<FetchCoverResult> {
  try {
    // Skip if file already exists and is a real image (>5KB, not placeholder)
    if (existsSync(destPath)) {
      const stat = statSync(destPath);
      if (stat.size > PLACEHOLDER_THRESHOLD) {
        return { success: true, filePath: destPath, source: "cached" };
      }
    }
    // Also check alternate extensions
    const altExts = [".jpg", ".jpeg", ".png", ".webp"];
    const basePath = destPath.replace(/\.\w+$/, "");
    for (const ext of altExts) {
      const altPath = basePath + ext;
      if (altPath !== destPath && existsSync(altPath)) {
        const stat = statSync(altPath);
        if (stat.size > PLACEHOLDER_THRESHOLD) {
          return { success: true, filePath: altPath, source: "cached" };
        }
      }
    }

    // Step 1: Search Aladin
    const itemId = await searchAladinItemId(title, author);
    if (!itemId) {
      return {
        success: false,
        error: `Aladin search returned no results for "${title}" by ${author}`,
      };
    }

    // Step 2: Extract cover URL
    const coverUrl = await extractCoverUrl(itemId);
    if (!coverUrl) {
      return {
        success: false,
        error: `No cover image found on Aladin product page (ItemId=${itemId})`,
      };
    }

    // Step 3: Download (extension auto-detected from Content-Type)
    const actualPath = await downloadBinary(coverUrl, destPath);

    return { success: true, filePath: actualPath, source: `aladin:${itemId}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
