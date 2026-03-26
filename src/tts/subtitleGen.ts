import type { Caption } from "@remotion/captions";
import type { SubtitleEntry } from "@/types";

/** Canonical max chars per line (Spec §1: 28자) */
export const MAX_CHARS_PER_LINE = 28;

/** Max subtitle lines */
export const MAX_LINES = 2;

/** Subtitle lead frames — show subtitle 3 frames before VO starts (Spec §1) */
export const LEAD_FRAMES = 3;

/**
 * Split text into lines of max MAX_CHARS_PER_LINE chars, max MAX_LINES lines.
 * Excess text beyond 2 lines is trimmed.
 * Pre-processes: normalizes missing spaces after sentence-ending punctuation.
 */
export function splitToLines(text: string): string[] {
  const lines: string[] = [];
  // 문장부호 뒤 공백 정규화: "시작할까요?세 가지" → "시작할까요? 세 가지"
  let remaining = text.trim().replace(/([?!])([가-힣])/g, "$1 $2");

  while (remaining.length > 0 && lines.length < MAX_LINES) {
    if (remaining.length <= MAX_CHARS_PER_LINE) {
      lines.push(remaining);
      remaining = "";
    } else {
      // Try to break at a space within the limit
      let breakIndex = remaining.lastIndexOf(" ", MAX_CHARS_PER_LINE);
      if (breakIndex <= 0) {
        // No space found — hard break at limit
        breakIndex = MAX_CHARS_PER_LINE;
      }
      lines.push(remaining.substring(0, breakIndex).trimEnd());
      remaining = remaining.substring(breakIndex).trimStart();
    }
  }

  return lines;
}

/** 한국어 연결어미 패턴 — clause 분리 지점 */
const CLAUSE_BREAK_PATTERN =
  /(?:고\s|며\s|지만\s|면서\s|해서\s|하여\s|하면\s|는데\s|니까\s|라서\s)/;

/**
 * Split a long Korean sentence into clause-level sub-sentences.
 * Only splits if the sentence exceeds MAX_CHARS_PER_LINE * MAX_LINES (56 chars).
 * Splits at comma+space or Korean connective endings.
 */
export function splitLongSentence(sentence: string): string[] {
  const MAX_DISPLAY = MAX_CHARS_PER_LINE * MAX_LINES; // 56
  if (sentence.length <= MAX_DISPLAY) return [sentence];

  const results: string[] = [];
  let remaining = sentence;

  while (remaining.length > MAX_DISPLAY) {
    const searchRange = remaining.slice(0, MAX_DISPLAY);

    // 1순위: 쉼표+공백 기준 분리
    const commaIdx = searchRange.lastIndexOf(", ");
    if (commaIdx > 10) {
      results.push(remaining.slice(0, commaIdx + 1).trim());
      remaining = remaining.slice(commaIdx + 2).trim();
      continue;
    }

    // 2순위: 연결어미 패턴 기준 분리
    const clauseMatch = searchRange.match(CLAUSE_BREAK_PATTERN);
    if (
      clauseMatch &&
      clauseMatch.index !== undefined &&
      clauseMatch.index > 10
    ) {
      const splitAt = clauseMatch.index + clauseMatch[0].length;
      results.push(remaining.slice(0, splitAt).trim());
      remaining = remaining.slice(splitAt).trim();
      continue;
    }

    // 3순위: 어절 단위(공백) 분리 — 조사 분리 방지
    const spaceIdx = searchRange.lastIndexOf(" ");
    if (spaceIdx > 0) {
      results.push(remaining.slice(0, spaceIdx).trim());
      remaining = remaining.slice(spaceIdx + 1).trim();
      continue;
    }

    // fallback: 그대로 반환
    break;
  }

  if (remaining.length > 0) {
    results.push(remaining.trim());
  }

  return results;
}

/**
 * Generate a SubtitleEntry for a scene.
 *
 * - startFrame is shifted earlier by LEAD_FRAMES (subtitle appears before VO)
 * - Lines are pre-split at 28 chars/line, max 2 lines
 */
export function generateSubtitles(
  sceneId: string,
  narrationText: string,
  startFrame: number,
  durationFrames: number,
): SubtitleEntry {
  const lines = splitToLines(narrationText);
  const text = lines.join("\n");

  const adjustedStart = Math.max(0, startFrame - LEAD_FRAMES);
  const endFrame = startFrame + durationFrames;

  return {
    text,
    startFrame: adjustedStart,
    endFrame,
    lines,
  };
}

/** Subtitle trail frames — keep subtitle 6 frames after VO ends (Spec §3-3) */
export const TRAIL_FRAMES = 6;

