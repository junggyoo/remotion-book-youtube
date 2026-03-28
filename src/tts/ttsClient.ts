import { execFileSync, spawn, type ChildProcess } from "child_process";
import fs from "fs";
import path from "path";
import type {
  TTSResult,
  TTSResultWithCaptions,
  NarrationConfig,
} from "@/types";
import { vttToCaptions } from "./vttParser";
import {
  generateFishAudio,
  generateCaptionsFromText,
  addEmotionTag,
  getFishAudioConfig,
  getTemperatureForScene,
  transcribeWithFishSTT,
  sttSegmentsToCaptions,
  type FishAudioConfig,
} from "./fish-audio-engine";

const DEFAULT_FPS = 30;
const QWEN3_SERVER_URL = "http://127.0.0.1:9876";
const QWEN3_HEALTH_TIMEOUT_MS = 2000;
const QWEN3_SPAWN_TIMEOUT_MS = 90000;
const QWEN3_GENERATE_TIMEOUT_MS = 120000;

const REF_TEXT =
  "오늘 영상에서는 AI를 활용한 자동화 시스템에 대해 이야기해보려고 합니다. " +
  "혹시 이런 경험 있으신가요? 매번 반복되는 작업에 시간을 쏟고 있다면, " +
  "지금부터 알려드리는 방법이 분명 도움이 될 거예요. " +
  "핵심은 간단합니다. 복잡하게 생각할 필요 없어요. " +
  "하나씩, 차근차근 따라오시면 됩니다. 자, 그러면 바로 시작해볼까요?";

// --- Qwen3 server auto-management ---

let qwen3ServerProcess: ChildProcess | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isQwen3ServerReady(): Promise<boolean> {
  try {
    const resp = await fetch(`${QWEN3_SERVER_URL}/health`, {
      signal: AbortSignal.timeout(QWEN3_HEALTH_TIMEOUT_MS),
    });
    if (resp.ok) {
      const data = (await resp.json()) as { status: string };
      return data.status === "ready";
    }
    return false;
  } catch {
    return false;
  }
}

async function ensureQwen3Server(): Promise<void> {
  if (await isQwen3ServerReady()) return;

  console.log("[TTS] Qwen3 server not running, auto-spawning...");

  const projectRoot = path.resolve(__dirname, "../..");
  const refAudio = path.join(projectRoot, "assets/voice/myvoice.m4a");

  qwen3ServerProcess = spawn(
    "uv",
    [
      "run",
      "--with",
      "qwen-tts",
      "--with",
      "faster-whisper",
      path.join(projectRoot, "scripts/qwen3-tts-server.py"),
      "--ref-audio",
      refAudio,
      "--ref-text",
      REF_TEXT,
    ],
    {
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
      cwd: projectRoot,
    },
  );

  // Pipe server stderr to console for visibility
  qwen3ServerProcess.stderr?.on("data", (chunk: Buffer) => {
    process.stderr.write(`[qwen3-server] ${chunk.toString()}`);
  });

  qwen3ServerProcess.on("exit", (code) => {
    if (code !== null && code !== 0) {
      console.error(`[TTS] Qwen3 server exited with code ${code}`);
    }
    qwen3ServerProcess = null;
  });

  // Health poll until ready
  const deadline = Date.now() + QWEN3_SPAWN_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(2000);
    if (await isQwen3ServerReady()) {
      console.log("[TTS] Qwen3 server is ready");
      return;
    }
  }

  throw new Error(
    `[TTS] Qwen3 server failed to start within ${QWEN3_SPAWN_TIMEOUT_MS / 1000}s`,
  );
}

// --- Qwen3 TTS generation via HTTP ---

