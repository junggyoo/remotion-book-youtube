/**
 * Dual-strategy emphasis target matching (P2-3).
 *
 * Strategy 1: Substring match (targets 2+ chars only) — "정체성은" contains "정체성"
 * Strategy 2: Normalized exact match — normalizeToken("정체성은") === normalizeToken("정체성")
 *
 * 1-char targets skip substring matching to avoid false positives
 * (e.g., "힘" matching "힘들다", "나라의힘").
 */

import { normalizeToken } from "./normalizeToken";

/**
 * Match a spoken word against emphasis targets.
 * Returns the matched target string, or null if no match.
 */
export function matchEmphasisTarget(
  word: string,
  targets: string[],
): string | null {
  if (!word || targets.length === 0) return null;

  const cleanWord = word.trim().replace(/\s+/g, "");
  if (cleanWord.length === 0) return null;

  // Strategy 1: Substring match (2+ char targets only)
  for (const target of targets) {
    if (target.length >= 2 && cleanWord.includes(target)) {
      return target;
    }
  }

  // Strategy 2: Normalized exact match
  const normalizedWord = normalizeToken(cleanWord);
  for (const target of targets) {
    const normalizedTarget = normalizeToken(target);
    if (normalizedWord === normalizedTarget) {
      return target;
    }
  }

  return null;
}

/**
 * Result of matching an emphasis target within a VTT chunk.
 */
export interface ChunkMatchResult {
  /** The target string that was matched */
  matchedTarget: string;
  /** Character position in chunk where match starts */
  spanStart: number;
  /** Character position in chunk where match ends */
  spanEnd: number;
}

/**
 * Match emphasis targets against a full VTT chunk (subtitle segment).
 * Returns matched span within the chunk for natural phrase-boundary highlighting.
 *
 * Uses a dual strategy mirroring matchEmphasisTarget:
 * 1. Substring match for 2+ char targets — finds exact position in chunk
 * 2. Normalized token-walk fallback — walks chunk tokens looking for particle-stripped matches
 *
 * Returns the first matching target (preserving input order priority).
 */
export function matchEmphasisTargetInChunk(
  chunkText: string,
  emphasisTargets: string[],
): ChunkMatchResult | null {
  if (!chunkText || emphasisTargets.length === 0) return null;

  const trimmed = chunkText.trim();
  if (trimmed.length === 0) return null;

  // Strategy 1: Substring match (2+ char targets, first target wins)
  for (const target of emphasisTargets) {
    if (target.length >= 2) {
      const idx = trimmed.indexOf(target);
      if (idx !== -1) {
        return {
          matchedTarget: target,
          spanStart: idx,
          spanEnd: idx + target.length,
        };
      }
    }
  }

  // Strategy 2: Normalized token-walk for 1-char targets or particle variations
  // Split chunk into tokens and check each against targets
  const tokenPattern = /\S+/g;
  let tokenMatch: RegExpExecArray | null;
  while ((tokenMatch = tokenPattern.exec(trimmed)) !== null) {
    const token = tokenMatch[0];
    const tokenStart = tokenMatch.index;

    for (const target of emphasisTargets) {
      const normalizedToken = normalizeToken(token);
      const normalizedTarget = normalizeToken(target);
      if (normalizedToken === normalizedTarget) {
        return {
          matchedTarget: target,
          spanStart: tokenStart,
          spanEnd: tokenStart + token.length,
        };
      }
    }
  }

  return null;
}
