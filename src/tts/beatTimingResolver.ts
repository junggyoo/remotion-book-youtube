import type { Caption } from "@remotion/captions";
import type { Beat, BeatTimingResolution } from "../types";
import { splitKoreanSentences } from "./subtitleGen";

/**
 * Resolve beat boundaries from VTT captions.
 *
 * Algorithm (adapted from subtitleGen.ts sentence-VTT matching):
 * 1. For each beat, split narrationText into sentences
 * 2. Match sentences to captions sequentially (forward-scan)
 * 3. Beat boundary = first matched caption startMs ~ last matched caption endMs
 * 4. Convert ms → frames
 * 5. Fallback: ratio × sceneDurationFrames
 */
export function resolveBeatTimings(
  beats: Beat[],
  captions: Caption[],
  sceneDurationFrames: number,
  fps: number,
): BeatTimingResolution[] {
  const results: BeatTimingResolution[] = [];
  let captionSearchIndex = 0;

  for (const beat of beats) {
    // Visual-only beat or empty captions → ratio-based fallback
    if (
      !beat.narrationText ||
      beat.narrationText.trim().length === 0 ||
      captions.length === 0
    ) {
      results.push({
        beatId: beat.id,
        resolvedStartFrame: Math.round(beat.startRatio * sceneDurationFrames),
        resolvedEndFrame: Math.round(beat.endRatio * sceneDurationFrames),
        originalStartRatio: beat.startRatio,
        originalEndRatio: beat.endRatio,
      });
      continue;
    }

    const sentences = splitKoreanSentences(beat.narrationText);
    let firstCaptionStartMs: number | null = null;
    let lastCaptionEndMs: number | null = null;

    for (const sentence of sentences) {
      const normalizedSentence = sentence.replace(/\s+/g, "");
      let accumulated = "";
      let firstIdx = -1;

      for (let i = captionSearchIndex; i < captions.length; i++) {
        accumulated += captions[i].text.replace(/\s+/g, "");
        if (firstIdx === -1) firstIdx = i;

        if (accumulated.length >= normalizedSentence.length) {
          // Match found
          if (firstCaptionStartMs === null) {
            firstCaptionStartMs = captions[firstIdx].startMs;
          }
          lastCaptionEndMs = captions[i].endMs;
          captionSearchIndex = i + 1;
          break;
        }
      }
    }

    if (firstCaptionStartMs !== null && lastCaptionEndMs !== null) {
      results.push({
        beatId: beat.id,
        resolvedStartFrame: Math.round((firstCaptionStartMs / 1000) * fps),
        resolvedEndFrame: Math.round((lastCaptionEndMs / 1000) * fps),
        originalStartRatio: beat.startRatio,
        originalEndRatio: beat.endRatio,
      });
    } else {
      // VTT matching failed → ratio-based fallback
      results.push({
        beatId: beat.id,
        resolvedStartFrame: Math.round(beat.startRatio * sceneDurationFrames),
        resolvedEndFrame: Math.round(beat.endRatio * sceneDurationFrames),
        originalStartRatio: beat.startRatio,
        originalEndRatio: beat.endRatio,
      });
    }
  }

  return results;
}
