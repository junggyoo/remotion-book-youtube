import type { ThumbnailConfig } from "./types";
import type { BookMetadata } from "@/types";

// --- Brand constants (modify these to tune prompt quality) ---

const BRAND_TEXT_STYLE = `
  bold white Korean text with black outline stroke,
  premium editorial feel, not cheap clickbait,
  large enough to read on mobile, maximum 2 lines
`.trim();

const BASE_LAYOUT = `
  YouTube thumbnail, 16:9 aspect ratio, 1280x720.
  Overlay composition: person fills most of the frame,
  hook text overlaid on upper-left area.
  Clean composition with one dominant focal point.
`.trim();

const BRAND_NEGATIVE_RULES = `
  Do not add extra decorative objects.
  Do not make the composition busy or cluttered.
  Do not use tiny unreadable Korean text.
  Do not create more than one dominant focal point.
  Do not use meme-style cheap clickbait expressions.
  Do not make it look childish or low quality.
`.trim();

// --- Prompt builder ---

export function buildPrompt(
  thumbnail: ThumbnailConfig,
  metadata: BookMetadata,
): string {
  const parts = [
    BASE_LAYOUT,
    `Context: This is a thumbnail for a Korean ${metadata.genre} book insight video.`,
    `Person: ${thumbnail.expression}, ${thumbnail.gesture}.`,
    `Background: ${thumbnail.backgroundStyle ?? "dark cinematic gradient"}.`,
    `Mood: ${thumbnail.mood ?? "dramatic"}.`,
    `Korean text on image: "${thumbnail.hookText}"`,
    `Text style: ${BRAND_TEXT_STYLE}`,
    BRAND_NEGATIVE_RULES,
  ];

  return parts.join("\n").trim();
}
