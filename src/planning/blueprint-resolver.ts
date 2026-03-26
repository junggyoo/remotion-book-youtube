import { existsSync, readFileSync, readdirSync } from "fs";
import path from "path";
import type { SceneBlueprint, LayoutType } from "@/types";
import type { ResolvedArtInfluence } from "./theme-resolver";

const GENERATED_ROOT = path.resolve("generated/books");

/** Map layoutBias → LayoutType (only used when blueprint has no explicit layout) */
const LAYOUT_BIAS_MAP: Record<
  NonNullable<ResolvedArtInfluence["layoutBias"]>,
  LayoutType
> = {
  centered: "center-focus",
  asymmetric: "split-two",
  "grid-heavy": "grid-n",
  flow: "timeline-h",
};

/**
 * Load a blueprint JSON by bookId and blueprintId.
 * Optionally apply art direction overlays (explicit blueprint settings always win).
 * Throws on missing file (fail-fast — validated before render).
 */
export function resolveBlueprint(
  bookId: string,
  blueprintId: string,
  artInfluence?: ResolvedArtInfluence,
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

  const blueprint = JSON.parse(
    readFileSync(blueprintPath, "utf-8"),
  ) as SceneBlueprint;

  return applyArtInfluence(blueprint, artInfluence);
}

/**
 * Apply art direction overlays to a loaded blueprint.
 * Principle: explicit blueprint settings ALWAYS win (explicit > implicit).
 */
function applyArtInfluence(
  blueprint: SceneBlueprint,
  artInfluence?: ResolvedArtInfluence,
): SceneBlueprint {
  if (!artInfluence) return blueprint;

  let modified = false;
  const patch: Partial<SceneBlueprint> = {};

  // Layout overlay: only if blueprint has no explicit layout
  if (!blueprint.layout && artInfluence.layoutBias) {
    patch.layout = LAYOUT_BIAS_MAP[artInfluence.layoutBias];
    modified = true;
  }

  // Motion overlay: only if blueprint has no explicit motionPreset
  if (!blueprint.motionPreset && artInfluence.motionPresetHint) {
    patch.motionPreset = artInfluence.motionPresetHint;
    modified = true;
  }

  return modified ? { ...blueprint, ...patch } : blueprint;
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
