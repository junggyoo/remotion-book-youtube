/**
 * SceneRegistry — JSON-file-backed dynamic registry for scene recipes.
 *
 * Provides CRUD operations, lifecycle management, invention/promotion logging,
 * and best-recipe selection with status-priority sorting.
 */

import * as fs from "fs";
import * as path from "path";
import type { SceneFamily } from "@/direction/types";
import type { PromotionObservation } from "@/validator/promotionObserver";
import type {
  RegistryState,
  RegistryEntry,
  LifecycleStatus,
  InventionRecord,
  InventionStatus,
  PromotionRecord,
  ValidationResult,
} from "./types";
import { RegistryStateSchema } from "./registrySchema";

// ─── Status Priority (higher = better) ─────────────────────────────────────

const STATUS_PRIORITY: Record<LifecycleStatus, number> = {
  promoted: 6,
  validated: 5,
  active: 4,
  invented: 3,
  demoted: 2,
  archived: 1,
  expired: 0,
};

const EXCLUDED_FROM_BEST: Set<LifecycleStatus> = new Set([
  "expired",
  "demoted",
  "archived",
]);

// ─── Public Interface ──────────────────────────────────────────────────────

export interface BestRecipeOptions {
  format?: string;
  genre?: string;
}

export class SceneRegistry {
  private state: RegistryState;
  private filePath: string;

  private constructor(state: RegistryState, filePath: string) {
    this.state = state;
    this.filePath = filePath;
  }

  // ─── Factory Methods ───────────────────────────────────────────────────

  static create(filePath: string): SceneRegistry {
    const state: RegistryState = {
      version: 1,
      entries: [],
      inventionLog: [],
      promotionLog: [],
      lastUpdated: new Date().toISOString(),
    };
    return new SceneRegistry(state, filePath);
  }

  static load(filePath: string): SceneRegistry {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    const validated = RegistryStateSchema.parse(parsed);
    return new SceneRegistry(validated as RegistryState, filePath);
  }

  static loadOrCreate(filePath: string): SceneRegistry {
    if (fs.existsSync(filePath)) {
      return SceneRegistry.load(filePath);
    }
    return SceneRegistry.create(filePath);
  }

  // ─── Persistence ───────────────────────────────────────────────────────

  save(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.state.lastUpdated = new Date().toISOString();
    fs.writeFileSync(
      this.filePath,
      JSON.stringify(this.state, null, 2),
      "utf-8",
    );
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────

  register(entry: RegistryEntry): void {
    const existing = this.state.entries.find((e) => e.id === entry.id);
    if (existing) {
      throw new Error(`Duplicate registry entry ID: "${entry.id}"`);
    }
    this.state.entries.push(entry);
  }

  getById(id: string): RegistryEntry | undefined {
    return this.state.entries.find((e) => e.id === id);
  }

  getByFamily(family: SceneFamily): RegistryEntry[] {
    return this.state.entries.filter((e) => e.family === family);
  }

  getByStatus(status: LifecycleStatus): RegistryEntry[] {
    return this.state.entries.filter((e) => e.lifecycleStatus === status);
  }

  getBestRecipe(
    family: SceneFamily,
    _options?: BestRecipeOptions,
  ): RegistryEntry | undefined {
    // v1: _options accepted for API shape but not used for filtering yet
    const candidates = this.state.entries
      .filter((e) => e.family === family)
      .filter((e) => !EXCLUDED_FROM_BEST.has(e.lifecycleStatus));

    if (candidates.length === 0) return undefined;

    candidates.sort(
      (a, b) =>
        STATUS_PRIORITY[b.lifecycleStatus] - STATUS_PRIORITY[a.lifecycleStatus],
    );

    return candidates[0];
  }

  updateStatus(id: string, status: LifecycleStatus, reason?: string): void {
    const entry = this.state.entries.find((e) => e.id === id);
    if (!entry) {
      throw new Error(`Registry entry not found: "${id}"`);
    }
    entry.lifecycleStatus = status;
    entry.updatedAt = new Date().toISOString();
    if (reason !== undefined) {
      entry.statusReason = reason;
    }
  }

  addObservation(id: string, observation: PromotionObservation): void {
    const entry = this.state.entries.find((e) => e.id === id);
    if (!entry) {
      throw new Error(`Registry entry not found: "${id}"`);
    }
    entry.observations.push(observation);
    entry.updatedAt = new Date().toISOString();
  }

  // ─── Invention Log ─────────────────────────────────────────────────────

  logInvention(record: InventionRecord): void {
    this.state.inventionLog.push(record);
  }

  getInventionsByBook(bookId: string): InventionRecord[] {
    return this.state.inventionLog.filter((r) => r.bookId === bookId);
  }

  getPendingInventions(): InventionRecord[] {
    return this.state.inventionLog.filter((r) => r.status === "invented");
  }

  updateInventionStatus(
    id: string,
    status: InventionStatus,
    validationResult?: ValidationResult,
  ): void {
    const record = this.state.inventionLog.find((r) => r.id === id);
    if (!record) {
      throw new Error(`Invention record not found: "${id}"`);
    }
    record.status = status;
    if (validationResult !== undefined) {
      record.validationResult = validationResult;
    }
  }

  // ─── Promotion Log ─────────────────────────────────────────────────────

  logPromotion(record: PromotionRecord): void {
    this.state.promotionLog.push(record);
  }

  // ─── Expiry ────────────────────────────────────────────────────────────

  expireStaleInventions(): InventionRecord[] {
    const now = new Date();
    const expired: InventionRecord[] = [];

    for (const record of this.state.inventionLog) {
      if (record.status === "invented" && new Date(record.expiresAt) < now) {
        record.status = "expired";
        expired.push(record);
      }
    }

    return expired;
  }

  // ─── Stats ─────────────────────────────────────────────────────────────

  getStats(): {
    total: number;
    byStatus: Record<string, number>;
    byFamily: Record<string, number>;
    inventions: number;
    promotions: number;
    familiesWithoutPromoted: string[];
  } {
    const byStatus: Record<string, number> = {};
    const byFamily: Record<string, number> = {};
    const familiesWithPromoted = new Set<string>();
    const allFamilies = new Set<string>();

    for (const entry of this.state.entries) {
      byStatus[entry.lifecycleStatus] =
        (byStatus[entry.lifecycleStatus] ?? 0) + 1;
      byFamily[entry.family] = (byFamily[entry.family] ?? 0) + 1;
      allFamilies.add(entry.family);
      if (entry.lifecycleStatus === "promoted") {
        familiesWithPromoted.add(entry.family);
      }
    }

    const familiesWithoutPromoted = [...allFamilies].filter(
      (f) => !familiesWithPromoted.has(f),
    );

    return {
      total: this.state.entries.length,
      byStatus,
      byFamily,
      inventions: this.state.inventionLog.length,
      promotions: this.state.promotionLog.length,
      familiesWithoutPromoted,
    };
  }
}
