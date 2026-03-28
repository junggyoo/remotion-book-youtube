/**
 * Fish Audio S2 TTS Engine
 *
 * Cloud-based TTS using Fish Audio API with voice cloning support.
 * Supports emotion tags via [bracket] syntax for S2 models.
 *
 * Required env vars:
 *   FISH_API_KEY          — Fish Audio API key
 *   FISH_VOICE_MODEL_ID   — Cloned voice model ID
 */

import { writeFile } from "fs/promises";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { encode } from "@msgpack/msgpack";
import type { Caption } from "@remotion/captions";
import { splitKoreanSentences } from "./subtitleGen";

// Fish Audio REST API base URL
const FISH_API_BASE = "https://api.fish.audio";

// --- Emotion tag mapping ---

const SCENE_EMOTION_MAP: Record<string, string> = {
  highlight: "[excited]",
  cover: "[confident]",
  keyInsight: "[enthusiastic]",
  chapterDivider: "[calm]",
  framework: "[confident]",
  compareContrast: "[curious]",
  quote: "[soft tone]",
  application: "[encouraging]",
  closing: "[warm]",
  data: "[confident]",
};

/**
 * Prepend an emotion tag based on scene type for Fish Audio S2 models.
 */
export function addEmotionTag(
  narrationText: string,
  sceneType: string,
  emotionOverride?: string,
): string {
  const tag = emotionOverride || SCENE_EMOTION_MAP[sceneType] || "";
  return tag ? `${tag} ${narrationText}` : narrationText;
}

// --- Config ---

export interface FishAudioConfig {
  apiKey: string;
  voiceModelId: string;
  model?: "s2-pro" | "s1"; // default: "s2-pro"
  format?: "mp3" | "wav" | "opus" | "pcm";
}

export function getFishAudioConfig(): FishAudioConfig | undefined {
  const apiKey = process.env.FISH_API_KEY;
  const voiceModelId = process.env.FISH_VOICE_MODEL_ID;
  if (!apiKey || !voiceModelId) return undefined;
  return { apiKey, voiceModelId };
}

export function isFishAudioAvailable(): boolean {
  return !!getFishAudioConfig();
}

// --- Audio duration utility ---

function getAudioDurationMs(filePath: string): number {
  try {
    const result = execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "csv=p=0",
        filePath,
      ],
      { encoding: "utf-8", timeout: 10000 },
    ).trim();
    const seconds = parseFloat(result);
    if (!isNaN(seconds)) return Math.round(seconds * 1000);
  } catch {
    // ffprobe not available
  }
  try {
    const stats = fs.statSync(filePath);
    return Math.round((stats.size / 2000) * 1000);
  } catch {
    return 0;
  }
}

// --- TTS Generation ---

/**
 * Generate speech audio via Fish Audio API.
 * Returns the audio duration in milliseconds.
 */
export async function generateFishAudio(
  text: string,
  outputPath: string,
  config: FishAudioConfig,
): Promise<number> {
  const model = config.model || "s2-pro";
  const format = config.format || "mp3";

  const body = encode({
    text,
    reference_id: config.voiceModelId,
    format,
    chunk_length: 200,
    normalize: true,
    latency: "normal",
  });

  const resp = await fetch(`${FISH_API_BASE}/v1/tts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/msgpack",
      model,
    },
    body,
  });

  if (!resp.ok) {
    const errBody = await resp.text();
    throw new Error(`Fish Audio API ${resp.status}: ${errBody}`);
  }

  const arrayBuf = await resp.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  await writeFile(outputPath, buffer);

  return getAudioDurationMs(outputPath);
}

// --- Caption generation (proportional character-based) ---

/**
 * Generate Caption[] from narration text + audio duration using
 * proportional character-based timing. This is the fallback when
 * no VTT/whisper timestamps are available (Fish Audio doesn't
 * provide word-level timing).
 *
 * Compatible with the existing @remotion/captions Caption format.
 */
export function generateCaptionsFromText(
  text: string,
  durationMs: number,
): Caption[] {
  if (!text || durationMs <= 0) return [];

  const sentences = splitKoreanSentences(text);
  if (sentences.length === 0) return [];

  const totalChars = sentences.reduce((sum, s) => sum + s.length, 0);
  if (totalChars === 0) return [];

  const captions: Caption[] = [];
  let currentMs = 0;

  for (const sentence of sentences) {
    const sentenceDuration = (sentence.length / totalChars) * durationMs;
    const words = sentence.split(/\s+/).filter(Boolean);

    if (words.length === 0) {
      currentMs += sentenceDuration;
      continue;
    }

    const wordChars = words.reduce((sum, w) => sum + w.length, 0);
    let wordMs = currentMs;

    for (const word of words) {
      const wordDuration = (word.length / wordChars) * sentenceDuration;
      // Add space prefix to match VTT caption format (except for very first word)
      const prefix = captions.length > 0 ? " " : "";
      captions.push({
        text: prefix + word,
        startMs: Math.round(wordMs),
        endMs: Math.round(wordMs + wordDuration),
        timestampMs: Math.round(wordMs),
        confidence: 1.0,
      });
      wordMs += wordDuration;
    }

    currentMs += sentenceDuration;
  }

  // Align last caption to exact duration
  if (captions.length > 0) {
    captions[captions.length - 1].endMs = durationMs;
  }

  return captions;
}
