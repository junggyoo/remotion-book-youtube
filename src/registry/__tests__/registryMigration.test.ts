import { describe, it, expect, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { SceneRegistry } from "../SceneRegistry";
import { migrateBuiltinRecipes } from "../registryMigration";

// ---------------------------------------------------------------------------
// Test fixture path
// ---------------------------------------------------------------------------

const TEST_FIXTURE_DIR = path.join(__dirname, "__fixtures__");
const TEST_REGISTRY_PATH = path.join(
  TEST_FIXTURE_DIR,
  "migration-test-registry.json",
);

afterEach(() => {
  if (fs.existsSync(TEST_REGISTRY_PATH)) {
    fs.unlinkSync(TEST_REGISTRY_PATH);
  }
  if (fs.existsSync(TEST_FIXTURE_DIR)) {
    fs.rmdirSync(TEST_FIXTURE_DIR);
  }
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("migrateBuiltinRecipes", () => {
  it("migrates 3 existing family recipes to registry entries", () => {
    const registry = SceneRegistry.create(TEST_REGISTRY_PATH);
    const count = migrateBuiltinRecipes(registry);

    expect(count).toBe(3);

    const ci = registry.getByFamily("concept-introduction");
    const sm = registry.getByFamily("system-model");
    const pj = registry.getByFamily("progression-journey");

    expect(ci).toHaveLength(1);
    expect(sm).toHaveLength(1);
    expect(pj).toHaveLength(1);
  });

  it("all migrated entries have lifecycleStatus=active and origin=migration", () => {
    const registry = SceneRegistry.create(TEST_REGISTRY_PATH);
    migrateBuiltinRecipes(registry);

    const activeEntries = registry.getByStatus("active");
    expect(activeEntries).toHaveLength(3);

    for (const entry of activeEntries) {
      expect(entry.lifecycleStatus).toBe("active");
      expect(entry.origin).toBe("migration");
    }
  });

  it("skips migration if entries already exist", () => {
    const registry = SceneRegistry.create(TEST_REGISTRY_PATH);
    const firstCount = migrateBuiltinRecipes(registry);
    expect(firstCount).toBe(3);

    const secondCount = migrateBuiltinRecipes(registry);
    expect(secondCount).toBe(0);

    // Still only 3 entries total
    const activeEntries = registry.getByStatus("active");
    expect(activeEntries).toHaveLength(3);
  });

  it("migrated entries have valid elementTemplate arrays", () => {
    const registry = SceneRegistry.create(TEST_REGISTRY_PATH);
    migrateBuiltinRecipes(registry);

    const entries = registry.getByStatus("active");
    for (const entry of entries) {
      expect(entry.recipe.elementTemplate.length).toBeGreaterThan(0);
      for (const tmpl of entry.recipe.elementTemplate) {
        expect(tmpl.id).toBeTruthy();
        expect(tmpl.type).toBeTruthy();
        expect(typeof tmpl.layer).toBe("number");
        expect(tmpl.beatActivationKey).toBeTruthy();
        // Props should be stripped (empty)
        expect(Object.keys(tmpl.props)).toHaveLength(0);
      }
    }
  });

  it("preserves recipe layout and choreography from family recipe", () => {
    const registry = SceneRegistry.create(TEST_REGISTRY_PATH);
    migrateBuiltinRecipes(registry);

    const ci = registry.getByFamily("concept-introduction")[0];
    expect(ci.recipe.defaultLayout).toBe("center-focus");
    expect(ci.recipe.defaultChoreography).toBe("reveal-sequence");

    const sm = registry.getByFamily("system-model")[0];
    expect(sm.recipe.defaultLayout).toBe("grid-expand");
    expect(sm.recipe.defaultChoreography).toBe("stagger-clockwise");

    const pj = registry.getByFamily("progression-journey")[0];
    expect(pj.recipe.defaultLayout).toBe("timeline-h");
    expect(pj.recipe.defaultChoreography).toBe("path-trace");
  });
});
