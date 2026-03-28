import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

const COVER_3D_PROMPT = `
Take this book cover image and render it as a realistic 3D book object.
The book should be:
- Slightly angled/tilted to show depth and perspective (about 15 degrees)
- With visible spine thickness
- Dramatic lighting from the upper right
- Subtle shadow underneath
- On a completely transparent/clean background (no other objects)
- High quality, photorealistic rendering
- Do not add any text or change the cover content
- Do not add extra objects around the book
- The book should fill most of the frame
`.trim();

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
        return Buffer.from(part.inlineData.data, "base64");
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
