import type { BookContent, Theme, FormatKey } from "@/types";
import type { PlanBridgeResult, ResolvedScene, StoryboardScene } from "./types";
import { loadBookPlan } from "./loaders/load-book-plan";
import { resolveBookTheme } from "./theme-resolver";
import type { ResolvedArtInfluence } from "./theme-resolver";
import { resolveBlueprint } from "./blueprint-resolver";
import { resolveBaseTheme } from "@/design/themes/resolveBaseTheme";

/**
 * Single entry point: load planning artifacts and classify scenes.
 *
 * Rules:
 * - Scene order = content JSON (source of truth), NOT storyboard
 * - Storyboard is partial overlay: only matched sceneIds get planning meta
 * - Scenes not in storyboard → automatic renderMode: 'preset'
 * - hasPlan=false → 100% existing render path
 */
export function resolvePlanBridge(
  book: BookContent,
  format: FormatKey,
): PlanBridgeResult {
  const bookId = book.metadata.id;
  const themeMode = book.production?.themeMode ?? "dark";
  const genre = book.production?.genreOverride ?? book.metadata.genre;

  const plan = loadBookPlan(bookId);

  if (!plan) {
    return {
      bookId,
      theme: resolveBaseTheme(themeMode, genre),
      resolvedScenes: book.scenes.map((scene, i) => ({
        sceneId: scene.id,
        renderMode: "preset" as const,
        presetScene: scene,
        order: i,
        targetDurationSeconds: 0,
      })),
      hasPlan: false,
    };
  }

  // Build storyboard lookup by sceneId
  const storyboardMap = new Map<string, StoryboardScene>();
  for (const entry of plan.storyboard.scenes) {
    storyboardMap.set(entry.sceneId, entry);
  }

  // Theme + art influence with book overrides
  const artInfluence = resolveBookTheme(themeMode, genre, plan.artDirection);

  // Resolve each scene from content JSON order (source of truth)
  const resolvedScenes: ResolvedScene[] = book.scenes.map((scene, i) => {
    const storyEntry = storyboardMap.get(scene.id);

    if (
      storyEntry &&
      storyEntry.renderMode === "blueprint" &&
      storyEntry.blueprintId
    ) {
      const blueprint = resolveBlueprint(
        bookId,
        storyEntry.blueprintId,
        artInfluence,
      );
      return {
        sceneId: scene.id,
        renderMode: "blueprint" as const,
        blueprint,
        order: i,
        targetDurationSeconds: storyEntry.targetDurationSeconds,
        storyboardEntry: storyEntry,
      };
    }

    return {
      sceneId: scene.id,
      renderMode: "preset" as const,
      presetScene: scene,
      order: i,
      targetDurationSeconds: storyEntry?.targetDurationSeconds ?? 0,
      storyboardEntry: storyEntry,
    };
  });

  return {
    bookId,
    theme: artInfluence.theme,
    resolvedScenes,
    hasPlan: true,
    artInfluence,
  };
}
