import fs from "fs";
import path from "path";
import { validateBook } from "../src/pipeline/validate";

const args = process.argv.slice(2);
const filePath = args[0];

if (!filePath) {
  console.error(
    "Usage: ts-node scripts/validate-content.ts <content-json-path>",
  );
  process.exit(1);
}

const absPath = path.resolve(process.cwd(), filePath);
if (!fs.existsSync(absPath)) {
  console.error(`File not found: ${absPath}`);
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(absPath, "utf-8"));

validateBook(raw).then((result) => {
  console.log(`\n=== Validation Result: ${result.level} ===\n`);

  if (result.errors.length > 0) {
    console.log("ERRORS:");
    result.errors.forEach((e) => console.log(`  ❌ ${e}`));
  }

  if (result.warnings.length > 0) {
    console.log("WARNINGS:");
    result.warnings.forEach((w) => console.log(`  ⚠️  ${w}`));
  }

  if (result.level === "PASS" && result.errors.length === 0) {
    console.log("✅ All checks passed.");
  }

  process.exit(result.level === "BLOCKED" ? 1 : 0);
});
