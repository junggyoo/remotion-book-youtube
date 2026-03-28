/**
 * AssetPlanner stage runner — extracts asset requirements from blueprints
 * and cross-references with the existing AssetInventory.
 */

import "tsconfig-paths/register";
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import path from "path";
import type {
  DsgsStage,
  DsgsContext,
  DsgsStageResult,
} from "../dsgs-orchestrate";
import type { AssetInventory } from "../../src/planning/types";
import type { BookArtDirection } from "../../src/planning/types";
import type { DiagramSpec } from "../../src/types";
import { savePlanArtifact } from "../../src/planning/loaders/save-book-plan";
import { extractDiagramSpecs } from "../../src/planning/diagramSpec";
import { fetchBookCover } from "../utils/fetch-cover";
import type { BookContent } from "../../src/types";

interface AssetRequirement {
  assetId: string;
  type: "svg" | "icon" | "diagram" | "texture" | "cover" | "image";
  description: string;
  sourceScenes: string[];
  status: "needed" | "placeholder" | "ready" | "generated";
  fallbackStrategy: "text-only" | "shape-placeholder" | "generic-library";
  diagramSpec?: DiagramSpec;
}

interface AssetRequirementsReport {
  bookId: string;
  totalRequired: number;
  byStatus: Record<string, number>;
  requirements: AssetRequirement[];
}

function loadInventory(planDir: string): AssetInventory | null {
  const invPath = path.join(planDir, "04-asset-inventory.json");
  if (!existsSync(invPath)) return null;
  return JSON.parse(readFileSync(invPath, "utf-8")) as AssetInventory;
}

function loadBlueprints(planDir: string): Array<{
  id: string;
  elements: Array<{ id: string; type: string; props: Record<string, unknown> }>;
}> {
  const bpDir = path.join(planDir, "06-blueprints");
  if (!existsSync(bpDir)) return [];

  return readdirSync(bpDir)
    .filter((f) => f.endsWith(".blueprint.json"))
    .map((f) => {
      const raw = JSON.parse(
        readFileSync(path.join(bpDir, f), "utf-8"),
      ) as Record<string, unknown>;
      return {
        id: raw.id as string,
        elements:
          (raw.elements as Array<{
            id: string;
            type: string;
            props: Record<string, unknown>;
          }>) ?? [],
      };
    });
}

const ASSET_ELEMENT_TYPES = new Set([
  "image",
  "icon",
  "diagram",
  "svg",
  "illustration",
  "chart",
]);

function extractFromBlueprints(
  blueprints: ReturnType<typeof loadBlueprints>,
): AssetRequirement[] {
  const requirements: AssetRequirement[] = [];

  for (const bp of blueprints) {
    for (const el of bp.elements) {
      if (ASSET_ELEMENT_TYPES.has(el.type)) {
        requirements.push({
          assetId: `${bp.id}-${el.id}`,
          type: el.type as AssetRequirement["type"],
          description:
            (el.props?.description as string) ??
            `${el.type} element in ${bp.id}`,
          sourceScenes: [bp.id],
          status: "needed",
          fallbackStrategy: "shape-placeholder",
        });
      }

      // Check props for asset references
      const src = el.props?.src as string | undefined;
      const imageUrl = el.props?.imageUrl as string | undefined;
      const assetRef = src ?? imageUrl;
      if (assetRef && !ASSET_ELEMENT_TYPES.has(el.type)) {
        requirements.push({
          assetId: `${bp.id}-${el.id}-ref`,
          type: "image",
          description: `Referenced asset: ${assetRef}`,
          sourceScenes: [bp.id],
          status: "needed",
          fallbackStrategy: "shape-placeholder",
        });
      }
    }
  }

  return requirements;
}

function mergeWithInventory(
  extracted: AssetRequirement[],
  inventory: AssetInventory | null,
): AssetRequirement[] {
  if (!inventory) return extracted;

  const merged = new Map<string, AssetRequirement>();

  // Start with inventory items
  for (const item of inventory.required) {
    merged.set(item.id, {
      assetId: item.id,
      type: item.type,
      description: item.description,
      sourceScenes: item.usedInScenes,
      status: item.status,
      fallbackStrategy: item.fallbackStrategy,
    });
  }

  // Add blueprint-extracted items not in inventory
  for (const req of extracted) {
    if (!merged.has(req.assetId)) {
      merged.set(req.assetId, req);
    }
  }

  return Array.from(merged.values());
}

