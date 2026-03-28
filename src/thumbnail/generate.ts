import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";
import type { ThumbnailConfig } from "./types";
import type { BookMetadata, GenreKey } from "@/types";
import { buildPrompt } from "./prompt-builder";
import { compositeText } from "./composite";
import designTokens from "../design/tokens/design-tokens-draft.json";

// --- Genre accent color resolution ---

const genreAccentMap: Record<string, string> = Object.fromEntries(
  Object.entries(designTokens.colors.genreVariants).map(([key, val]) => [
    key,
    val.accent,
  ]),
);

function resolveAccentColor(genre: GenreKey): string {
  return (
    genreAccentMap[genre] ?? designTokens.colors.genreVariants.selfHelp.accent
  );
}

// --- Face image loading ---

export interface FaceImage {
  mimeType: string;
  data: string; // base64
}

export function loadFaceImages(faceDir: string): FaceImage[] {
  const files = fs
    .readdirSync(faceDir)
    .filter((f) => /\.(jpg|jpeg|png)$/i.test(f));

  if (files.length === 0) {
    throw new Error(
      `No face reference images found in ${faceDir}. Add 3-5 jpg/png files.`,
    );
  }

  return files.map((f) => {
    const data = fs.readFileSync(path.join(faceDir, f));
    const ext = path.extname(f).toLowerCase();
    const mimeType = ext === ".png" ? "image/png" : "image/jpeg";
    return { mimeType, data: data.toString("base64") };
  });
}

// --- Output saving ---

export interface SaveResult {
  imagePath: string;
  promptPath: string;
}

export function saveThumbnail(
  outputBase: string,
  bookId: string,
  imageBuffer: Buffer,
  prompt: string,
): SaveResult {
  const bookDir = path.join(outputBase, bookId);
  fs.mkdirSync(bookDir, { recursive: true });

  const timestamp = new Date().toISOString().slice(0, 10);
  const existing = fs
    .readdirSync(bookDir)
    .filter((f) => f.startsWith(timestamp) && f.endsWith(".png"));
  const seq = String(existing.length + 1).padStart(3, "0");

  const imagePath = path.join(bookDir, `${timestamp}-${seq}.png`);
  const promptPath = path.join(bookDir, "prompt.txt");

  fs.writeFileSync(imagePath, imageBuffer);
  fs.writeFileSync(promptPath, prompt);

  return { imagePath, promptPath };
}

// --- Gemini API call ---

const MAX_RETRIES = 3;

export async function generateThumbnail(
  thumbnail: ThumbnailConfig,
  metadata: BookMetadata,
  faceDir: string,
  outputBase: string,
  coverDir?: string,
): Promise<SaveResult> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GOOGLE_AI_API_KEY not set. Add it to .env file:\nGOOGLE_AI_API_KEY=your-key-here",
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  const faceImages = loadFaceImages(faceDir);
  const prompt = buildPrompt(thumbnail, metadata);

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(
        `Generating thumbnail (attempt ${attempt}/${MAX_RETRIES})...`,
      );

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-image-preview",
        contents: [
          {
            role: "user",
            parts: [
              ...faceImages.map((img) => ({
                inlineData: { mimeType: img.mimeType, data: img.data },
              })),
              {
                text: `Using the person in these reference photos:\n\n${prompt}`,
              },
            ],
          },
        ],
        config: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: {
            aspectRatio: "16:9",
            imageSize: "2K",
          },
        },
      });

      // Extract image from response
      const parts = response.candidates?.[0]?.content?.parts;
      if (!parts) {
        throw new Error("No content parts in API response");
      }

      for (const part of parts) {
        if (part.inlineData?.data) {
          const rawImage = Buffer.from(part.inlineData.data, "base64");
          const accentColor = resolveAccentColor(metadata.genre);
          // Resolve book cover path from coverDir
          let coverPath: string | undefined;
          if (coverDir) {
            const coverFiles = fs
              .readdirSync(coverDir)
              .filter(
                (f) =>
                  f
                    .toLowerCase()
                    .includes(metadata.id.replace(/-\d{4}$/, "")) &&
                  /\.(jpg|jpeg|png)$/i.test(f),
              );
            if (coverFiles.length > 0) {
              coverPath = path.join(coverDir, coverFiles[0]);
            }
          }
          const composited = await compositeText(
            rawImage,
            thumbnail.hookText,
            thumbnail.accentWord,
            accentColor,
            coverPath,
          );
          return saveThumbnail(outputBase, metadata.id, composited, prompt);
        }
      }

      throw new Error("No image found in API response parts");
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`Attempt ${attempt} failed: ${lastError.message}`);
      if (attempt < MAX_RETRIES) {
        const delay = attempt * 2000;
        console.log(`Retrying in ${delay / 1000}s...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw new Error(
    `Thumbnail generation failed after ${MAX_RETRIES} attempts: ${lastError?.message}`,
  );
}
