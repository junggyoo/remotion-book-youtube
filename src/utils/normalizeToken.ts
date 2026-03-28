/**
 * Korean token normalizer for emphasis matching (P2-3).
 *
 * Strips common Korean particles from words 3+ characters long.
 * Short words (1-2 chars) are left intact to prevent meaning loss.
 */

/** Korean particles to strip (ordered longest-first for greedy match) */
const KOREAN_PARTICLES = [
  "에서",
  "은",
  "는",
  "이",
  "가",
  "을",
  "를",
  "에",
  "의",
  "로",
  "와",
  "과",
  "도",
  "만",
];

/**
 * Normalize a token for emphasis matching.
 * - Trims whitespace
 * - Lowercases (for English mixed text)
 * - Removes punctuation (.,!?·…""''「」)
 * - Strips Korean particles from words 3+ chars
 */
export function normalizeToken(text: string): string {
  let result = text.trim().toLowerCase();

  // Remove common punctuation
  result = result.replace(/[.,!?·…""''「」:;~()\[\]{}]/g, "");

  // Only strip particles from words 3+ chars
  if (result.length >= 3) {
    for (const particle of KOREAN_PARTICLES) {
      if (result.endsWith(particle) && result.length > particle.length) {
        result = result.slice(0, -particle.length);
        break; // Only strip one particle
      }
    }
  }

  return result;
}
