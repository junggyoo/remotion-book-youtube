#!/usr/bin/env node
/**
 * Registry CLI — inspect and manage the SceneRegistry.
 *
 * Usage:
 *   npx ts-node scripts/registry-cli.ts stats
 *   npx ts-node scripts/registry-cli.ts list [--status <status>] [--family <family>]
 *   npx ts-node scripts/registry-cli.ts inspect <entry-id>
 *   npx ts-node scripts/registry-cli.ts families
 *   npx ts-node scripts/registry-cli.ts observations <entry-id>
 *   npx ts-node scripts/registry-cli.ts force-promote <entry-id> --force
 *   npx ts-node scripts/registry-cli.ts force-demote <entry-id> --force
 */

import "tsconfig-paths/register";
import { SceneRegistry } from "@/registry/SceneRegistry";
import type { LifecycleStatus } from "@/registry/types";

const REGISTRY_PATH = "generated/registry/scene-registry.json";

const ALL_FAMILIES = [
  "opening-hook",
  "concept-introduction",
  "mechanism-explanation",
  "system-model",
  "tension-comparison",
  "progression-journey",
  "transformation-shift",
  "evidence-stack",
  "reflective-anchor",
  "structural-bridge",
  "closing-synthesis",
] as const;

function loadRegistry(): SceneRegistry {
  return SceneRegistry.loadOrCreate(REGISTRY_PATH);
}

function cmdStats(): void {
  const registry = loadRegistry();
  const stats = registry.getStats();
  console.log("\n=== Registry Stats ===");
  console.log(`Total entries: ${stats.total}`);
  console.log(`Inventions logged: ${stats.inventions}`);
  console.log(`Promotions logged: ${stats.promotions}`);
  console.log("\nBy Status:");
  for (const [status, count] of Object.entries(stats.byStatus)) {
    console.log(`  ${status}: ${count}`);
  }
  console.log("\nBy Family:");
  for (const [family, count] of Object.entries(stats.byFamily)) {
    console.log(`  ${family}: ${count}`);
  }
  if (stats.familiesWithoutPromoted.length > 0) {
    console.log(
      `\nFamilies without promoted recipe: ${stats.familiesWithoutPromoted.join(", ")}`,
    );
  } else {
    console.log("\nAll families have promoted recipes!");
  }
}

function cmdList(args: string[]): void {
  const registry = loadRegistry();
  let statusFilter: string | undefined;
  let familyFilter: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--status" && args[i + 1]) statusFilter = args[++i];
    if (args[i] === "--family" && args[i + 1]) familyFilter = args[++i];
  }

  // Get all entries using stats to derive the list
  const allEntries: Array<{
    id: string;
    family: string;
    status: string;
    origin: string;
    observations: number;
  }> = [];

  for (const family of ALL_FAMILIES) {
    const entries = registry.getByFamily(family as any);
    for (const entry of entries) {
      if (statusFilter && entry.lifecycleStatus !== statusFilter) continue;
      if (familyFilter && entry.family !== familyFilter) continue;
      allEntries.push({
        id: entry.id,
        family: entry.family,
        status: entry.lifecycleStatus,
        origin: entry.origin,
        observations: entry.observations.length,
      });
    }
  }

  console.log(`\n=== Registry Entries (${allEntries.length}) ===`);
  if (allEntries.length === 0) {
    console.log("No entries found.");
    return;
  }

  // Simple table
  const idWidth = Math.max(4, ...allEntries.map((e) => e.id.length));
  const familyWidth = Math.max(6, ...allEntries.map((e) => e.family.length));
  console.log(
    `${"ID".padEnd(idWidth)}  ${"FAMILY".padEnd(familyWidth)}  ${"STATUS".padEnd(10)}  ${"ORIGIN".padEnd(10)}  OBS`,
  );
  console.log("-".repeat(idWidth + familyWidth + 35));
  for (const e of allEntries) {
    console.log(
      `${e.id.padEnd(idWidth)}  ${e.family.padEnd(familyWidth)}  ${e.status.padEnd(10)}  ${e.origin.padEnd(10)}  ${e.observations}`,
    );
  }
}

function cmdInspect(entryId: string): void {
  const registry = loadRegistry();
  const entry = registry.getById(entryId);
  if (!entry) {
    console.error(`Entry not found: "${entryId}"`);
    process.exit(1);
  }
  console.log(JSON.stringify(entry, null, 2));
}