/**
 * Korean sentence ending patterns.
 * Matches formal/informal endings followed by period, or sentence-final punctuation.
 * Known limitations: may miss uncommon endings; add to this list as needed.
 * See .claude/skills/subtitle-audio/korean-nlp-rules.md for details.
 */
const KOREAN_SENTENCE_ENDINGS =
  /(?:습니다|입니다|됩니다|합니다|봅니다|줍니다|옵니다|에요|해요|하죠|네요|거든요|지요|까요|세요|어요|져요)\.\s*|[?!]\s+/g;

/**
 * Split Korean narration text into sentences.
 * Uses Korean sentence-ending patterns for splitting.
 * Falls back to returning the whole text as one sentence if no splits found.
 */
export function splitKoreanSentences(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  // Split using Korean sentence endings
  const parts: string[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const regex = new RegExp(KOREAN_SENTENCE_ENDINGS.source, "g");
  while ((match = regex.exec(trimmed)) !== null) {
    const sentence = trimmed
      .slice(lastIndex, match.index + match[0].length)
      .trim();
    if (sentence.length > 0) {
      parts.push(sentence);
    }
    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last match
  const remaining = trimmed.slice(lastIndex).trim();
  if (remaining.length > 0) {
    if (parts.length > 0) {
      // Append remaining to last sentence if it doesn't end with punctuation
      parts.push(remaining);
    } else {
      parts.push(remaining);
    }
  }

  // Fallback: if no splits found, return whole text as one sentence
  const sentences = parts.length > 0 ? parts : [trimmed];

  // 긴 문장을 clause 단위로 추가 분리
  const result: string[] = [];
  for (const s of sentences) {
    result.push(...splitLongSentence(s));
  }
  return result;
}

/**
 * Generate sentence-level SubtitleEntry[] from narration text and VTT-derived captions.
 * Each sentence gets its own SubtitleEntry with timing derived from matching Caption data.
 *
 * Fallback: if sentence-to-caption mapping fails, uses proportional timing.
 */
export function generateSentenceSubtitles(
  narrationText: string,
  captions: Caption[],
  sceneStartFrame: number,
  fps: number,
): SubtitleEntry[] {
  const sentences = splitKoreanSentences(narrationText);
  if (sentences.length === 0) return [];

  const totalDurationMs =
    captions.length > 0
      ? captions[captions.length - 1].endMs - captions[0].startMs
      : 0;
  const baseStartMs = captions.length > 0 ? captions[0].startMs : 0;

  const results: SubtitleEntry[] = [];
  let captionSearchIndex = 0;
  let usedDurationMs = 0;

  for (const sentence of sentences) {
    const lines = splitToLines(sentence);
    const text = lines.join("\n");

    let startMs: number;
    let endMs: number;

    // Try to match sentence to captions by text overlap
    const normalizedSentence = sentence.replace(/\s+/g, "");
    let matched = false;

    if (captions.length > 0 && normalizedSentence.length > 0) {
      // Find first caption whose text overlaps with sentence start
      let firstCaptionIdx = -1;
      let lastCaptionIdx = -1;
      let accumulated = "";

      for (let i = captionSearchIndex; i < captions.length; i++) {
        const captionText = captions[i].text.replace(/\s+/g, "");
        accumulated += captionText;

        if (firstCaptionIdx === -1 && accumulated.length > 0) {
          firstCaptionIdx = i;
        }

        // Check if we've accumulated enough text to cover this sentence
        if (accumulated.length >= normalizedSentence.length) {
          lastCaptionIdx = i;
          break;
        }
      }

      if (firstCaptionIdx !== -1 && lastCaptionIdx !== -1) {
        startMs = captions[firstCaptionIdx].startMs;
        endMs = captions[lastCaptionIdx].endMs;
        captionSearchIndex = lastCaptionIdx + 1;
        matched = true;
      }
    }

    if (!matched) {
      // Fallback: proportional timing based on character count
      const sentenceRatio = sentence.length / narrationText.length;
      startMs = baseStartMs + usedDurationMs;
      endMs = startMs + totalDurationMs * sentenceRatio;
    }

    usedDurationMs = endMs! - baseStartMs;

    // Convert ms to frames and apply lead/trail
    const startFrame = Math.max(
      0,
      Math.round((startMs! / 1000) * fps) + sceneStartFrame - LEAD_FRAMES,
    );
    const endFrame =
      Math.round((endMs! / 1000) * fps) + sceneStartFrame + TRAIL_FRAMES;

    results.push({ text, startFrame, endFrame, lines });
  }

  return results;
}
