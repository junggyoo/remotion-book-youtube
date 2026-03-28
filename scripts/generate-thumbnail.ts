/**
 * Generate YouTube thumbnail using Gemini image generation.
 *
 * Usage: npm run thumbnail content/books/atomic-habits.json
 *
 * Requires:
 *   - GOOGLE_AI_API_KEY in .env
 *   - Face reference photos in assets/face/ (jpg/png)
 *   - thumbnail field in book JSON
 *
 * Output:
 *   output/thumbnails/{bookId}/{timestamp}-001.png
 *   output/thumbnails/{bookId}/prompt.txt
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { ThumbnailConfigSchema } from "../src/thumbnail/types";
import { generateThumbnail } from "../src/thumbnail/generate";

const FACE_DIR = path.join(__dirname, "../assets/face");
const COVER_DIR = path.join(__dirname, "../assets/covers");
const OUTPUT_BASE = path.join(__dirname, "../output/thumbnails");

async function main() {
  const startTime = Date.now();

  // 1. Parse CLI args
  const bookPath = process.argv[2];
  if (!bookPath) {
    console.error("Usage: npm run thumbnail <path-to-book-json>");
    console.error(
      "Example: npm run thumbnail content/books/atomic-habits.json",
    );
    process.exit(1);
  }

  const absolutePath = path.isAbsolute(bookPath)
    ? bookPath
    : path.join(process.cwd(), bookPath);

  if (!fs.existsSync(absolutePath)) {
    console.error(`File not found: ${absolutePath}`);
    process.exit(1);
  }

  // 2. Load and validate book JSON
  const book = JSON.parse(fs.readFileSync(absolutePath, "utf-8"));

  if (!book.thumbnail) {
    console.error('Book JSON has no "thumbnail" field.');
    console.error("Add a thumbnail config to your book JSON:");
    console.error(
      JSON.stringify(
        {
          thumbnail: {
            hookText: "훅 카피 (15자 이내)",
            expression: "표정 설명",
            gesture: "제스처 설명",
          },
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  const parsed = ThumbnailConfigSchema.safeParse(book.thumbnail);
  if (!parsed.success) {
    console.error("Invalid thumbnail config:");
    for (const issue of parsed.error.issues) {
      console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  // 3. Check face images
  if (!fs.existsSync(FACE_DIR)) {
    console.error(`Face reference directory not found: ${FACE_DIR}`);
    console.error("Create assets/face/ and add 3-5 face photos (jpg/png).");
    process.exit(1);
  }

  // 4. Generate
  console.log(`Book: ${book.metadata.title} (${book.metadata.id})`);
  console.log(`Hook: "${parsed.data.hookText}"`);
  console.log(`Expression: ${parsed.data.expression}`);
  console.log(`Gesture: ${parsed.data.gesture}`);
  console.log("---");

  const result = await generateThumbnail(
    parsed.data,
    book.metadata,
    FACE_DIR,
    OUTPUT_BASE,
    COVER_DIR,
  );

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log("---");
  console.log(`Thumbnail saved: ${result.imagePath}`);
  console.log(`Prompt saved: ${result.promptPath}`);
  console.log(`Time: ${elapsed}s`);
}

main().catch((err) => {
  console.error("Thumbnail generation failed:", err.message);
  process.exit(1);
});
