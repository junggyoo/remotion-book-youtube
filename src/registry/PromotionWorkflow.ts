/**
 * PromotionWorkflow — Lifecycle state machine for scene registry entries.
 *
 * D6: Promotion uses triple check:
 *   1. All renderStable must be true
 *   2. Average thresholds via checkPromotionEligibility()
 *   3. Min floor: timingCoherence >= 0.6, focusClarity >= 0.3
 *
 * D7: Demotion is conservative:
 *   3 consecutive failing observations required (not 2)
 */

import type { SceneRegistry } from "./SceneRegistry";
import type { PromotionRecord } from "./types";
import type { PromotionObservation } from "@/validator/promotionObserver";
import { checkPromotionEligibility } from "@/validator/promotionObserver";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_DISTINCT_BOOKS = 3;
const DEMOTION_CONSECUTIVE_THRESHOLD = 3;
const MIN_FLOOR = { timingCoherence: 0.6, focusClarity: 0.3 };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkflowDecision {
  action: "promoted" | "demoted" | "hold";
  reason: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function averageObservations(
  observations: PromotionObservation[],
): PromotionObservation {
  const n = observations.length;
  return {
    blueprintId: observations[0].blueprintId,
    sceneType: observations[0].sceneType,
    bookId: observations[0].bookId,
    renderStable: observations.every((o) => o.renderStable),
    timingCoherence:
      observations.reduce((s, o) => s + o.timingCoherence, 0) / n,
    focusClarity: observations.reduce((s, o) => s + o.focusClarity, 0) / n,
    motionEntropy: observations.reduce((s, o) => s + o.motionEntropy, 0) / n,
    maxActivatesPerBeat: Math.max(
      ...observations.map((o) => o.maxActivatesPerBeat),
    ),
    maxConcurrentChannels: Math.max(
      ...observations.map((o) => o.maxConcurrentChannels),
    ),
  };
}

// ---------------------------------------------------------------------------
// Workflow
// ---------------------------------------------------------------------------

export class PromotionWorkflow {
  constructor(private registry: SceneRegistry) {}

  evaluatePromotion(entryId: string): WorkflowDecision {
    const entry = this.registry.getById(entryId);
    if (!entry) {
      return { action: "hold", reason: `Entry "${entryId}" not found` };
    }

    if (entry.lifecycleStatus !== "validated") {
      return {
        action: "hold",
        reason: `Entry must be in "validated" status (current: "${entry.lifecycleStatus}")`,
      };
    }

    const observations = entry.observations;

    // Check distinct books
    const distinctBooks = new Set(observations.map((o) => o.bookId));
    if (distinctBooks.size < MIN_DISTINCT_BOOKS) {
      return {
        action: "hold",
        reason: `Need ${MIN_DISTINCT_BOOKS}+ distinct books, have ${distinctBooks.size}`,
      };
    }

    // D6 check 1: All renderStable must be true
    if (!observations.every((o) => o.renderStable)) {
      return {
        action: "hold",
        reason: "Not all observations have renderStable = true",
      };
    }

    // D6 check 3: Min floor (check before average so floor failures are reported)
    const minTimingCoherence = Math.min(
      ...observations.map((o) => o.timingCoherence),
    );
    const minFocusClarity = Math.min(
      ...observations.map((o) => o.focusClarity),
    );

    if (minTimingCoherence < MIN_FLOOR.timingCoherence) {
      return {
        action: "hold",
        reason: `Min timingCoherence floor failed: ${minTimingCoherence.toFixed(2)} < ${MIN_FLOOR.timingCoherence}`,
      };
    }

    if (minFocusClarity < MIN_FLOOR.focusClarity) {
      return {
        action: "hold",
        reason: `Min focusClarity floor failed: ${minFocusClarity.toFixed(2)} < ${MIN_FLOOR.focusClarity}`,
      };
    }

    // D6 check 2: Average must pass checkPromotionEligibility
    const averaged = averageObservations(observations);
    const { eligible, failures } = checkPromotionEligibility(averaged);

    if (!eligible) {
      return {
        action: "hold",
        reason: `Average threshold failed: ${failures.join(", ")}`,
      };
    }

    // All checks passed — promote
    const avgTimingCoherence = averaged.timingCoherence;
    const avgFocusClarity = averaged.focusClarity;

    this.registry.updateStatus(
      entryId,
      "promoted",
      "PromotionWorkflow: all checks passed",
    );

    const promotionRecord: PromotionRecord = {
      entryId,
      family: entry.family,
      action: "promoted",
      reason: `Promoted with ${observations.length} observations from ${distinctBooks.size} distinct books`,
      observationCount: observations.length,
      avgTimingCoherence,
      avgFocusClarity,
      minTimingCoherence,
      minFocusClarity,
      decidedAt: new Date().toISOString(),
    };

    this.registry.logPromotion(promotionRecord);

    return {
      action: "promoted",
      reason: promotionRecord.reason,
    };
  }

  evaluateDemotion(entryId: string): WorkflowDecision {
    const entry = this.registry.getById(entryId);
    if (!entry) {
      return { action: "hold", reason: `Entry "${entryId}" not found` };
    }

    if (entry.lifecycleStatus !== "promoted") {
      return {
        action: "hold",
        reason: `Entry must be in "promoted" status (current: "${entry.lifecycleStatus}")`,
      };
    }

    const observations = entry.observations;

    if (observations.length < DEMOTION_CONSECUTIVE_THRESHOLD) {
      return {
        action: "hold",
        reason: `Need at least ${DEMOTION_CONSECUTIVE_THRESHOLD} observations for demotion check`,
      };
    }

    // D7: Last 3 observations must ALL fail
    const lastN = observations.slice(-DEMOTION_CONSECUTIVE_THRESHOLD);
    const allFail = lastN.every((o) => {
      const { eligible } = checkPromotionEligibility(o);
      return !eligible;
    });

    if (!allFail) {
      return {
        action: "hold",
        reason: "Last 3 observations are not all failing — no demotion",
      };
    }

    // Demote
    this.registry.updateStatus(
      entryId,
      "demoted",
      "PromotionWorkflow: 3 consecutive failures",
    );

    const avgTimingCoherence =
      lastN.reduce((s, o) => s + o.timingCoherence, 0) / lastN.length;
    const avgFocusClarity =
      lastN.reduce((s, o) => s + o.focusClarity, 0) / lastN.length;
    const minTimingCoherence = Math.min(...lastN.map((o) => o.timingCoherence));
    const minFocusClarity = Math.min(...lastN.map((o) => o.focusClarity));

    const demotionRecord: PromotionRecord = {
      entryId,
      family: entry.family,
      action: "demoted",
      reason: `Demoted after ${DEMOTION_CONSECUTIVE_THRESHOLD} consecutive failing observations`,
      observationCount: observations.length,
      avgTimingCoherence,
      avgFocusClarity,
      minTimingCoherence,
      minFocusClarity,
      decidedAt: new Date().toISOString(),
    };

    this.registry.logPromotion(demotionRecord);

    return {
      action: "demoted",
      reason: demotionRecord.reason,
    };
  }
}
