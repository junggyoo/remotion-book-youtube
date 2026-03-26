import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";

const GENERATED_ROOT = path.resolve("generated/books");

/**
 * Save a planning artifact as JSON and optionally generate an MD mirror.
 */
export function savePlanArtifact(
  bookId: string,
  filename: string,
  data: unknown,
  generateMd = false,
): void {
  const bookDir = path.join(GENERATED_ROOT, bookId);
  if (!existsSync(bookDir)) mkdirSync(bookDir, { recursive: true });

  const jsonPath = path.join(bookDir, `${filename}.json`);
  writeFileSync(jsonPath, JSON.stringify(data, null, 2), "utf-8");

  if (generateMd) {
    const mdPath = path.join(bookDir, `${filename}.md`);
    writeFileSync(mdPath, jsonToMarkdown(filename, data), "utf-8");
  }
}

/**
 * Save a blueprint JSON to 06-blueprints/.
 */
export function saveBlueprintArtifact(
  bookId: string,
  blueprintId: string,
  data: unknown,
): void {
  const dir = path.join(GENERATED_ROOT, bookId, "06-blueprints");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, `${blueprintId}.blueprint.json`),
    JSON.stringify(data, null, 2),
    "utf-8",
  );
}

/**
 * Save a validation result to .validation/.
 */
export function saveValidationResult(
  bookId: string,
  phase: string,
  data: unknown,
): void {
  const dir = path.join(GENERATED_ROOT, bookId, ".validation");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, `${phase}.json`),
    JSON.stringify(data, null, 2),
    "utf-8",
  );
}

function jsonToMarkdown(filename: string, data: unknown): string {
  const title = filename.replace(/^\d+-/, "").replace(/-/g, " ");
  const lines: string[] = [
    `# ${title.charAt(0).toUpperCase() + title.slice(1)}`,
    "",
  ];

  if (typeof data === "object" && data !== null) {
    for (const [key, value] of Object.entries(
      data as Record<string, unknown>,
    )) {
      if (Array.isArray(value)) {
        lines.push(`## ${key}`, "");
        for (const item of value) {
          if (typeof item === "object" && item !== null) {
            const summary = Object.values(item as Record<string, unknown>)
              .slice(0, 3)
              .join(" | ");
            lines.push(`- ${summary}`);
          } else {
            lines.push(`- ${String(item)}`);
          }
        }
        lines.push("");
      } else if (typeof value === "object" && value !== null) {
        lines.push(`## ${key}`, "");
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
          lines.push(`- **${k}:** ${String(v)}`);
        }
        lines.push("");
      } else {
        lines.push(`**${key}:** ${String(value)}`, "");
      }
    }
  }

  lines.push(
    "---",
    `> Auto-generated from ${filename}.json. JSON is source of truth.`,
  );
  return lines.join("\n");
}
