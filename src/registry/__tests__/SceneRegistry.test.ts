import { describe, it, expect, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { RegistryEntrySchema, InventionRecordSchema } from "../registrySchema";
import { SceneRegistry } from "../SceneRegistry";
import type { RegistryEntry } from "../types";

// ---------------------------------------------------------------------------
// Helpers — minimal valid fixtures
// ---------------------------------------------------------------------------

function makeValidRegistryEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: "recipe-framework-grid-01",
    family: "mechanism-explanation",
    lifecycleStatus: "active",
    origin: "builtin",
    recipe: {
      defaultLayout: "grid-expand",
      defaultChoreography: "stagger-clockwise",
      elementTemplate: [
        {
          id: "headline",
          type: "TextBlock",
          props: { variant: "headlineL" },
          layer: 20,
          beatActivationKey: "headline",
        },
      ],
    },
    observations: [],
    version: 1,
    createdAt: "2026-03-28T00:00:00Z",
    updatedAt: "2026-03-28T00:00:00Z",
    ...overrides,
  };
}

function makeValidInventionRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "inv-001",
    gapId: "gap-hook-visual",
    bookId: "atomic-habits-2024",
    family: "opening-hook",
    blueprintSnapshot: {
      layout: "center-focus",
      choreography: "reveal-sequence",
      elementCount: 3,
      motionPreset: "smooth",
    },
    status: "invented",
    inventedAt: "2026-03-28T00:00:00Z",
    expiresAt: "2026-04-28T00:00:00Z",
    validationResult: null,
    derivedFrom: {
      gapCapabilities: ["dynamic-visual", "hook-emphasis"],
      fallbackPreset: "hook",
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RegistryEntrySchema", () => {
  it("validates a well-formed active recipe entry", () => {
    const entry = makeValidRegistryEntry();
    const result = RegistryEntrySchema.safeParse(entry);
    expect(result.success).toBe(true);
  });

  it("rejects entry with missing family", () => {
    const entry = makeValidRegistryEntry();
    delete (entry as any).family;
    const result = RegistryEntrySchema.safeParse(entry);
    expect(result.success).toBe(false);
  });

  it('rejects entry with invalid lifecycleStatus "builtin"', () => {
    // "builtin" is an origin value, NOT a valid lifecycle status (D1)
    const entry = makeValidRegistryEntry({ lifecycleStatus: "builtin" });
    const result = RegistryEntrySchema.safeParse(entry);
    expect(result.success).toBe(false);
  });
});