async function generateTTSViaQwen3(
  sceneId: string,
  text: string,
  outputDir: string,
): Promise<TTSResult | undefined> {
  const outputPath = path.join(outputDir, `${sceneId}.mp3`);

  await ensureQwen3Server();

  try {
    const resp = await fetch(`${QWEN3_SERVER_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        outputPath: path.resolve(outputPath),
        whisperVtt: false,
      }),
      signal: AbortSignal.timeout(QWEN3_GENERATE_TIMEOUT_MS),
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      console.error(`[TTS] Qwen3 server returned ${resp.status}: ${errBody}`);
      return undefined;
    }

    const result = (await resp.json()) as {
      audioPath: string;
      durationMs: number;
    };

    if (!fs.existsSync(result.audioPath)) {
      console.error(`[TTS] Qwen3 output file not found: ${result.audioPath}`);
      return undefined;
    }

    return {
      sceneId,
      audioFilePath: result.audioPath,
      durationFrames: Math.ceil((result.durationMs / 1000) * DEFAULT_FPS),
      durationMs: result.durationMs,
    };
  } catch (err) {
    console.error(`[TTS] Qwen3 generation failed for scene ${sceneId}:`, err);
    return undefined;
  }
}

async function generateTTSWithCaptionsViaQwen3(
  sceneId: string,
  text: string,
  outputDir: string,
): Promise<TTSResultWithCaptions | undefined> {
  const outputPath = path.join(outputDir, `${sceneId}.mp3`);
  const vttPath = path.join(outputDir, `${sceneId}.vtt`);

  await ensureQwen3Server();

  try {
    const resp = await fetch(`${QWEN3_SERVER_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        outputPath: path.resolve(outputPath),
        whisperVtt: true,
      }),
      signal: AbortSignal.timeout(QWEN3_GENERATE_TIMEOUT_MS),
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      console.error(`[TTS] Qwen3 server returned ${resp.status}: ${errBody}`);
      return undefined;
    }

    const result = (await resp.json()) as {
      audioPath: string;
      vttPath: string | null;
      durationMs: number;
    };

    if (!fs.existsSync(result.audioPath)) {
      console.error(`[TTS] Qwen3 output file not found: ${result.audioPath}`);
      return undefined;
    }

    const durationFrames = Math.ceil((result.durationMs / 1000) * DEFAULT_FPS);

    // Parse VTT if available
    let captions: import("@remotion/captions").Caption[] = [];
    const actualVttPath = result.vttPath ?? vttPath;
    try {
      if (result.vttPath && fs.existsSync(result.vttPath)) {
        const vttContent = fs.readFileSync(result.vttPath, "utf-8");
        captions = vttToCaptions(vttContent);
      }
    } catch (err) {
      console.error(`[TTS] Failed to parse VTT for scene ${sceneId}:`, err);
    }

    return {
      sceneId,
      audioFilePath: result.audioPath,
      durationFrames,
      durationMs: result.durationMs,
      captions,
      vttPath: actualVttPath,
    };
  } catch (err) {
    console.error(`[TTS] Qwen3 generation failed for scene ${sceneId}:`, err);
    return undefined;
  }
}

// --- Audio duration utility ---

/**
 * Attempt to get audio duration using ffprobe.
 * Falls back to a file-size-based estimate if ffprobe is unavailable.
 */
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
    if (!isNaN(seconds)) {
      return Math.round(seconds * 1000);
    }
  } catch {
    // ffprobe not available, fall through
  }

  // Fallback: estimate from file size (~16kbps MP3 = 2000 bytes/sec)
  try {
    const stats = fs.statSync(filePath);
    const estimatedSeconds = stats.size / 2000;
    return Math.round(estimatedSeconds * 1000);
  } catch {
    return 0;
  }
}

// --- edge-tts generation (original) ---

function generateTTSViaEdgeTTS(
  sceneId: string,
  text: string,
  config: NarrationConfig,
  outputDir: string,
): TTSResult | undefined {
  const fps = DEFAULT_FPS;
  const outputPath = path.join(outputDir, `${sceneId}.mp3`);

  try {
    const args: string[] = ["--voice", config.voice];

    if (config.speed && config.speed !== 1.0) {
      const pct = Math.round((config.speed - 1) * 100);
      args.push("--rate", `${pct > 0 ? "+" : ""}${pct}%`);
    }

    if (config.pitch && config.pitch !== "+0Hz") {
      args.push("--pitch", config.pitch);
    }

    args.push("--text", text);
    args.push("--write-media", outputPath);

    execFileSync("edge-tts", args, { encoding: "utf-8", timeout: 30000 });

    if (!fs.existsSync(outputPath)) {
      console.error(`[TTS] Output file not created for scene ${sceneId}`);
      return undefined;
    }

    const durationMs = getAudioDurationMs(outputPath);
    if (durationMs <= 0) {
      console.error(
        `[TTS] Could not determine audio duration for scene ${sceneId}`,
      );
      return undefined;
    }

    return {
      sceneId,
      audioFilePath: outputPath,
      durationFrames: Math.ceil((durationMs / 1000) * fps),
      durationMs,
    };
  } catch (err) {
    console.error(
      `[TTS] edge-tts failed to generate audio for scene ${sceneId}:`,
      err,
    );
    return undefined;
  }
}

