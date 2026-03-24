/**
 * VTT subtitle parser — shared between scripts/generate-captions.ts and src/tts/ttsClient.ts.
 *
 * NOTE: edge-tts outputs timestamps with comma separator (HH:MM:SS,mmm)
 * instead of standard WebVTT dot separator (HH:MM:SS.mmm).
 * This parser handles the edge-tts format specifically.
 */
import type { Caption } from "@remotion/captions";

/**
 * Parse an edge-tts VTT timestamp string to milliseconds.
 * Format: "HH:MM:SS,mmm" (comma-separated, not dot)
 */
export function parseVttTimestamp(ts: string): number {
  // "00:00:04,500" → 4500 ms
  const parts = ts.split(":");
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const secMs = parts[2].split(",");
  const seconds = parseInt(secMs[0], 10);
  const ms = parseInt(secMs[1], 10);
  return hours * 3600000 + minutes * 60000 + seconds * 1000 + ms;
}

/**
 * Parse VTT content into word-level Caption array.
 * Splits each VTT cue into individual words with proportionally estimated timing.
 */
export function vttToCaptions(vttContent: string): Caption[] {
  const captions: Caption[] = [];
  const lines = vttContent.trim().split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    // Look for timestamp line: "00:00:00,100 --> 00:00:04,500"
    if (line.includes("-->")) {
      const [startStr, endStr] = line.split("-->").map((s) => s.trim());
      const startMs = parseVttTimestamp(startStr);
      const endMs = parseVttTimestamp(endStr);

      // Collect text lines until empty line or end
      i++;
      const textLines: string[] = [];
      while (i < lines.length && lines[i].trim() !== "") {
        // Skip numeric cue IDs
        if (!/^\d+$/.test(lines[i].trim())) {
          textLines.push(lines[i].trim());
        }
        i++;
      }

      const fullText = textLines.join(" ");
      if (fullText.length === 0) continue;

      // Split into word-level captions with estimated timing
      const words = fullText.split(/\s+/);
      const totalDuration = endMs - startMs;
      const wordDuration = totalDuration / words.length;

      words.forEach((word, wi) => {
        const wordStart = startMs + wi * wordDuration;
        const wordEnd = startMs + (wi + 1) * wordDuration;

        captions.push({
          text: (wi > 0 ? " " : "") + word,
          startMs: Math.round(wordStart),
          endMs: Math.round(wordEnd),
          timestampMs: Math.round(wordStart),
          confidence: null,
        });
      });
    }

    i++;
  }

  return captions;
}
