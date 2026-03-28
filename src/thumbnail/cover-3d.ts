import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import fs from "fs";
import path from "path";

const COVER_3D_PROMPT = `
Take this book cover image and render it as a realistic 3D book object.
The book should be:
- Slightly angled/tilted to show depth and perspective (about 15 degrees)
- With visible spine thickness
- Dramatic lighting from the upper right
- Subtle shadow underneath the book
- The background MUST be solid bright green (chroma key green, like a green screen)
- High quality, photorealistic rendering
- Do not add any text or change the cover content
- Do not add extra objects around the book
- The book should fill most of the frame
- Fill the entire background with uniform bright green color for easy removal
`.trim();

// Remove chroma key green background by making green-dominant pixels transparent
async function removeGreenScreen(imageBuffer: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(imageBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;

  for (let i = 0; i < width * height; i++) {
    const offset = i * channels;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];

    // Green-dominant: G is higher than R and B (relaxed threshold for edge cleanup)
    const isGreen = g > 80 && g > r * 1.2 && g > b * 1.2;

    if (isGreen) {
      // Soft edge: partial transparency based on green dominance
      const greenness = Math.min(1, (g - Math.max(r, b)) / 60);
      data[offset + 3] = Math.round(255 * (1 - greenness));

      // Despill: reduce green tint on semi-transparent edge pixels
      if (data[offset + 3] > 0) {
        data[offset + 1] = Math.min(g, Math.max(r, b));
      }
    }
  }

  return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
}

export async function generate3dCover(
  coverPath: string,
  apiKey: string,
): Promise<Buffer | null> {
  if (!fs.existsSync(coverPath)) {
    console.warn(`Book cover not found: ${coverPath} — skipping 3D cover`);
    return null;
  }

  const coverData = fs.readFileSync(coverPath);
  const ext = path.extname(coverPath).toLowerCase();
  const mimeType = ext === ".png" ? "image/png" : "image/jpeg";

  const ai = new GoogleGenAI({ apiKey });

  try {
    console.log("Generating 3D book cover...");

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType,
                data: coverData.toString("base64"),
              },
            },
            { text: COVER_3D_PROMPT },
          ],
        },
      ],
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          aspectRatio: "1:1",
        },
      },
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) return null;

    for (const part of parts) {
      if (part.inlineData?.data) {
        const rawBuffer = Buffer.from(part.inlineData.data, "base64");
        return removeGreenScreen(rawBuffer);
      }
    }

    return null;
  } catch (err) {
    console.warn(
      `3D cover generation failed: ${err instanceof Error ? err.message : err} — using flat cover`,
    );
    return null;
  }
}
