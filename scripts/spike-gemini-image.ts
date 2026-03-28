/**
 * Spike: Gemini Image Generation with Reference Photos
 * Purpose: Confirm model string, multimodal input, image output extraction
 * Temporary file — delete after spike findings recorded.
 *
 * ============================================================
 * SPIKE FINDINGS (2026-03-28)
 * ============================================================
 *
 * SDK: @google/genai (NOT @google/generative-ai)
 *   import { GoogleGenAI } from "@google/genai";
 *   const ai = new GoogleGenAI({ apiKey });
 *
 * MODELS (image generation capable, confirmed via ListModels):
 *   - "gemini-2.5-flash-image"          (recommended — flash tier)
 *   - "gemini-3.1-flash-image-preview"  (preview)
 *   - "gemini-3-pro-image-preview"      (pro tier, preview)
 *   Non-image models like "gemini-2.0-flash" reject responseModalities: ["IMAGE"]
 *
 * REQUEST FORMAT:
 *   const response = await ai.models.generateContent({
 *     model: "gemini-2.5-flash-image",
 *     contents: [
 *       { text: "prompt text" },
 *       { inlineData: { mimeType: "image/png", data: base64String } },
 *       // ... more images
 *     ],
 *     config: {
 *       responseModalities: ["TEXT", "IMAGE"],  // required for image output
 *       imageConfig: {
 *         aspectRatio: "16:9",  // optional: "1:1", "16:9", "9:16", "4:3", "3:4"
 *         imageSize: "2K",      // optional: "512", "1K", "2K", "4K"
 *       },
 *     },
 *   });
 *
 * RESPONSE FORMAT:
 *   response.candidates[0].content.parts[] contains:
 *   - { text: "..." } for text parts
 *   - { inlineData: { mimeType: "image/png", data: "base64..." } } for images
 *
 * IMAGE EXTRACTION:
 *   for (const part of response.candidates[0].content.parts) {
 *     if (part.inlineData) {
 *       const buffer = Buffer.from(part.inlineData.data, "base64");
 *       fs.writeFileSync("output.png", buffer);
 *     }
 *   }
 *
 * MULTI-IMAGE INPUT: Yes — multiple { inlineData } objects in contents[]
 * MULTI-IMAGE OUTPUT: Possible — iterate parts[] for multiple inlineData
 *
 * BLOCKER: Free tier has quota=0 for image generation models.
 *   Requires paid Google AI API key (billing enabled).
 *   Error: 429 RESOURCE_EXHAUSTED with limit: 0
 *
 * ALSO AVAILABLE (non-multimodal, generate-only):
 *   - "imagen-4.0-generate-001"       (predict method, not generateContent)
 *   - "imagen-4.0-ultra-generate-001"
 *   - "imagen-4.0-fast-generate-001"
 *   These use a different API method (predict) and cannot take reference images.
 * ============================================================
 */

import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const FACE_DIR = path.resolve(__dirname, "../assets/face");
const OUTPUT_DIR = path.resolve(__dirname, "../output");

async function loadFaceImages(): Promise<
  Array<{ inlineData: { mimeType: string; data: string } }>
> {
  const files = ["face1.png", "face2.png", "face3.png"];
  return files.map((f) => {
    const filePath = path.join(FACE_DIR, f);
    const data = fs.readFileSync(filePath).toString("base64");
    return {
      inlineData: {
        mimeType: "image/png",
        data,
      },
    };
  });
}

async function main() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    console.error("GOOGLE_AI_API_KEY not set in .env");
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });

  // Load face reference images
  const faceImages = await loadFaceImages();
  console.log(`Loaded ${faceImages.length} face images`);
  console.log(
    `Image sizes: ${faceImages.map((img) => `${(img.inlineData.data.length / 1024).toFixed(0)}KB`).join(", ")}`,
  );

  // Models to try in order of preference
  const modelsToTry = [
    "gemini-2.5-flash-image",
    "gemini-3.1-flash-image-preview",
    "gemini-3-pro-image-preview",
  ];

  for (const modelName of modelsToTry) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Trying model: ${modelName}`);
    console.log("=".repeat(60));

    try {
      const prompt = `You are a YouTube thumbnail designer. Using these 3 reference photos of the same person, generate a YouTube thumbnail image.

The person should:
- Be looking at the camera with a surprised/excited expression
- Be positioned on the left side of the frame
- Have dramatic lighting

The background should:
- Be a dark gradient
- Have some bokeh light effects

Style: Professional YouTube thumbnail, high contrast, vibrant colors.
Output: Generate ONE high-quality thumbnail image (16:9 aspect ratio).`;

      const contents = [{ text: prompt }, ...faceImages];

      console.log("Sending request...");
      const startTime = Date.now();

      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: {
            aspectRatio: "16:9",
          },
        },
      });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`Response received in ${elapsed}s`);

      // Log raw response structure for analysis
      console.log("\n--- Response structure ---");
      console.log("candidates count:", response.candidates?.length ?? 0);

      if (!response.candidates || response.candidates.length === 0) {
        console.log("No candidates in response");
        console.log("Raw response keys:", Object.keys(response));
        continue;
      }

      const parts = response.candidates[0].content?.parts ?? [];
      console.log("parts count:", parts.length);

      let imageCount = 0;
      let textContent = "";

      for (const part of parts) {
        if (part.text) {
          textContent += part.text;
          console.log(`  TEXT part: "${part.text.substring(0, 100)}..."`);
        }
        if (part.inlineData) {
          imageCount++;
          console.log(
            `  IMAGE part: mimeType=${part.inlineData.mimeType}, size=${(part.inlineData.data!.length / 1024).toFixed(0)}KB`,
          );

          // Save the image
          if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
          }
          const ext = part.inlineData.mimeType?.includes("png") ? "png" : "jpg";
          const outputPath = path.join(OUTPUT_DIR, `spike-thumbnail.${ext}`);
          const buffer = Buffer.from(part.inlineData.data!, "base64");
          fs.writeFileSync(outputPath, buffer);
          console.log(`  Saved to: ${outputPath} (${buffer.length} bytes)`);
        }
      }

      console.log("\n--- Summary ---");
      console.log(`Model: ${modelName}`);
      console.log(`Images generated: ${imageCount}`);
      console.log(`Text included: ${textContent.length > 0}`);
      console.log(`Time: ${elapsed}s`);

      if (imageCount > 0) {
        console.log("\n*** SUCCESS — found working model ***");
        console.log(`Working model: ${modelName}`);
        break; // Stop trying other models
      }
    } catch (err: any) {
      const msg = err.message || String(err);
      if (msg.includes("429") || msg.includes("quota")) {
        console.error(
          `QUOTA ERROR with ${modelName}: Free tier limit=0 for image models. Requires paid API key.`,
        );
      } else if (msg.includes("not found") || msg.includes("not supported")) {
        console.error(`Model ${modelName} not available.`);
      } else {
        console.error(`Error with ${modelName}:`, msg.substring(0, 300));
      }
      continue;
    }
  }
}

main().catch(console.error);