function generateTTSWithCaptionsViaEdgeTTS(
  sceneId: string,
  text: string,
  config: NarrationConfig,
  outputDir: string,
): TTSResultWithCaptions | undefined {
  const fps = DEFAULT_FPS;
  const outputPath = path.join(outputDir, `${sceneId}.mp3`);
  const vttPath = path.join(outputDir, `${sceneId}.vtt`);

  try {
    const args: string[] = ["--voice", config.voice];

    if (config.speed && config.speed !== 1.0) {
      const pct = Math.round((config.speed - 1) * 100);
      args.push("--rate", `${pct > 0 ? "+" : ""}${pct}%`);
    }

    if (config.pitch && config.pitch !== "+0Hz") {
      args.push("--pitch", config.pitch);
    }

    args.push("--text", text);
    args.push("--write-media", outputPath);
    args.push("--write-subtitles", vttPath);

    execFileSync("edge-tts", args, { encoding: "utf-8", timeout: 30000 });

    if (!fs.existsSync(outputPath)) {
      console.error(`[TTS] Output file not created for scene ${sceneId}`);
      return undefined;
    }

    const durationMs = getAudioDurationMs(outputPath);
    if (durationMs <= 0) {
      console.error(
        `[TTS] Could not determine audio duration for scene ${sceneId}`,
      );
      return undefined;
    }

    const durationFrames = Math.ceil((durationMs / 1000) * fps);

    let captions: import("@remotion/captions").Caption[] = [];
    try {
      if (fs.existsSync(vttPath)) {
        const vttContent = fs.readFileSync(vttPath, "utf-8");
        captions = vttToCaptions(vttContent);
      }
    } catch (err) {
      console.error(`[TTS] Failed to parse VTT for scene ${sceneId}:`, err);
    }

    return {
      sceneId,
      audioFilePath: outputPath,
      durationFrames,
      durationMs,
      captions,
      vttPath,
    };
  } catch (err) {
    console.error(
      `[TTS] edge-tts failed to generate audio for scene ${sceneId}:`,
      err,
    );
    return undefined;
  }
}

// --- Fish Audio generation ---

async function generateTTSViaFishAudio(
  sceneId: string,
  text: string,
  outputDir: string,
  sceneType?: string,
  narrationSpeed?: number,
): Promise<TTSResult | undefined> {
  const fishConfig = getFishAudioConfig();
  if (!fishConfig) return undefined;

  const configWithParams: FishAudioConfig = {
    ...fishConfig,
    temperature: getTemperatureForScene(sceneType || ""),
    speed: narrationSpeed ?? 1.0,
  };
  const outputPath = path.join(outputDir, `${sceneId}.mp3`);
  const textWithEmotion = addEmotionTag(text, sceneType || "");

  try {
    const durationMs = await generateFishAudio(
      textWithEmotion,
      outputPath,
      configWithParams,
    );

    if (!fs.existsSync(outputPath) || durationMs <= 0) {
      console.error(`[TTS] Fish Audio output invalid for scene ${sceneId}`);
      return undefined;
    }

    return {
      sceneId,
      audioFilePath: outputPath,
      durationFrames: Math.ceil((durationMs / 1000) * DEFAULT_FPS),
      durationMs,
    };
  } catch (err) {
    console.error(`[TTS] Fish Audio failed for scene ${sceneId}:`, err);
    return undefined;
  }
}

