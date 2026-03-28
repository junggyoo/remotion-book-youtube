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
