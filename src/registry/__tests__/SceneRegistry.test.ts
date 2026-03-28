import { describe, it, expect } from "vitest";
import { RegistryEntrySchema, InventionRecordSchema } from "../registrySchema";

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
