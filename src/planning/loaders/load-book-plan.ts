import { existsSync, readFileSync, readdirSync } from "fs";
import path from "path";
import type { BookFingerprint, SceneBlueprint } from "@/types";
import type {
  BookPlan,
  EditorialOutline,
  BookArtDirection,
  StoryboardPlan,
  AssetInventory,
  MotionPlan,
} from "../types";

const GENERATED_ROOT = path.resolve("generated/books");

function readJsonOrNull<T>(filePath: string): T | null {
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, "utf-8")) as T;
}

/**
 * Load all planning artifacts for a book.
 * Returns null if the generated directory does not exist or
 * if the minimum required files (fingerprint + storyboard) are missing.
 */
export function loadBookPlan(bookId: string): BookPlan | null {
  const bookDir = path.join(GENERATED_ROOT, bookId);
  if (!existsSync(bookDir)) return null;

  const fingerprint = readJsonOrNull<BookFingerprint>(
    path.join(bookDir, "00-fingerprint.json"),
  );
  const storyboard = readJsonOrNull<StoryboardPlan>(
    path.join(bookDir, "03-storyboard.json"),
  );

  // Minimum requirement: fingerprint + storyboard must exist
  if (!fingerprint || !storyboard) return null;

  const outline = readJsonOrNull<EditorialOutline>(
    path.join(bookDir, "01-editorial-outline.json"),
  );
  const artDirection = readJsonOrNull<BookArtDirection>(
    path.join(bookDir, "02-art-direction.json"),
  );
  const assetInventory = readJsonOrNull<AssetInventory>(
    path.join(bookDir, "04-asset-inventory.json"),
  );
  const motionPlan = readJsonOrNull<MotionPlan>(
    path.join(bookDir, "05-motion-plan.json"),
  );

  // Load blueprints from 06-blueprints/
  const blueprints: Record<string, SceneBlueprint> = {};
  const blueprintsDir = path.join(bookDir, "06-blueprints");
  if (existsSync(blueprintsDir)) {
    for (const file of readdirSync(blueprintsDir)) {
      if (!file.endsWith(".blueprint.json")) continue;
      const id = file.replace(".blueprint.json", "");
      const bp = readJsonOrNull<SceneBlueprint>(path.join(blueprintsDir, file));
      if (bp) blueprints[id] = bp;
    }
  }

  return {
    fingerprint,
    outline: outline!,
    artDirection: artDirection!,
    storyboard,
    assetInventory: assetInventory ?? { bookId, required: [], reusable: [] },
    motionPlan: motionPlan ?? {
      bookId,
      globalMotionCharacter: "smooth",
      sceneMotions: [],
    },
    blueprints,
  };
}
