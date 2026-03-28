/**
 * sync-root.ts — Scans content/books/*.json and generates book import/Composition
 * entries in src/Root.tsx between marker comments.
 *
 * Usage: npx ts-node scripts/sync-root.ts
 *
 * Preserves manual compositions (test-book, SynthesizedPreview, BlueprintV2Preview)
 * outside the marker block. Only modifies the auto-generated section.
 */

import { readdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

const CONTENT_DIR = path.resolve(__dirname, "../content/books");
const ROOT_PATH = path.resolve(__dirname, "../src/Root.tsx");

const START_MARKER = "// --- AUTO-GENERATED BOOKS START ---";
const END_MARKER = "// --- AUTO-GENERATED BOOKS END ---";

const IMPORT_START_MARKER = "// --- AUTO-GENERATED IMPORTS START ---";
const IMPORT_END_MARKER = "// --- AUTO-GENERATED IMPORTS END ---";

/** Convert kebab-case filename to PascalCase composition ID */
function toPascalCase(kebab: string): string {
  return kebab
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/** Convert kebab-case to camelCase variable name */
function toCamelCase(kebab: string): string {
  const pascal = toPascalCase(kebab);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

interface BookEntry {
  filename: string; // e.g. "rich-dad-poor-dad.json"
  bookId: string; // e.g. "rich-dad-poor-dad"
  compositionId: string; // e.g. "RichDadPoorDad"
  varName: string; // e.g. "richDadPoorDad"
  importName: string; // e.g. "richDadPoorDadBook"
  propsName: string; // e.g. "richDadPoorDadProps"
}

function discoverBooks(): BookEntry[] {
  const files = readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".json"))
    .filter((f) => f !== "test-book.json") // test-book is manually handled
    .sort();

  return files.map((filename) => {
    const bookId = filename.replace(".json", "");
    const varName = toCamelCase(bookId);
    return {
      filename,
      bookId,
      compositionId: toPascalCase(bookId),
      varName,
      importName: `${varName}Book`,
      propsName: `${varName}Props`,
    };
  });
}

function generateImports(books: BookEntry[]): string {
  return books
    .map((b) => `import ${b.importName} from "../content/books/${b.filename}";`)
    .join("\n");
}

function generatePropsBlock(books: BookEntry[]): string {
  const lines: string[] = [];
  for (const b of books) {
    lines.push(
      `const ${b.propsName}: CompositionProps = buildCompositionProps(${b.importName} as unknown as BookContent, "longform");`,
    );
  }
  return lines.join("\n");
}

function generateCompositions(books: BookEntry[]): string {
  const lines: string[] = [];
  for (const b of books) {
    lines.push(`      <Composition
        id="${b.compositionId}"
        component={LongformComposition as any}
        durationInFrames={${b.propsName}.totalDurationFrames}
        fps={${b.propsName}.fps}
        width={${b.propsName}.width}
        height={${b.propsName}.height}
        defaultProps={${b.propsName} as any}
        calculateMetadata={calculateMetadataFromManifest as any}
      />`);
  }
  return lines.join("\n");
}

function syncRoot(): void {
  const books = discoverBooks();
  const rootContent = readFileSync(ROOT_PATH, "utf-8");

  // Check markers exist
  if (
    !rootContent.includes(START_MARKER) ||
    !rootContent.includes(END_MARKER)
  ) {
    console.error(
      `Markers not found in Root.tsx. Please add:\n  ${START_MARKER}\n  ${END_MARKER}`,
    );
    process.exit(1);
  }
  if (
    !rootContent.includes(IMPORT_START_MARKER) ||
    !rootContent.includes(IMPORT_END_MARKER)
  ) {
    console.error(
      `Import markers not found in Root.tsx. Please add:\n  ${IMPORT_START_MARKER}\n  ${IMPORT_END_MARKER}`,
    );
    process.exit(1);
  }

  // Replace import section
  const importRegex = new RegExp(
    `${escapeRegex(IMPORT_START_MARKER)}[\\s\\S]*?${escapeRegex(IMPORT_END_MARKER)}`,
  );
  let updated = rootContent.replace(
    importRegex,
    `${IMPORT_START_MARKER}\n${generateImports(books)}\n${IMPORT_END_MARKER}`,
  );

  // Replace composition section
  const compositionRegex = new RegExp(
    `${escapeRegex(START_MARKER)}[\\s\\S]*?${escapeRegex(END_MARKER)}`,
  );
  const propsBlock = generatePropsBlock(books);
  const compositionsBlock = generateCompositions(books);
  updated = updated.replace(
    compositionRegex,
    `${START_MARKER}\n${propsBlock}\n\n${compositionsBlock}\n      ${END_MARKER}`,
  );

  writeFileSync(ROOT_PATH, updated, "utf-8");

  console.log(`Synced ${books.length} books to Root.tsx:`);
  for (const b of books) {
    console.log(`  ${b.compositionId} <- content/books/${b.filename}`);
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

syncRoot();
