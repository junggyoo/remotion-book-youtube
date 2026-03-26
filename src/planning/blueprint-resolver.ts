import { existsSync, readFileSync, readdirSync } from "fs";
import path from "path";
import type { SceneBlueprint } from "@/types";

const GENERATED_ROOT = path.resolve("generated/books");

/**
 * Load a blueprint JSON by bookId and blueprintId.
 * Throws on missing file (fail-fast — validated before render).
 */
export function resolveBlueprint(
  bookId: string,
  blueprintId: string,
): SceneBlueprint {
  const blueprintPath = path.join(
    GENERATED_ROOT,
    bookId,
    "06-blueprints",
    `${blueprintId}.blueprint.json`,
  );

  if (!existsSync(blueprintPath)) {
    throw new Error(
      `Blueprint not found: ${blueprintPath}\n` +
        `Hint: blueprintId="${blueprintId}" in storyboard must match a file in 06-blueprints/`,
    );
  }

  return JSON.parse(readFileSync(blueprintPath, "utf-8")) as SceneBlueprint;
}

/**
 * List all blueprint IDs in a book's 06-blueprints/ directory.
 */
export function listBlueprints(bookId: string): string[] {
  const dir = path.join(GENERATED_ROOT, bookId, "06-blueprints");
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((f: string) => f.endsWith(".blueprint.json"))
    .map((f: string) => f.replace(".blueprint.json", ""));
}
