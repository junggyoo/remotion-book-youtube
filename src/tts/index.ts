// TTS pipeline — barrel export
export { generateTTS, generateTTSWithCaptions } from "./ttsClient";
export {
  resolveBeatNarration,
  resolveBeatNarrationWithEmotions,
} from "./beatNarrationResolver";
export {
  generateSubtitles,
  generateSentenceSubtitles,
  splitToLines,
  splitKoreanSentences,
  splitLongSentence,
  MAX_CHARS_PER_LINE,
  MAX_LINES,
  LEAD_FRAMES,
  TRAIL_FRAMES,
} from "./subtitleGen";
export { syncDuration, framesToMs, msToFrames } from "./durationSync";
export { vttToCaptions, parseVttTimestamp } from "./vttParser";
export { executeMediaPlan } from "./mediaPlanExecutor";
export type { MediaPlanResult } from "./mediaPlanExecutor";
export {
  generateFishAudio,
  generateCaptionsFromText,
  addEmotionTag,
  isFishAudioAvailable,
  getFishAudioConfig,
  SCENE_TEMPERATURE_MAP,
  getTemperatureForScene,
  transcribeWithFishSTT,
  sttSegmentsToCaptions,
} from "./fish-audio-engine";
export type { FishAudioConfig } from "./fish-audio-engine";
