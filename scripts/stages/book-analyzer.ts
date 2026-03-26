/**
 * BookAnalyzer stage runner — extracts BookFingerprint from content JSON.
 *
 * Analyzes scene types, content structure, and narration patterns
 * to produce a deterministic fingerprint for the planning pipeline.
 */

import "tsconfig-paths/register";
import { readFileSync } from "fs";
import path from "path";
import type { BookContent, GenreKey } from "../../src/types";
import type {
  DsgsStage,
  DsgsContext,
  DsgsStageResult,
} from "../dsgs-orchestrate";
import { FingerprintSchema } from "../../src/planning/schemas";
import { savePlanArtifact } from "../../src/planning/loaders/save-book-plan";

type Structure = "framework" | "narrative" | "argument" | "collection";
type ContentMode = "actionable" | "conceptual" | "narrative" | "mixed";
type NarrativeArcType =
  | "transformation"
  | "discovery"
  | "warning"
  | "instruction";
type HookStrategy =
  | "pain"
  | "contrarian"
  | "transformation"
  | "identity"
  | "question"
  | "system"
  | "urgency";
type UrgencyLevel = "low" | "medium" | "high";

function inferStructure(book: BookContent): Structure {
  const types = book.scenes.map((s) => s.type);
  const hasFramework = types.includes("framework");
  const hasApplication = types.includes("application");
  const hasTimeline = types.includes("timeline");
  const hasQuote = types.includes("quote");

  if (hasFramework || hasApplication) return "framework";
  if (hasTimeline) return "narrative";
  if (hasQuote && !hasFramework) return "argument";
  return "collection";
}

function inferContentMode(book: BookContent): ContentMode {
  const types = book.scenes.map((s) => s.type);
  const actionableTypes = types.filter(
    (t) => t === "application" || t === "framework",
  );
  const conceptualTypes = types.filter(
    (t) => t === "keyInsight" || t === "data",
  );
  const narrativeTypes = types.filter((t) => t === "quote" || t === "timeline");

  if (actionableTypes.length >= 2) return "actionable";
  if (conceptualTypes.length >= 2) return "conceptual";
  if (narrativeTypes.length >= 2) return "narrative";
  return "mixed";
}

function inferNarrativeArc(book: BookContent): NarrativeArcType {
  const structure = inferStructure(book);
  const types = book.scenes.map((s) => s.type);

  if (structure === "framework") return "instruction";
  if (types.includes("compareContrast")) return "transformation";
  if (types.includes("timeline")) return "discovery";
  return "instruction";
}

function inferHookStrategy(book: BookContent): HookStrategy {
  const firstScenes = book.scenes.slice(0, 3);
  const hookScene = firstScenes.find(
    (s) => s.type === "highlight" || s.type === "keyInsight",
  );
  const narration = hookScene?.narrationText ?? "";

  if (
    narration.includes("마세요") ||
    narration.includes("아닙니다") ||
    narration.includes("아니라")
  )
    return "contrarian";
  if (
    narration.includes("왜") ||
    narration.includes("어떻게") ||
    narration.includes("무엇")
  )
    return "question";
  if (narration.includes("변화") || narration.includes("달라"))
    return "transformation";
  if (
    narration.includes("시스템") ||
    narration.includes("법칙") ||
    narration.includes("원리")
  )
    return "system";
  if (
    narration.includes("지금") ||
    narration.includes("당장") ||
    narration.includes("즉시")
  )
    return "urgency";

  const genre = book.metadata.genre as GenreKey;
  const genreDefaults: Record<string, HookStrategy> = {
    selfHelp: "system",
    psychology: "question",
    business: "system",
    philosophy: "question",
    science: "contrarian",
    ai: "urgency",
  };
  return genreDefaults[genre] ?? "question";
}

function inferUrgency(book: BookContent): UrgencyLevel {
  const totalChars = book.scenes.reduce(
    (sum, s) => sum + (s.narrationText?.length ?? 0),
    0,
  );
  const target = book.production?.targetDurationSeconds ?? 300;
  const density = totalChars / target;

  if (density > 7) return "high";
  if (density > 5) return "medium";
  return "low";
}

function extractCoreFramework(book: BookContent): string | undefined {
  const frameworkScene = book.scenes.find((s) => s.type === "framework");
  if (!frameworkScene) return undefined;
  const content = frameworkScene.content as unknown as Record<string, unknown>;
  return (
    (content?.headline as string) ?? (content?.title as string) ?? undefined
  );
}

function countKeyConcepts(book: BookContent): number {
  let count = 0;
  for (const scene of book.scenes) {
    if (scene.type === "keyInsight") count++;
    if (scene.type === "framework") {
      const content = scene.content as unknown as Record<string, unknown>;
      const items = content?.items as unknown[];
      count += items?.length ?? 1;
    }
  }
  return Math.max(count, 1);
}

function extractVisualMotifs(book: BookContent): string[] {
  const motifs: string[] = [];
  for (const scene of book.scenes) {
    if (scene.type === "data") motifs.push("data visualization");
    if (scene.type === "compareContrast") motifs.push("split comparison");
    if (scene.type === "framework") motifs.push("structured framework");
    if (scene.type === "timeline") motifs.push("timeline progression");
    if (scene.type === "quote") motifs.push("quote emphasis");
  }
  return [...new Set(motifs)];
}

function extractEntryAngle(book: BookContent): string {
  const hookScene = book.scenes.find(
    (s) => s.type === "highlight" || s.type === "keyInsight",
  );
  if (hookScene?.content) {
    const content = hookScene.content as unknown as Record<string, unknown>;
    const headline =
      (content?.mainText as string) ?? (content?.headline as string);
    if (headline) return headline;
  }
  return book.metadata.title;
}

export const analyzeBook: DsgsStage = {
  id: "1-analyzer",
  name: "BookAnalyzer",
  async run(ctx: DsgsContext): Promise<DsgsStageResult> {
    const start = Date.now();
    const book = JSON.parse(readFileSync(ctx.bookPath, "utf-8")) as BookContent;

    const fingerprint = {
      genre: (book.metadata.genre ?? "selfHelp") as string,
      subGenre: undefined as string | undefined,
      structure: inferStructure(book),
      coreFramework: extractCoreFramework(book),
      keyConceptCount: countKeyConcepts(book),
      emotionalTone: "uplifting" as string,
      narrativeArcType: inferNarrativeArc(book),
      urgencyLevel: inferUrgency(book),
      visualMotifs: extractVisualMotifs(book),
      spatialMetaphors: [] as string[],
      hookStrategy: inferHookStrategy(book),
      entryAngle: extractEntryAngle(book),
      uniqueElements: [] as string[],
      contentMode: inferContentMode(book),
    };

    // Validate before saving
    const result = FingerprintSchema.safeParse(fingerprint);
    if (!result.success) {
      return {
        stageId: "1-analyzer",
        status: "halted",
        artifacts: [],
        durationMs: Date.now() - start,
        message: `Fingerprint validation failed: ${result.error.issues.map((i) => i.message).join(", ")}`,
      };
    }

    savePlanArtifact(ctx.bookId, "00-fingerprint", fingerprint);
    const outPath = path.join(ctx.planDir, "00-fingerprint.json");

    return {
      stageId: "1-analyzer",
      status: "success",
      artifacts: [outPath],
      durationMs: Date.now() - start,
      message: `Fingerprint: genre=${fingerprint.genre}, structure=${fingerprint.structure}, hook=${fingerprint.hookStrategy}`,
    };
  },
};