describe("InventionRecordSchema", () => {
  it("validates invention record with gap reference", () => {
    const record = makeValidInventionRecord();
    const result = InventionRecordSchema.safeParse(record);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// SceneRegistry CRUD + Persistence Tests
// ---------------------------------------------------------------------------

const FIXTURES_DIR = path.join(__dirname, "__fixtures__");
const TEST_REGISTRY_PATH = path.join(FIXTURES_DIR, "test-registry.json");

function makeEntry(overrides: Partial<RegistryEntry> = {}): RegistryEntry {
  return {
    id: "test-entry-1",
    family: "concept-introduction",
    lifecycleStatus: "active",
    origin: "builtin",
    recipe: {
      defaultLayout: "center-focus",
      defaultChoreography: "reveal-sequence",
      elementTemplate: [
        {
          id: "headline",
          type: "headline",
          props: {},
          layer: 20,
          beatActivationKey: "headline",
        },
      ],
    },
    observations: [],
    createdAt: "2026-03-28T00:00:00Z",
    updatedAt: "2026-03-28T00:00:00Z",
    ...overrides,
  };
}

function cleanup() {
  if (fs.existsSync(TEST_REGISTRY_PATH)) {
    fs.unlinkSync(TEST_REGISTRY_PATH);
  }
  if (fs.existsSync(FIXTURES_DIR)) {
    try {
      fs.rmdirSync(FIXTURES_DIR);
    } catch {
      // not empty, fine
    }
  }
}

describe("SceneRegistry", () => {
  afterEach(() => {
    cleanup();
  });

  it("initializes empty registry and persists to disk", () => {
    const reg = SceneRegistry.create(TEST_REGISTRY_PATH);
    reg.save();
    expect(fs.existsSync(TEST_REGISTRY_PATH)).toBe(true);

    const raw = JSON.parse(fs.readFileSync(TEST_REGISTRY_PATH, "utf-8"));
    expect(raw.version).toBe(1);
    expect(raw.entries).toEqual([]);
    expect(raw.inventionLog).toEqual([]);
    expect(raw.promotionLog).toEqual([]);
  });

  it("registers and retrieves an entry by family", () => {
    const reg = SceneRegistry.create(TEST_REGISTRY_PATH);
    const entry = makeEntry();
    reg.register(entry);

    const results = reg.getByFamily("concept-introduction");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("test-entry-1");
  });

  it("prevents duplicate entry IDs", () => {
    const reg = SceneRegistry.create(TEST_REGISTRY_PATH);
    reg.register(makeEntry());
    expect(() => reg.register(makeEntry())).toThrow(/duplicate/i);
  });

  it("updates entry lifecycleStatus", () => {
    const reg = SceneRegistry.create(TEST_REGISTRY_PATH);
    reg.register(makeEntry());
    reg.updateStatus("test-entry-1", "promoted", "passed all checks");

    const entry = reg.getById("test-entry-1");
    expect(entry?.lifecycleStatus).toBe("promoted");
    expect(entry?.statusReason).toBe("passed all checks");
  });

  it("loads from existing file", () => {
    const reg = SceneRegistry.create(TEST_REGISTRY_PATH);
    reg.register(makeEntry());
    reg.save();

    const loaded = SceneRegistry.load(TEST_REGISTRY_PATH);
    expect(loaded.getById("test-entry-1")).toBeDefined();
    expect(loaded.getById("test-entry-1")?.family).toBe("concept-introduction");
  });

  it("loadOrCreate creates new if file absent", () => {
    const reg = SceneRegistry.loadOrCreate(TEST_REGISTRY_PATH);
    const stats = reg.getStats();
    expect(stats.total).toBe(0);
  });

  it("loadOrCreate loads existing file", () => {
    const reg = SceneRegistry.create(TEST_REGISTRY_PATH);
    reg.register(makeEntry());
    reg.save();

    const loaded = SceneRegistry.loadOrCreate(TEST_REGISTRY_PATH);
    expect(loaded.getById("test-entry-1")).toBeDefined();
  });

  it("returns best recipe for family (promoted > validated > active > invented)", () => {
    const reg = SceneRegistry.create(TEST_REGISTRY_PATH);

    reg.register(makeEntry({ id: "e-invented", lifecycleStatus: "invented" }));
    reg.register(makeEntry({ id: "e-active", lifecycleStatus: "active" }));
    reg.register(
      makeEntry({ id: "e-validated", lifecycleStatus: "validated" }),
    );
    reg.register(makeEntry({ id: "e-promoted", lifecycleStatus: "promoted" }));
    reg.register(makeEntry({ id: "e-demoted", lifecycleStatus: "demoted" }));

    const best = reg.getBestRecipe("concept-introduction");
    expect(best?.id).toBe("e-promoted");
  });

  it("getBestRecipe accepts optional format/genre filter (API shape, v1 ignores)", () => {
    const reg = SceneRegistry.create(TEST_REGISTRY_PATH);
    reg.register(makeEntry({ id: "e1", lifecycleStatus: "active" }));

    // v1: options are accepted but not used for filtering
    const best = reg.getBestRecipe("concept-introduction", {
      format: "longform",
      genre: "psychology",
    });
    expect(best?.id).toBe("e1");
  });

  it("queries entries by lifecycleStatus", () => {
    const reg = SceneRegistry.create(TEST_REGISTRY_PATH);
    reg.register(makeEntry({ id: "a1", lifecycleStatus: "active" }));
    reg.register(makeEntry({ id: "a2", lifecycleStatus: "active" }));
    reg.register(makeEntry({ id: "p1", lifecycleStatus: "promoted" }));

    const actives = reg.getByStatus("active");
    expect(actives).toHaveLength(2);

    const promoted = reg.getByStatus("promoted");
    expect(promoted).toHaveLength(1);
  });
});
