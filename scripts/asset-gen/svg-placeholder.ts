/**
 * SVG Placeholder Generator — creates minimal placeholder SVGs
 * for missing assets, styled by shapeLanguage from art direction.
 *
 * Usage: npx ts-node scripts/asset-gen/svg-placeholder.ts <bookId> [--shape geometric|organic|angular|minimal|mixed]
 */

import "tsconfig-paths/register";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";

type ShapeLanguage = "geometric" | "organic" | "angular" | "minimal" | "mixed";

interface AssetRequirement {
  assetId: string;
  type: string;
  description: string;
  status: string;
}

const WIDTH = 400;
const HEIGHT = 300;

function generateShape(type: string, shape: ShapeLanguage): string {
  const cx = WIDTH / 2;
  const cy = HEIGHT / 2;

  switch (shape) {
    case "geometric":
      if (type === "icon")
        return `<rect x="${cx - 40}" y="${cy - 40}" width="80" height="80" rx="8" fill="#334155" stroke="#64748B" stroke-width="2"/>`;
      if (type === "diagram")
        return `<circle cx="${cx - 60}" cy="${cy}" r="35" fill="#334155" stroke="#64748B" stroke-width="2"/><circle cx="${cx + 60}" cy="${cy}" r="35" fill="#334155" stroke="#64748B" stroke-width="2"/><line x1="${cx - 25}" y1="${cy}" x2="${cx + 25}" y2="${cy}" stroke="#64748B" stroke-width="2"/>`;
      return `<rect x="${cx - 80}" y="${cy - 60}" width="160" height="120" rx="12" fill="#334155" stroke="#64748B" stroke-width="2"/>`;

    case "organic":
      return `<ellipse cx="${cx}" cy="${cy}" rx="90" ry="60" fill="#334155" stroke="#64748B" stroke-width="2"/>`;

    case "angular":
      return `<polygon points="${cx},${cy - 70} ${cx + 80},${cy + 50} ${cx - 80},${cy + 50}" fill="#334155" stroke="#64748B" stroke-width="2"/>`;

    case "minimal":
      return `<line x1="${cx - 60}" y1="${cy}" x2="${cx + 60}" y2="${cy}" stroke="#64748B" stroke-width="3"/><circle cx="${cx}" cy="${cy}" r="4" fill="#64748B"/>`;

    default: // mixed
      return `<rect x="${cx - 70}" y="${cy - 50}" width="140" height="100" rx="8" fill="#334155" stroke="#64748B" stroke-width="2"/>`;
  }
}

function generateSvg(asset: AssetRequirement, shape: ShapeLanguage): string {
  const shapeContent = generateShape(asset.type, shape);
  const label =
    asset.description.length > 40
      ? asset.description.slice(0, 37) + "..."
      : asset.description;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}">
  <!-- PLACEHOLDER: ${asset.assetId} -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#1E293B"/>
  <rect x="2" y="2" width="${WIDTH - 4}" height="${HEIGHT - 4}" fill="none" stroke="#475569" stroke-width="2" stroke-dasharray="8,4"/>
  ${shapeContent}
  <text x="${WIDTH / 2}" y="${HEIGHT - 40}" text-anchor="middle" fill="#94A3B8" font-family="sans-serif" font-size="12">${escapeXml(label)}</text>
  <text x="${WIDTH / 2}" y="${HEIGHT - 20}" text-anchor="middle" fill="#64748B" font-family="sans-serif" font-size="10">PLACEHOLDER</text>
</svg>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function generatePlaceholders(
  bookId: string,
  requirements: AssetRequirement[],
  shape: ShapeLanguage = "geometric",
): string[] {
  const outDir = path.resolve("assets/generated", bookId);
  mkdirSync(outDir, { recursive: true });

  const generated: string[] = [];

  for (const req of requirements) {
    if (req.status === "ready") continue; // skip already-ready assets

    const svg = generateSvg(req, shape);
    const outPath = path.join(outDir, `${req.assetId}.svg`);
    writeFileSync(outPath, svg, "utf-8");
    generated.push(outPath);
  }

  return generated;
}

// CLI entry point
if (require.main === module) {
  const bookId = process.argv[2];
  if (!bookId) {
    console.error(
      "Usage: npx ts-node scripts/asset-gen/svg-placeholder.ts <bookId> [--shape geometric]",
    );
    process.exit(1);
  }

  const shapeIdx = process.argv.indexOf("--shape");
  const shape: ShapeLanguage =
    shapeIdx >= 0 ? (process.argv[shapeIdx + 1] as ShapeLanguage) : "geometric";

  const reqPath = path.resolve(
    "generated/books",
    bookId,
    "asset-requirements.json",
  );
  if (!existsSync(reqPath)) {
    console.error(`No asset-requirements.json found at ${reqPath}`);
    process.exit(1);
  }

  const report = JSON.parse(readFileSync(reqPath, "utf-8")) as {
    requirements: AssetRequirement[];
  };
  const generated = generatePlaceholders(bookId, report.requirements, shape);
  console.log(`Generated ${generated.length} placeholder SVGs for ${bookId}`);
  for (const p of generated) console.log(`  ${p}`);
}
