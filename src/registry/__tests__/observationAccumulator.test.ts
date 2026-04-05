import { describe, it, expect, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { SceneRegistry } from "../SceneRegistry";
import { migrateBuiltinRecipes } from "../registryMigration";
import {
  inferFamilyFromSceneType,
  findBestEntryForObservation,
  accumulateObservations,
} from "../observationAccumulator";
import type { PromotionObservation } from "@/validator/promotionObserver";

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

const TEST_DIR = path.join(__dirname, "__fixtures__");
const TEST_PATH = path.join(TEST_DIR, "accumulator-test-registry.json");

function makeObs(
  overrides: Partial<PromotionObservation> = {},
): PromotionObservation {
  return {
    blueprintId: "bp-001",
    sceneType: "framework",
    bookId: "book-a",
    renderStable: true,
    timingCoherence: 0.9,
    focusClarity: 0.8,
    motionEntropy: 0.5,
    maxActivatesPerBeat: 2,
    maxConcurrentChannels: 2,
    ...overrides,
  };
}

afterEach(() => {
  if (fs.existsSync(TEST_PATH)) fs.unlinkSync(TEST_PATH);
  if (fs.existsSync(TEST_DIR)) {
    try {
      fs.rmdirSync(TEST_DIR);
    } catch {
      /* not empty */
    }
  }
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("inferFamilyFromSceneType", () => {
  it("maps known scene types to families", () => {
    expect(inferFamilyFromSceneType("framework")).toBe("system-model");
    expect(inferFamilyFromSceneType("quote")).toBe("reflective-anchor");
    expect(inferFamilyFromSceneType("closing")).toBe("closing-synthesis");
    expect(inferFamilyFromSceneType("hook")).toBe("opening-hook");
    expect(inferFamilyFromSceneType("compareContrast")).toBe(
      "tension-comparison",
    );
  });

  it("falls back to concept-introduction for unknown types", () => {
    expect(inferFamilyFromSceneType("unknown-type")).toBe(
      "concept-introduction",
    );
  });
});

describe("findBestEntryForObservation", () => {
  it("returns entry ID when matching family exists", () => {
    const registry = SceneRegistry.create(TEST_PATH);
    migrateBuiltinRecipes(registry);

    const obs = makeObs({ sceneType: "framework" });
    const entryId = findBestEntryForObservation(registry, obs);
    expect(entryId).toBe("migration-system-model");
  });

  it("returns null when no matching family entry exists", () => {
    const registry = SceneRegistry.create(TEST_PATH);
    // No migration — empty registry
    const obs = makeObs({ sceneType: "framework" });
    const entryId = findBestEntryForObservation(registry, obs);
    expect(entryId).toBeNull();
  });
});

describe("accumulateObservations", () => {
  it("adds observations to matching registry entries", () => {
    const registry = SceneRegistry.create(TEST_PATH);
    migrateBuiltinRecipes(registry);

    const observations = [
      makeObs({
        sceneType: "framework",
        bookId: "book-a",
        blueprintId: "bp-1",
      }),
      makeObs({ sceneType: "quote", bookId: "book-a", blueprintId: "bp-2" }),
    ];

    const added = accumulateObservations(registry, observations);
    expect(added).toBe(2);

    const smEntry = registry.getById("migration-system-model");
    expect(smEntry!.observations).toHaveLength(1);

    const raEntry = registry.getById("migration-reflective-anchor");
    expect(raEntry!.observations).toHaveLength(1);
  });

  it("deduplicates observations with same bookId + blueprintId", () => {
    const registry = SceneRegistry.create(TEST_PATH);
    migrateBuiltinRecipes(registry);

    const obs = makeObs({
      sceneType: "framework",
      bookId: "book-a",
      blueprintId: "bp-1",
    });

    const first = accumulateObservations(registry, [obs]);
    expect(first).toBe(1);

    // Same observation again — should be skipped
    const second = accumulateObservations(registry, [obs]);
    expect(second).toBe(0);

    const entry = registry.getById("migration-system-model");
    expect(entry!.observations).toHaveLength(1);
  });

  it("allows same blueprintId from different books", () => {
    const registry = SceneRegistry.create(TEST_PATH);
    migrateBuiltinRecipes(registry);

    const obs1 = makeObs({
      sceneType: "framework",
      bookId: "book-a",
      blueprintId: "bp-1",
    });
    const obs2 = makeObs({
      sceneType: "framework",
      bookId: "book-b",
      blueprintId: "bp-1",
    });

    const added = accumulateObservations(registry, [obs1, obs2]);
    expect(added).toBe(2);

    const entry = registry.getById("migration-system-model");
    expect(entry!.observations).toHaveLength(2);
  });

  it("skips observations with no matching registry entry", () => {
    const registry = SceneRegistry.create(TEST_PATH);
    // No migration — empty registry
    const obs = makeObs({ sceneType: "framework" });
    const added = accumulateObservations(registry, [obs]);
    expect(added).toBe(0);
  });
});
