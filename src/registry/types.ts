/**
 * Scene Registry Types
 *
 * D1: lifecycleStatus (pure lifecycle) is separated from origin (source).
 *     "builtin" is NOT a valid lifecycle status — it is an origin value.
 * D2: origin includes "invention", "migration", "builtin", "manual"
 * D6: Promotion uses avg + min floor + all renderStable
 * D7: Demotion requires 3 consecutive failures
 */

import type { LayoutType, ChoreographyType, MotionPresetKey } from "@/types";
import type { SceneFamily } from "@/direction/types";
import type { PromotionObservation } from "@/validator/promotionObserver";

// ─── Lifecycle vs Origin (D1 axis separation) ───────────────────────────────

export type LifecycleStatus =
  | "active"
  | "invented"
  | "validated"
  | "promoted"
  | "demoted"
  | "expired"
  | "archived";

export type EntryOrigin = "builtin" | "invention" | "manual" | "migration";

// ─── Recipe Template ────────────────────────────────────────────────────────

export interface ElementTemplate {
  id: string;
  type: string;
  props: Record<string, unknown>;
  layer: number;
  beatActivationKey: string;
}

export interface RecipeTemplate {
  defaultLayout: LayoutType;
  defaultChoreography: ChoreographyType;
  elementTemplate: ElementTemplate[];
  defaultMotionPreset?: MotionPresetKey;
  layoutConfig?: Record<string, unknown>;
}

// ─── Applicability (future weighted selection) ──────────────────────────────

export interface Applicability {
  formats?: ("longform" | "shorts")[];
  genres?: string[];
}

// ─── Traceability ───────────────────────────────────────────────────────────

export interface DerivedFromInfo {
  gapCapabilities: string[];
  fallbackPreset?: string;
}

// ─── Main Entry ─────────────────────────────────────────────────────────────

export interface RegistryEntry {
  id: string;
  family: SceneFamily;
  lifecycleStatus: LifecycleStatus;
  origin: EntryOrigin;
  recipe: RecipeTemplate;
  observations: PromotionObservation[];
  version?: number;
  createdAt: string;
  updatedAt: string;
  statusReason?: string;
  applicability?: Applicability;
  derivedFrom?: DerivedFromInfo;
}

// ─── Blueprint Snapshot (for invention records) ─────────────────────────────

export interface BlueprintSnapshot {
  layout: LayoutType;
  choreography: ChoreographyType;
  elementCount: number;
  motionPreset: MotionPresetKey;
}

// ─── Invention ──────────────────────────────────────────────────────────────

export type InventionStatus =
  | "invented"
  | "validation-passed"
  | "validation-failed"
  | "promoted"
  | "expired";

export interface ValidationResult {
  passed: boolean;
  violations: string[];
  checkedAt: string;
}

export interface InventionRecord {
  id: string;
  gapId: string;
  bookId: string;
  family: SceneFamily;
  blueprintSnapshot: BlueprintSnapshot;
  status: InventionStatus;
  inventedAt: string;
  expiresAt: string;
  validationResult: ValidationResult | null;
  derivedFrom?: DerivedFromInfo;
}

// ─── Promotion ──────────────────────────────────────────────────────────────

export interface PromotionRecord {
  entryId: string;
  family: SceneFamily;
  action: "promoted" | "demoted" | "expired";
  reason: string;
  observationCount: number;
  avgTimingCoherence: number;
  avgFocusClarity: number;
  minTimingCoherence: number;
  minFocusClarity: number;
  decidedAt: string;
}

// ─── Registry State ─────────────────────────────────────────────────────────

export interface RegistryState {
  version: number;
  entries: RegistryEntry[];
  inventionLog: InventionRecord[];
  promotionLog: PromotionRecord[];
  lastUpdated: string;
}
