import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import fs from "fs";
import path from "path";

const COVER_3D_PROMPT = `
Take this book cover image and render it as a realistic 3D book object
with a transparent background (PNG with alpha channel).
The book should be:
- Slightly angled/tilted to show depth and perspective (about 15 degrees)
- With visible spine thickness
- Dramatic lighting from the upper right
- Subtle shadow underneath the book
- The background MUST be completely transparent, not white, not black, not any color
- High quality, photorealistic rendering
- Do not add any text or change the cover content
- Do not add extra objects around the book
- The book should fill most of the frame
- Output as PNG with transparent background
`.trim();

// Remove light backgrounds by making near-white/near-black pixels transparent
async function removeBackground(imageBuffer: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(imageBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const threshold = 240; // pixels with R,G,B all > 240 → transparent

  for (let i = 0; i < width * height; i++) {
    const offset = i * channels;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];

    // Remove near-white backgrounds
    if (r > threshold && g > threshold && b > threshold) {
      data[offset + 3] = 0; // set alpha to 0
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
        return removeBackground(rawBuffer);
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