function cmdFamilies(): void {
  const registry = loadRegistry();
  console.log("\n=== Family Status ===");
  for (const family of ALL_FAMILIES) {
    const entries = registry.getByFamily(family as any);
    if (entries.length === 0) {
      console.log(`  ${family}: (no entries)`);
      continue;
    }
    const statuses = entries.map((e) => e.lifecycleStatus);
    const hasPromoted = statuses.includes("promoted");
    const marker = hasPromoted ? "★" : " ";
    console.log(
      `${marker} ${family}: ${statuses.join(", ")} (${entries.length} entries)`,
    );
  }
}

function cmdObservations(entryId: string): void {
  const registry = loadRegistry();
  const entry = registry.getById(entryId);
  if (!entry) {
    console.error(`Entry not found: "${entryId}"`);
    process.exit(1);
  }
  console.log(
    `\n=== Observations for ${entryId} (${entry.observations.length}) ===`,
  );
  if (entry.observations.length === 0) {
    console.log("No observations yet.");
    return;
  }
  for (const obs of entry.observations) {
    console.log(`  Book: ${obs.bookId} | Blueprint: ${obs.blueprintId}`);
    console.log(
      `    renderStable: ${obs.renderStable} | timing: ${obs.timingCoherence.toFixed(2)} | focus: ${obs.focusClarity.toFixed(2)} | entropy: ${obs.motionEntropy.toFixed(2)}`,
    );
    console.log(
      `    maxActivates: ${obs.maxActivatesPerBeat} | maxChannels: ${obs.maxConcurrentChannels}`,
    );
  }
}

function cmdForcePromote(entryId: string, args: string[]): void {
  if (!args.includes("--force")) {
    console.error("force-promote requires --force flag to confirm.");
    process.exit(1);
  }
  const registry = loadRegistry();
  const entry = registry.getById(entryId);
  if (!entry) {
    console.error(`Entry not found: "${entryId}"`);
    process.exit(1);
  }
  registry.updateStatus(entryId, "promoted", "Manual force-promote via CLI");
  registry.save();
  console.log(`Promoted entry "${entryId}" (was: ${entry.lifecycleStatus})`);
}

function cmdForceDemote(entryId: string, args: string[]): void {
  if (!args.includes("--force")) {
    console.error("force-demote requires --force flag to confirm.");
    process.exit(1);
  }
  const registry = loadRegistry();
  const entry = registry.getById(entryId);
  if (!entry) {
    console.error(`Entry not found: "${entryId}"`);
    process.exit(1);
  }
  registry.updateStatus(entryId, "demoted", "Manual force-demote via CLI");
  registry.save();
  console.log(`Demoted entry "${entryId}" (was: ${entry.lifecycleStatus})`);
}

// ─── Main ────────────────────────────────────────────────────

const [subcommand, ...rest] = process.argv.slice(2);

switch (subcommand) {
  case "stats":
    cmdStats();
    break;
  case "list":
    cmdList(rest);
    break;
  case "inspect":
    if (!rest[0]) {
      console.error("Usage: inspect <entry-id>");
      process.exit(1);
    }
    cmdInspect(rest[0]);
    break;
  case "families":
    cmdFamilies();
    break;
  case "observations":
    if (!rest[0]) {
      console.error("Usage: observations <entry-id>");
      process.exit(1);
    }
    cmdObservations(rest[0]);
    break;
  case "force-promote":
    if (!rest[0]) {
      console.error("Usage: force-promote <entry-id> --force");
      process.exit(1);
    }
    cmdForcePromote(rest[0], rest);
    break;
  case "force-demote":
    if (!rest[0]) {
      console.error("Usage: force-demote <entry-id> --force");
      process.exit(1);
    }
    cmdForceDemote(rest[0], rest);
    break;
  default:
    console.log(`
Registry CLI — inspect and manage the SceneRegistry.

Commands:
  stats                           Show registry overview
  list [--status X] [--family Y]  List entries with filters
  inspect <entry-id>              Show full entry details
  families                        Show per-family status summary
  observations <entry-id>         Show observation history
  force-promote <entry-id> --force  Manual promotion
  force-demote <entry-id> --force   Manual demotion
`);
}
