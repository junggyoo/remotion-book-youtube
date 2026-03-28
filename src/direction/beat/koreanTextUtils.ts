/**
 * Korean text analysis utilities for beat composition.
 * Extracted from beat-composer for reuse across the direction system.
 */

/** Split Korean text into sentences by sentence-ending markers. */
export function splitKoreanSentences(text: string): string[] {
  const raw = text
    .split(/(?<=[.?!다요죠니까세요습니다])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return raw.length > 0 ? raw : [text];
}

export type BoundaryStrength = "strong" | "medium" | "weak";

export const STRONG_MARKERS = [
  "그런데",
  "하지만",
  "반면에",
  "한편",
  "실제로",
  "연구에 따르면",
  "흥미로운 건",
  "데이터를 보면",
  "결국",
  "핵심은",
  "정리하면",
  "한 마디로",
  "그 후",
  "몇 년 뒤",
  "지금은",
  "당신은",
  "여러분은",
];

export const MEDIUM_MARKERS = [
  "예를 들어",
  "구체적으로",
  "실제 사례로",
  "특히",
  "무엇보다",
  "가장 중요한 건",
  "반대로",
  "다른 관점에서",
];

export function gradeBoundary(nextSentence: string): BoundaryStrength {
  const trimmed = nextSentence.trimStart();
  for (const marker of STRONG_MARKERS) {
    if (trimmed.startsWith(marker)) return "strong";
  }
  for (const marker of MEDIUM_MARKERS) {
    if (trimmed.startsWith(marker)) return "medium";
  }
  return "weak";
}

/** Extract emphasis targets from Korean text: numbers, English terms, quoted strings. */
export function extractEmphasisTargets(text: string, maxCount = 3): string[] {
  const targets: string[] = [];

  const numbers = text.match(
    /\d+[\d,.]*(?:%|배|개|가지|초|분|시간|년|권|부|만|억|천)?/g,
  );
  if (numbers)
    targets.push(...numbers.filter((n) => n.length >= 2 || /\d{2,}/.test(n)));

  const english = text.match(/[A-Z][a-zA-Z]{2,}/g);
  if (english) targets.push(...english);

  const quoted = text.match(/[''""「」『』]([^''""「」『』]+)[''""「」『』]/g);
  if (quoted) {
    targets.push(
      ...quoted
        .map((q) => q.replace(/[''""「」『』]/g, ""))
        .filter((q) => q.length > 1),
    );
  }

  return Array.from(new Set(targets)).slice(0, maxCount);
}
