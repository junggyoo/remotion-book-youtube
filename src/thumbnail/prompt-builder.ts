import type { ThumbnailConfig } from "./types";
import type { BookMetadata } from "@/types";

// --- Brand constants (modify these to tune prompt quality) ---

const BASE_LAYOUT = `
  YouTube thumbnail, 16:9 aspect ratio, 1280x720.
  Overlay composition: person fills most of the frame.
  Clean composition with one dominant focal point.
  Do not include any text, titles, captions, or watermarks in the image.
`.trim();

const TEXT_WHITESPACE = `
  Leave the upper-left area of the image relatively clean and uncluttered
  for text overlay to be added later. Do not put the person's face or
  important elements in the upper-left quadrant.
`.trim();

const BRAND_NEGATIVE_RULES = `
  Do not add extra decorative objects.
  Do not make the composition busy or cluttered.
  Do not create more than one dominant focal point.
  Do not use meme-style cheap clickbait expressions.
  Do not make it look childish or low quality.
  Do not render any text or letters on the image.
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
    TEXT_WHITESPACE,
    BRAND_NEGATIVE_RULES,
  ];

  return parts.join("\n").trim();
}
