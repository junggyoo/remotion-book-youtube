/**
 * Task 10: E2E Integration Test — Scene Invention Loop
 *
 * Exercises the full lifecycle:
 *   create → migrate → invent → validate → observe → promote → persist → reload
 */

import { describe, it, expect, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { SceneRegistry } from "../SceneRegistry";
import { migrateBuiltinRecipes } from "../registryMigration";
import {
  buildInventionPrompt,
  extractInventionRecord,
} from "../InventionPromptContract";
import { validateInvention } from "../InventionValidator";
import { PromotionWorkflow } from "../PromotionWorkflow";
import type { RegistryEntry } from "../types";
import type { PromotionObservation } from "@/validator/promotionObserver";
import type { SceneGap } from "@/types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FIXTURE_DIR = path.join(__dirname, "__fixtures__");
const FIXTURE_PATH = path.join(FIXTURE_DIR, "invention-loop-e2e.json");

afterEach(() => {
  if (fs.existsSync(FIXTURE_PATH)) {
    fs.unlinkSync(FIXTURE_PATH);
  }
  // Clean up fixture dir if empty
  if (fs.existsSync(FIXTURE_DIR)) {
    const remaining = fs.readdirSync(FIXTURE_DIR);
    if (remaining.length === 0) {
      fs.rmdirSync(FIXTURE_DIR);
    }
  }
});

/** Realistic Korean-content SceneGap for a "습관 루프" framework scene */
function makeSampleGap(): SceneGap {
  return {
    segment: "core",
    slotIndex: 2,
    bestPresetMatch: {
      segment: "core",
      slotIndex: 2,
      sceneType: "framework",
      content: {
        type: "framework",
        headline: "습관 루프의 4단계 법칙",
        items: [
          { title: "신호", description: "행동을 시작하게 만드는 트리거" },
          { title: "열망", description: "변화를 원하는 내적 동기" },
          { title: "반응", description: "실제 수행하는 습관 행동" },
          { title: "보상", description: "습관을 강화하는 결과" },
        ],
      } as any,
      confidence: 0.35,
      scoreBreakdown: {
        structuralFit: 0.4,
        emotionalMatch: 0.3,
        densityMatch: 0.35,
      } as any,
    },
    gapReason:
      "framework preset lacks cyclic-flow capability for habit loop visualization",
    requiredCapabilities: ["cyclic-flow", "radial-layout"],
    priority: "must",
    intent: "습관이 어떻게 순환하는지 시각적으로 보여주는 프레임워크 씬",
  };
}

function makeObservation(
  bookId: string,
  overrides: Partial<PromotionObservation> = {},
): PromotionObservation {
  return {
    blueprintId: "bp-habit-loop-invented",
    sceneType: "framework",
    bookId,
    renderStable: true,
    timingCoherence: 0.9,
    focusClarity: 0.6,
    motionEntropy: 0.7,
    maxActivatesPerBeat: 2,
    maxConcurrentChannels: 2,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// E2E Test
// ---------------------------------------------------------------------------

describe("Invention Loop E2E", () => {
  it("full lifecycle: create → migrate → invent → validate → observe → promote → persist → reload", () => {
    // ─── Step 1: Create registry + migrate builtins ──────────────────
    const registry = SceneRegistry.create(FIXTURE_PATH);
    const migratedCount = migrateBuiltinRecipes(registry);

    expect(migratedCount).toBe(3);
    expect(registry.getByFamily("concept-introduction").length).toBe(1);
    expect(registry.getByFamily("system-model").length).toBe(1);
    expect(registry.getByFamily("progression-journey").length).toBe(1);

    // ─── Step 2: Build invention prompt from sample gap ─────────────
    const gap = makeSampleGap();
    const bookId = "atomic-habits-2024";

    const prompt = buildInventionPrompt(gap, bookId);

    expect(prompt.gapId).toBe("core-2");
    expect(prompt.bookId).toBe(bookId);
    // "cyclic-flow" maps to "mechanism-explanation" in CAPABILITY_FAMILY_MAP
    expect(prompt.family).toBe("mechanism-explanation");
    expect(prompt.unmetCapabilities).toContain("cyclic-flow");
    expect(prompt.unmetCapabilities).toContain("radial-layout");
    expect(prompt.fallbackPreset).toBe("framework");
    expect(prompt.constraints.length).toBeGreaterThan(0);
    expect(prompt.requiredFields).toContain("layout");
    expect(prompt.requiredFields).toContain("fallbackPreset");

    // ─── Step 3: Extract invention record → verify traceability ─────
    const snapshot = {
      layout: "grid-expand" as const,
      choreography: "reveal-sequence" as const,
      elementCount: 5,
      motionPreset: "smooth" as const,
    };

    const inventionRecord = extractInventionRecord(gap, bookId, snapshot);

    expect(inventionRecord.gapId).toBe("core-2");
    expect(inventionRecord.bookId).toBe(bookId);
    expect(inventionRecord.family).toBe("mechanism-explanation");
    expect(inventionRecord.status).toBe("invented");
    expect(inventionRecord.blueprintSnapshot).toEqual(snapshot);
    // D8: derivedFrom traceability
    expect(inventionRecord.derivedFrom).toBeDefined();
    expect(inventionRecord.derivedFrom!.gapCapabilities).toContain(
      "cyclic-flow",
    );
    expect(inventionRecord.derivedFrom!.fallbackPreset).toBe("framework");
    // 30-day expiry
    const inventedDate = new Date(inventionRecord.inventedAt);
    const expiresDate = new Date(inventionRecord.expiresAt);
    const daysDiff =
      (expiresDate.getTime() - inventedDate.getTime()) / (1000 * 60 * 60 * 24);
    expect(daysDiff).toBeCloseTo(30, 0);

    // Log the invention
    registry.logInvention(inventionRecord);
    expect(registry.getInventionsByBook(bookId).length).toBe(1);

    // ─── Step 4: Create fake SynthesizedBlueprint → validate ────────
    const fakeBlueprint = {
      id: "bp-habit-loop-invented",
      intent: "습관 루프 순환 구조를 시각화",
      origin: "synthesized" as const,
      layout: "grid-expand",
      elements: [
        {
          id: "headline",
          type: "headline" as const,
          props: { text: "습관 루프의 4단계" },
        },
        { id: "item-0", type: "textBlock" as const, props: { text: "신호" } },
        { id: "item-1", type: "textBlock" as const, props: { text: "열망" } },
        { id: "item-2", type: "textBlock" as const, props: { text: "반응" } },
        { id: "item-3", type: "textBlock" as const, props: { text: "보상" } },
      ],
      choreography: "reveal-sequence",
      motionPreset: "smooth",
      format: "longform",
      theme: { mode: "dark", genre: "psychology" },
      from: 0,
      durationFrames: 300,
      mediaPlan: {
        narrationText:
          "습관은 네 단계의 순환 구조를 따릅니다. 신호, 열망, 반응, 그리고 보상입니다.",
      },
      lifecycle: "candidate-promotable",
      fallbackPreset: "framework",
      fallbackContent: {},
    } as any;

    const validationResult = validateInvention(fakeBlueprint);

    expect(validationResult.passed).toBe(true);
    expect(validationResult.violations).toHaveLength(0);
    expect(validationResult.checkedAt).toBeTruthy();

    // Update invention record status
    registry.updateInventionStatus(
      inventionRecord.id,
      "validation-passed",
      validationResult,
    );

    // ─── Step 5: Register as validated entry ────────────────────────
    const now = new Date().toISOString();
    const inventedEntry: RegistryEntry = {
      id: "invented-habit-loop-01",
      family: "mechanism-explanation",
      lifecycleStatus: "validated",
      origin: "invention",
      recipe: {
        defaultLayout: "grid-expand" as any,
        defaultChoreography: "reveal-sequence" as any,
        elementTemplate: [
          {
            id: "headline",
            type: "TextBlock",
            props: { variant: "headlineL" },
            layer: 20,
            beatActivationKey: "headline",
          },
          {
            id: "item-0",
            type: "TextBlock",
            props: { variant: "bodyM" },
            layer: 20,
            beatActivationKey: "item-0",
          },
          {
            id: "item-1",
            type: "TextBlock",
            props: { variant: "bodyM" },
            layer: 20,
            beatActivationKey: "item-1",
          },
          {
            id: "item-2",
            type: "TextBlock",
            props: { variant: "bodyM" },
            layer: 20,
            beatActivationKey: "item-2",
          },
          {
            id: "item-3",
            type: "TextBlock",
            props: { variant: "bodyM" },
            layer: 20,
            beatActivationKey: "item-3",
          },
        ],
      },
      observations: [],
      version: 1,
      createdAt: now,
      updatedAt: now,
      statusReason: "Invented from gap core-2, validation passed",
      derivedFrom: {
        gapCapabilities: ["cyclic-flow", "radial-layout"],
        fallbackPreset: "framework",
      },
    };

    registry.register(inventedEntry);

    const retrieved = registry.getById("invented-habit-loop-01");
    expect(retrieved).toBeDefined();
    expect(retrieved!.origin).toBe("invention");
    expect(retrieved!.derivedFrom!.gapCapabilities).toContain("cyclic-flow");

    // ─── Step 6: Add observations from 3 distinct books ─────────────
    const books = [
      "atomic-habits-2024",
      "power-of-habit-2025",
      "tiny-habits-2025",
    ];

    for (const bId of books) {
      registry.addObservation("invented-habit-loop-01", makeObservation(bId));
    }

    const entryWithObs = registry.getById("invented-habit-loop-01")!;
    expect(entryWithObs.observations).toHaveLength(3);
    const distinctBooks = new Set(
      entryWithObs.observations.map((o) => o.bookId),
    );
    expect(distinctBooks.size).toBe(3);

    // ─── Step 7: Evaluate promotion → expect "promoted" ─────────────
    const workflow = new PromotionWorkflow(registry);
    const decision = workflow.evaluatePromotion("invented-habit-loop-01");

    expect(decision.action).toBe("promoted");
    expect(decision.reason).toContain("3 distinct books");

    // Verify lifecycle status updated
    const promotedEntry = registry.getById("invented-habit-loop-01")!;
    expect(promotedEntry.lifecycleStatus).toBe("promoted");

    // ─── Step 8: getBestRecipe returns promoted entry ────────────────
    const best = registry.getBestRecipe("mechanism-explanation");
    expect(best).toBeDefined();
    expect(best!.id).toBe("invented-habit-loop-01");
    expect(best!.lifecycleStatus).toBe("promoted");

    // ─── Step 9: Save → reload → verify persistence ─────────────────
    registry.save();
    expect(fs.existsSync(FIXTURE_PATH)).toBe(true);

    const reloaded = SceneRegistry.load(FIXTURE_PATH);

    // Verify entries persist
    const reloadedEntry = reloaded.getById("invented-habit-loop-01");
    expect(reloadedEntry).toBeDefined();
    expect(reloadedEntry!.lifecycleStatus).toBe("promoted");
    expect(reloadedEntry!.origin).toBe("invention");
    expect(reloadedEntry!.observations).toHaveLength(3);
    expect(reloadedEntry!.derivedFrom!.gapCapabilities).toContain(
      "cyclic-flow",
    );

    // Verify migrated entries also persist
    expect(reloaded.getByFamily("concept-introduction").length).toBe(1);
    expect(reloaded.getByFamily("system-model").length).toBe(1);
    expect(reloaded.getByFamily("progression-journey").length).toBe(1);

    // getBestRecipe still returns promoted on reloaded registry
    const reloadedBest = reloaded.getBestRecipe("mechanism-explanation");
    expect(reloadedBest).toBeDefined();
    expect(reloadedBest!.id).toBe("invented-habit-loop-01");

    // Inventions persist
    const reloadedInventions = reloaded.getInventionsByBook(bookId);
    expect(reloadedInventions.length).toBe(1);
    expect(reloadedInventions[0].status).toBe("validation-passed");

    // ─── Step 10: Stats — familiesWithoutPromoted ────────────────────
    const stats = reloaded.getStats();

    // 4 total entries: 3 migrated (active) + 1 invented (promoted)
    expect(stats.total).toBe(4);
    expect(stats.inventions).toBe(1);
    expect(stats.promotions).toBe(1);

    // mechanism-explanation has a promoted entry, so only the other 3 families lack promoted
    expect(stats.familiesWithoutPromoted).toContain("concept-introduction");
    expect(stats.familiesWithoutPromoted).toContain("system-model");
    expect(stats.familiesWithoutPromoted).toContain("progression-journey");
    expect(stats.familiesWithoutPromoted).not.toContain(
      "mechanism-explanation",
    );
  });
});
