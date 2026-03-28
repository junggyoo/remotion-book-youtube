import { describe, it, expect, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { SceneRegistry } from "../SceneRegistry";
import { PromotionWorkflow } from "../PromotionWorkflow";
import type { RegistryEntry } from "../types";
import type { PromotionObservation } from "@/validator/promotionObserver";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FIXTURE_DIR = path.join(__dirname, "__fixtures__");
const FIXTURE_PATH = path.join(FIXTURE_DIR, "promotion-workflow-test.json");

function makeEntry(overrides: Partial<RegistryEntry> = {}): RegistryEntry {
  return {
    id: "test-entry-001",
    family: "mechanism-explanation",
    lifecycleStatus: "validated",
    origin: "invention",
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
  } as RegistryEntry;
}

function makeObservation(
  bookId: string,
  overrides: Partial<PromotionObservation> = {},
): PromotionObservation {
  return {
    blueprintId: `bp-${bookId}`,
    sceneType: "framework",
    bookId,
    renderStable: true,
    timingCoherence: 0.9,
    focusClarity: 0.6,
    motionEntropy: 0.8,
    maxActivatesPerBeat: 2,
    maxConcurrentChannels: 2,
    ...overrides,
  };
}

function setup(entry: RegistryEntry): {
  registry: SceneRegistry;
  workflow: PromotionWorkflow;
} {
  const registry = SceneRegistry.create(FIXTURE_PATH);
  registry.register(entry);
  const workflow = new PromotionWorkflow(registry);
  return { registry, workflow };
}

afterEach(() => {
  if (fs.existsSync(FIXTURE_DIR)) {
    fs.rmSync(FIXTURE_DIR, { recursive: true });
  }
});

// ---------------------------------------------------------------------------
// Promotion Tests
// ---------------------------------------------------------------------------

describe("PromotionWorkflow", () => {
  describe("evaluatePromotion", () => {
    it("promotes entry with 3+ observations from distinct books", () => {
      const entry = makeEntry();
      entry.observations = [
        makeObservation("book-a"),
        makeObservation("book-b"),
        makeObservation("book-c"),
      ];
      const { registry, workflow } = setup(entry);

      const decision = workflow.evaluatePromotion("test-entry-001");

      expect(decision.action).toBe("promoted");
      expect(decision.reason).toContain("3");

      // Verify registry was updated
      const updated = registry.getById("test-entry-001");
      expect(updated?.lifecycleStatus).toBe("promoted");
    });

    it("does not promote with fewer than 3 distinct books", () => {
      const entry = makeEntry();
      entry.observations = [
        makeObservation("book-a"),
        makeObservation("book-b"),
        // Same book again — only 2 distinct
        makeObservation("book-b", { blueprintId: "bp-book-b-2" }),
      ];
      const { workflow } = setup(entry);

      const decision = workflow.evaluatePromotion("test-entry-001");

      expect(decision.action).toBe("hold");
      expect(decision.reason).toContain("distinct");
    });

    it("does not promote if average threshold fails", () => {
      // timingCoherence 0.7 passes floor (>= 0.6) but avg 0.7 < threshold 0.8
      const entry = makeEntry();
      entry.observations = [
        makeObservation("book-a", { timingCoherence: 0.7 }),
        makeObservation("book-b", { timingCoherence: 0.7 }),
        makeObservation("book-c", { timingCoherence: 0.7 }),
      ];
      const { workflow } = setup(entry);

      const decision = workflow.evaluatePromotion("test-entry-001");

      expect(decision.action).toBe("hold");
      expect(decision.reason).toContain("threshold");
    });

    it("does not promote if min floor fails even when average passes (D6)", () => {
      // 2 great + 1 terrible: avg timingCoherence = (0.95+0.95+0.4)/3 ≈ 0.77
      // avg may pass threshold (0.8) or not, but min 0.4 < 0.6 floor → hold
      const entry = makeEntry();
      entry.observations = [
        makeObservation("book-a", { timingCoherence: 0.95, focusClarity: 0.8 }),
        makeObservation("book-b", { timingCoherence: 0.95, focusClarity: 0.8 }),
        makeObservation("book-c", { timingCoherence: 0.4, focusClarity: 0.8 }),
      ];
      const { workflow } = setup(entry);

      const decision = workflow.evaluatePromotion("test-entry-001");

      expect(decision.action).toBe("hold");
      expect(decision.reason).toContain("floor");
    });

    it("does not promote if min focusClarity floor fails (D6)", () => {
      const entry = makeEntry();
      entry.observations = [
        makeObservation("book-a", { focusClarity: 0.7 }),
        makeObservation("book-b", { focusClarity: 0.7 }),
        makeObservation("book-c", { focusClarity: 0.2 }), // below 0.3 floor
      ];
      const { workflow } = setup(entry);

      const decision = workflow.evaluatePromotion("test-entry-001");

      expect(decision.action).toBe("hold");
      expect(decision.reason).toContain("floor");
    });

    it("does not promote if any renderStable is false (D6)", () => {
      const entry = makeEntry();
      entry.observations = [
        makeObservation("book-a"),
        makeObservation("book-b"),
        makeObservation("book-c", { renderStable: false }),
      ];
      const { workflow } = setup(entry);

      const decision = workflow.evaluatePromotion("test-entry-001");

      expect(decision.action).toBe("hold");
      expect(decision.reason).toContain("renderStable");
    });

    it("returns hold if entry does not exist", () => {
      const registry = SceneRegistry.create(FIXTURE_PATH);
      const workflow = new PromotionWorkflow(registry);

      const decision = workflow.evaluatePromotion("nonexistent");

      expect(decision.action).toBe("hold");
      expect(decision.reason).toContain("not found");
    });

    it("returns hold if entry is not in validated status", () => {
      const entry = makeEntry({ lifecycleStatus: "active" } as any);
      const { workflow } = setup(entry);

      const decision = workflow.evaluatePromotion("test-entry-001");

      expect(decision.action).toBe("hold");
      expect(decision.reason).toContain("validated");
    });
  });

  // ---------------------------------------------------------------------------
  // Demotion Tests
  // ---------------------------------------------------------------------------

  describe("evaluateDemotion", () => {
    it("demotes after 3 consecutive bad observations (D7)", () => {
      const entry = makeEntry({ lifecycleStatus: "promoted" } as any);
      entry.observations = [
        makeObservation("book-a"), // good
        makeObservation("book-d", { renderStable: false }),
        makeObservation("book-e", { renderStable: false }),
        makeObservation("book-f", { renderStable: false }),
      ];
      const { registry, workflow } = setup(entry);

      const decision = workflow.evaluateDemotion("test-entry-001");

      expect(decision.action).toBe("demoted");
      expect(decision.reason).toContain("consecutive");

      const updated = registry.getById("test-entry-001");
      expect(updated?.lifecycleStatus).toBe("demoted");
    });

    it("does not demote if only 2 consecutive bad observations (D7)", () => {
      const entry = makeEntry({ lifecycleStatus: "promoted" } as any);
      entry.observations = [
        makeObservation("book-a"), // good
        makeObservation("book-b", { renderStable: false }),
        makeObservation("book-c", { renderStable: false }),
      ];
      const { workflow } = setup(entry);

      const decision = workflow.evaluateDemotion("test-entry-001");

      expect(decision.action).toBe("hold");
    });

    it("does not demote if last 3 are not all bad (D7)", () => {
      const entry = makeEntry({ lifecycleStatus: "promoted" } as any);
      entry.observations = [
        makeObservation("book-a", { renderStable: false }),
        makeObservation("book-b"), // good in the middle
        makeObservation("book-c", { renderStable: false }),
      ];
      const { workflow } = setup(entry);

      const decision = workflow.evaluateDemotion("test-entry-001");

      expect(decision.action).toBe("hold");
    });

    it("returns hold if entry is not promoted", () => {
      const entry = makeEntry(); // validated, not promoted
      const { workflow } = setup(entry);

      const decision = workflow.evaluateDemotion("test-entry-001");

      expect(decision.action).toBe("hold");
      expect(decision.reason).toContain("promoted");
    });

    it("returns hold if fewer than 3 observations", () => {
      const entry = makeEntry({ lifecycleStatus: "promoted" } as any);
      entry.observations = [
        makeObservation("book-a", { renderStable: false }),
        makeObservation("book-b", { renderStable: false }),
      ];
      const { workflow } = setup(entry);

      const decision = workflow.evaluateDemotion("test-entry-001");

      expect(decision.action).toBe("hold");
    });
  });
});
