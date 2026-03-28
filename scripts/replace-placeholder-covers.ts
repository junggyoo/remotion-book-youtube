/**
 * One-time script to replace placeholder cover images with real ones from Aladin.
 * Run: npx ts-node scripts/replace-placeholder-covers.ts
 */

import "tsconfig-paths/register";
import { fetchBookCover, PLACEHOLDER_THRESHOLD } from "./utils/fetch-cover";
import { existsSync, statSync, readdirSync, readFileSync } from "fs";
import path from "path";

const books: Array<{ title: string; author: string; file: string }> = [];

// Auto-detect books from content/books/*.json
const booksDir = path.resolve("content/books");
for (const f of readdirSync(booksDir).filter((f) => f.endsWith(".json"))) {
  try {
    const content = JSON.parse(readFileSync(path.join(booksDir, f), "utf-8"));
    const { title, author, id } = content.metadata ?? {};
    if (title && author) {
      // Derive cover filename from book id or filename
      const bookId = id ?? f.replace(".json", "");
      books.push({
        title,
        author,
        file: `${bookId.replace(/-\d{4}$/, "")}-cover`,
      });
    }
  } catch {
    // skip invalid JSON
  }
}

const DELAY_MS = 1000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

(async () => {
  console.log(`Found ${books.length} books to check.\n`);

  let replaced = 0;
  for (let i = 0; i < books.length; i++) {
    const b = books[i];
    const dest = `assets/covers/${b.file}.png`;

    // Skip if real image already exists (any extension)
    const base = dest.replace(/\.\w+$/, "");
    const existing = [".png", ".jpg", ".jpeg", ".webp"]
      .map((ext) => base + ext)
      .find((p) => existsSync(p) && statSync(p).size > PLACEHOLDER_THRESHOLD);

    if (existing) {
      console.log(`${b.file}: SKIP (${statSync(existing).size}B)`);
      continue;
    }

    const result = await fetchBookCover(b.title, b.author, dest);
    if (result.success) {
      console.log(`${b.file}: OK (${result.source}) → ${result.filePath}`);
      replaced++;
    } else {
      console.log(`${b.file}: FAIL — ${result.error}`);
    }

    if (i < books.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\nDone. Replaced ${replaced} covers.`);
})();
