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
  highlight: "[신나고 에너지 넘치는 목소리로]",
  cover: "[차분하고 자신감 있는 목소리로]",
  keyInsight: "[열정적이고 강조하는 톤으로]",
  chapterDivider: "[차분하고 안정된 톤으로]",
  framework: "[명확하고 설득력 있는 톤으로]",
  compareContrast: "[호기심 어린 톤으로]",
  quote: "[부드럽고 감성적인 톤으로]",
  application: "[격려하는 따뜻한 톤으로]",
  closing: "[따뜻하고 진심 어린 톤으로]",
  data: "[차분하고 명확한 톤으로]",
};

/**
 * Temperature by scene type.
 * Higher for emotional scenes (more expressive), lower for explanatory (more stable).
 */
export const SCENE_TEMPERATURE_MAP: Record<string, number> = {
  highlight: 0.85,
  cover: 0.6,
  keyInsight: 0.8,
  chapterDivider: 0.5,
  framework: 0.6,
  compareContrast: 0.75,
  quote: 0.8,
  application: 0.7,
  closing: 0.75,
  data: 0.55,
};

export function getTemperatureForScene(sceneType: string): number {
  return SCENE_TEMPERATURE_MAP[sceneType] ?? 0.7;
}

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
  temperature?: number; // 0.0~1.0, default 0.7
  speed?: number; // 0.5~2.0, default 1.0
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
    temperature: config.temperature ?? 0.7,
    prosody: {
      speed: config.speed ?? 1.0,
    },
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

// --- STT (Speech-to-Text) for accurate caption timestamps ---

/**
 * Transcribe audio via Fish Audio STT API (Beta).
 * Returns segment-level timestamps for caption generation.
 * language="ko" hint + ignore_timestamps=false for maximum accuracy.
 */
export async function transcribeWithFishSTT(
  audioPath: string,
  apiKey: string,
): Promise<
  | {
      text: string;
      duration: number;
      segments: Array<{ text: string; start: number; end: number }>;
    }
  | undefined
> {
  const audioBuffer = fs.readFileSync(audioPath);
  const formData = new FormData();
  formData.append("audio", new Blob([audioBuffer]), path.basename(audioPath));
  formData.append("language", "ko");
  formData.append("ignore_timestamps", "false");

  const resp = await fetch(`${FISH_API_BASE}/v1/asr`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!resp.ok) {
    console.warn(`[STT] Fish Audio ASR failed: ${resp.status}`);
    return undefined;
  }

  return (await resp.json()) as {
    text: string;
    duration: number;
    segments: Array<{ text: string; start: number; end: number }>;
  };
}

/**
 * Convert Fish Audio STT segments to @remotion/captions Caption[].
 * Each segment's text is split into words, and time is distributed
 * proportionally by character count within the segment boundaries.
 */
export function sttSegmentsToCaptions(
  segments: Array<{ text: string; start: number; end: number }>,
): Caption[] {
  const captions: Caption[] = [];

  for (const seg of segments) {
    const words = seg.text.split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;

    const segStartMs = seg.start * 1000;
    const segDuration = (seg.end - seg.start) * 1000;
    const totalChars = words.reduce((s, w) => s + w.length, 0);
    let wordMs = segStartMs;

    for (const word of words) {
      const wordDuration =
        totalChars > 0
          ? (word.length / totalChars) * segDuration
          : segDuration / words.length;
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
  }

  // Align last caption to final segment end
  if (captions.length > 0 && segments.length > 0) {
    const lastSegEnd = segments[segments.length - 1].end * 1000;
    captions[captions.length - 1].endMs = Math.round(lastSegEnd);
  }

  return captions;
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
