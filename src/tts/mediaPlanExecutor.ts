import type {
  SceneBlueprint,
  TTSResult,
  SubtitleEntry,
  NarrationConfig,
} from "@/types";
import { generateTTSWithCaptions } from "./ttsClient";
import { generateSentenceSubtitles, generateSubtitles } from "./subtitleGen";

const DEFAULT_FPS = 30;
const DURATION_PADDING_FRAMES = 15;

/**
 * Result of executing a MediaPlan for a scene blueprint.
 */
export interface MediaPlanResult {
  ttsResult?: TTSResult;
  subtitles: SubtitleEntry[];
  durationFrames: number;
  audioPath?: string;
}

/**
 * Execute the mediaPlan of a SceneBlueprint: TTS → subtitles → duration sync.
 *
 * Fallback chain:
 * - TTS success → sentence-level subtitles from VTT timing
 * - TTS failure → single-entry subtitle with estimated timing from blueprint.durationFrames
 */
export async function executeMediaPlan(
  blueprint: SceneBlueprint,
  outputDir: string,
  fps: number = DEFAULT_FPS,
): Promise<MediaPlanResult> {
  const { mediaPlan } = blueprint;
  const { narrationText, audioPlan } = mediaPlan;

  // Derive sceneType from blueprint for emotion tags
  const sceneType =
    (blueprint as any).fallbackPreset || (blueprint as any).sceneType || "";

  // Build NarrationConfig from audioPlan
  const config: NarrationConfig = {
    voice: audioPlan.voiceKey,
    ttsEngine: audioPlan.ttsEngine as NarrationConfig["ttsEngine"],
    speed: audioPlan.speed,
    pitch: audioPlan.pitch,
  };

  // Attempt TTS generation with captions
  const ttsResult = await generateTTSWithCaptions(
    blueprint.id,
    narrationText,
    config,
    outputDir,
    sceneType,
  );

  if (ttsResult) {
    // Success path: sentence-level subtitles from VTT timing
    const subtitles = generateSentenceSubtitles(
      narrationText,
      ttsResult.captions,
      blueprint.from,
      fps,
    );

    // Duration: TTS duration + padding (matches syncDuration logic)
    const durationFrames = ttsResult.durationFrames + DURATION_PADDING_FRAMES;

    return {
      ttsResult,
      subtitles,
      durationFrames,
      audioPath: ttsResult.audioFilePath,
    };
  }

  // Fallback: no TTS — use estimated timing from blueprint duration
  const fallbackSubtitle = generateSubtitles(
    blueprint.id,
    narrationText,
    blueprint.from,
    blueprint.durationFrames,
  );

  return {
    subtitles: [fallbackSubtitle],
    durationFrames: blueprint.durationFrames,
  };
}