function loadArtDirection(planDir: string): BookArtDirection | null {
  const adPath = path.join(planDir, "02-art-direction.json");
  if (!existsSync(adPath)) return null;
  return JSON.parse(readFileSync(adPath, "utf-8")) as BookArtDirection;
}

function enrichWithDiagramSpecs(
  requirements: AssetRequirement[],
  artDirection: BookArtDirection | null,
): { requirements: AssetRequirement[]; diagramMatched: number } {
  if (!artDirection) return { requirements, diagramMatched: 0 };

  const specs = extractDiagramSpecs(artDirection);
  const specByType = new Map(specs.map((s) => [s.metaphorConcept, s.spec]));
  let diagramMatched = 0;

  for (const req of requirements) {
    if (req.type !== "diagram") continue;

    // Try matching by description against known metaphor concepts
    for (const [concept, spec] of specByType) {
      if (
        req.description.toLowerCase().includes(concept.toLowerCase()) ||
        concept.toLowerCase().includes(req.description.toLowerCase())
      ) {
        req.diagramSpec = spec;
        diagramMatched++;
        break;
      }
    }
  }

  return { requirements, diagramMatched };
}

export const planAssets: DsgsStage = {
  id: "6.5-asset-planner",
  name: "AssetPlanner",
  async run(ctx: DsgsContext): Promise<DsgsStageResult> {
    const start = Date.now();

    const inventory = loadInventory(ctx.planDir);
    const artDirection = loadArtDirection(ctx.planDir);
    const blueprints = loadBlueprints(ctx.planDir);
    const extracted = extractFromBlueprints(blueprints);
    const merged = mergeWithInventory(extracted, inventory);

    // Auto-fetch cover image if missing or placeholder
    let coverFetchMsg = "";
    try {
      const bookContent = JSON.parse(
        readFileSync(ctx.bookPath, "utf-8"),
      ) as BookContent;
      const { title, author } = bookContent.metadata;
      const coverBasePath = path.resolve(
        "assets",
        `covers/${ctx.bookId}-cover.png`,
      );

      // Check if a real cover already exists (any extension)
      const exts = [".png", ".jpg", ".jpeg", ".webp"];
      const basePath = coverBasePath.replace(/\.\w+$/, "");
      const existingCover = exts
        .map((ext) => basePath + ext)
        .find((p) => existsSync(p) && statSync(p).size > 5000);

      if (!existingCover) {
        const result = await fetchBookCover(title, author, coverBasePath);
        if (result.success && result.filePath) {
          coverFetchMsg = ` | Cover: fetched → ${path.basename(result.filePath)}`;
          const coverReq = merged.find(
            (r) => r.type === "cover" || r.assetId.includes("cover"),
          );
          if (coverReq) coverReq.status = "ready";
        } else if (result.error) {
          coverFetchMsg = ` | Cover: fetch failed (${result.error})`;
        }
      } else {
        coverFetchMsg = ` | Cover: exists (${path.basename(existingCover)})`;
      }
    } catch {
      coverFetchMsg = ` | Cover: error reading book content`;
    }

    const { requirements, diagramMatched } = enrichWithDiagramSpecs(
      merged,
      artDirection,
    );

    const byStatus: Record<string, number> = {};
    for (const req of requirements) {
      byStatus[req.status] = (byStatus[req.status] ?? 0) + 1;
    }

    const report: AssetRequirementsReport = {
      bookId: ctx.bookId,
      totalRequired: requirements.length,
      byStatus,
      requirements,
    };

    savePlanArtifact(ctx.bookId, "asset-requirements", report);
    const outPath = path.join(ctx.planDir, "asset-requirements.json");

    const diagramMsg =
      diagramMatched > 0 ? ` | Diagrams: ${diagramMatched} enriched` : "";

    return {
      stageId: "6.5-asset-planner",
      status: "success",
      artifacts: [outPath],
      durationMs: Date.now() - start,
      message: `Assets: ${requirements.length} total (${Object.entries(byStatus)
        .map(([k, v]) => `${k}:${v}`)
        .join(", ")})${diagramMsg}${coverFetchMsg}`,
    };
  },
};