async function generateTTSWithCaptionsViaFishAudio(
  sceneId: string,
  text: string,
  outputDir: string,
  sceneType?: string,
  narrationSpeed?: number,
): Promise<TTSResultWithCaptions | undefined> {
  const fishConfig = getFishAudioConfig();
  if (!fishConfig) return undefined;

  const configWithParams: FishAudioConfig = {
    ...fishConfig,
    temperature: getTemperatureForScene(sceneType || ""),
    speed: narrationSpeed ?? 1.0,
  };
  const outputPath = path.join(outputDir, `${sceneId}.mp3`);
  const textWithEmotion = addEmotionTag(text, sceneType || "");

  try {
    const durationMs = await generateFishAudio(
      textWithEmotion,
      outputPath,
      configWithParams,
    );

    if (!fs.existsSync(outputPath) || durationMs <= 0) {
      console.error(`[TTS] Fish Audio output invalid for scene ${sceneId}`);
      return undefined;
    }

    const durationFrames = Math.ceil((durationMs / 1000) * DEFAULT_FPS);

    // STT for accurate captions, proportional fallback on failure
    let captions: import("@remotion/captions").Caption[];
    const sttResult = await transcribeWithFishSTT(
      outputPath,
      fishConfig.apiKey,
    );
    if (sttResult?.segments?.length) {
      captions = sttSegmentsToCaptions(sttResult.segments);
    } else {
      captions = generateCaptionsFromText(text, durationMs);
    }

    return {
      sceneId,
      audioFilePath: outputPath,
      durationFrames,
      durationMs,
      captions,
      vttPath: undefined as any,
    };
  } catch (err) {
    console.error(`[TTS] Fish Audio failed for scene ${sceneId}:`, err);
    return undefined;
  }
}

// --- Public API ---

/**
 * Resolve TTS engine from config + environment.
 * Priority: TTS_ENGINE env > config.ttsEngine > auto-detect.
 */
function resolveEngine(
  config: NarrationConfig,
): "fish-audio" | "qwen3-tts" | "edge-tts" {
  const envEngine = process.env.TTS_ENGINE;
  if (
    envEngine === "fish-audio" ||
    envEngine === "qwen3-tts" ||
    envEngine === "edge-tts"
  ) {
    return envEngine;
  }
  if (config.ttsEngine === "fish-audio") return "fish-audio";
  if (config.ttsEngine === "qwen3-tts") return "qwen3-tts";
  return "edge-tts";
}

/**
 * Generate TTS audio for a scene.
 * Fallback chain: fish-audio -> qwen3-tts -> edge-tts (based on engine selection).
 */
export async function generateTTS(
  sceneId: string,
  text: string,
  config: NarrationConfig,
  outputDir: string,
  sceneType?: string,
): Promise<TTSResult | undefined> {
  if (!text || text.trim().length === 0) {
    return undefined;
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const engine = resolveEngine(config);

  if (engine === "fish-audio") {
    const result = await generateTTSViaFishAudio(
      sceneId,
      text,
      outputDir,
      sceneType,
      config.speed,
    );
    if (result) return result;
    console.warn(
      `[TTS] Fish Audio failed for scene ${sceneId}, falling back to edge-tts`,
    );
    return generateTTSViaEdgeTTS(sceneId, text, config, outputDir);
  }

  if (engine === "qwen3-tts") {
    const result = await generateTTSViaQwen3(sceneId, text, outputDir);
    if (result) return result;
    console.warn(
      `[TTS] Qwen3 failed for scene ${sceneId}, falling back to edge-tts`,
    );
    return generateTTSViaEdgeTTS(sceneId, text, config, outputDir);
  }

  return generateTTSViaEdgeTTS(sceneId, text, config, outputDir);
}

/**
 * Generate TTS audio WITH caption data for DSGS pipeline.
 * Fallback chain: fish-audio -> qwen3-tts -> edge-tts (based on engine selection).
 */
export async function generateTTSWithCaptions(
  sceneId: string,
  text: string,
  config: NarrationConfig,
  outputDir: string,
  sceneType?: string,
): Promise<TTSResultWithCaptions | undefined> {
  if (!text || text.trim().length === 0) {
    return undefined;
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const engine = resolveEngine(config);

  if (engine === "fish-audio") {
    const result = await generateTTSWithCaptionsViaFishAudio(
      sceneId,
      text,
      outputDir,
      sceneType,
      config.speed,
    );
    if (result) return result;
    console.warn(
      `[TTS] Fish Audio failed for scene ${sceneId}, falling back to edge-tts`,
    );
    return generateTTSWithCaptionsViaEdgeTTS(sceneId, text, config, outputDir);
  }

  if (engine === "qwen3-tts") {
    const result = await generateTTSWithCaptionsViaQwen3(
      sceneId,
      text,
      outputDir,
    );
    if (result) return result;
    console.warn(
      `[TTS] Qwen3 failed for scene ${sceneId}, falling back to edge-tts`,
    );
    return generateTTSWithCaptionsViaEdgeTTS(sceneId, text, config, outputDir);
  }

  return generateTTSWithCaptionsViaEdgeTTS(sceneId, text, config, outputDir);
}
