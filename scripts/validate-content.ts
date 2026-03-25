/**
 * CLI wrapper for content JSON validation.
 *
 * Usage: npx ts-node scripts/validate-content.ts content/books/miracle-morning.json
 */

import fs from "fs";
import path from "path";

// Register tsconfig paths
import "tsconfig-paths/register";

import { validateBook } from "../src/pipeline/validate";

async function main() {
  const bookPath = process.argv[2];
  if (!bookPath) {
    console.error("Usage: npx ts-node scripts/validate-content.ts <book.json>");
    process.exit(1);
  }

  const absPath = path.resolve(process.cwd(), bookPath);
  if (!fs.existsSync(absPath)) {
    console.error(`File not found: ${absPath}`);
    process.exit(1);
  }

  console.log(`\n=== Validate: ${path.basename(absPath)} ===`);

  const raw = JSON.parse(fs.readFileSync(absPath, "utf-8"));
  const result = await validateBook(raw);

  if (result.warnings.length > 0) {
    result.warnings.forEach((w) => console.log(`⚠️  ${w}`));
  }

  if (result.level === "BLOCKED") {
    result.errors.forEach((e) => console.error(`❌ ${e}`));
    console.error(`\n❌ Validation BLOCKED: ${result.errors.length} error(s)`);
    process.exit(1);
  }

  console.log(`✅ Validation PASS (${result.warnings.length} warning(s))`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
