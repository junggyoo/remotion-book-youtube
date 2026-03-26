/**
 * C.0: Remotion renderStill infrastructure for visual QA.
 *
 * Uses @remotion/bundler + @remotion/renderer (both available in devDependencies)
 * to capture still frames from compositions.
 *
 * Bundle is cached between calls for performance.
 */

import path from "path";
import fs from "fs";

// ---------------------------------------------------------------------------
// Dependency check
// ---------------------------------------------------------------------------

let bundlerAvailable = false;
let rendererAvailable = false;

try {
  require.resolve("@remotion/bundler");
  bundlerAvailable = true;
} catch {
  /* not installed */
}

try {
  require.resolve("@remotion/renderer");
  rendererAvailable = true;
} catch {
  /* not installed */
}

export function checkDependencies(): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!bundlerAvailable) missing.push("@remotion/bundler");
  if (!rendererAvailable) missing.push("@remotion/renderer");
  return { ok: missing.length === 0, missing };
}

// ---------------------------------------------------------------------------
// Bundle cache
// ---------------------------------------------------------------------------

let cachedBundlePath: string | null = null;

/**
 * Create (or return cached) webpack bundle for the Remotion project.
 */
export async function getBundle(): Promise<string> {
  if (cachedBundlePath && fs.existsSync(cachedBundlePath)) {
    return cachedBundlePath;
  }

  const deps = checkDependencies();
  if (!deps.ok) {
    throw new Error(
      `Missing dependencies for renderStill: ${deps.missing.join(", ")}.\n` +
        `Install with: npm install --save-dev ${deps.missing.join(" ")}`,
    );
  }

  // Dynamic import so the module loads even when dependencies are absent
  const { bundle } = await import("@remotion/bundler");

  const entryPoint = path.resolve(process.cwd(), "src", "index.ts");

  if (!fs.existsSync(entryPoint)) {
    throw new Error(`Remotion entry point not found: ${entryPoint}`);
  }

  console.log("[render-still-setup] Bundling Remotion project...");
  cachedBundlePath = await bundle(entryPoint);
  console.log("[render-still-setup] Bundle ready:", cachedBundlePath);

  return cachedBundlePath;
}

// ---------------------------------------------------------------------------
// renderStillForScene
// ---------------------------------------------------------------------------

export interface RenderStillOptions {
  bookId: string;
  sceneId: string;
  /** 0~1 ratio within the scene's duration */
  frameRatio: number;
  outputPath: string;
  /** Composition ID to use. Defaults to `${bookId}-longform` */
  compositionId?: string;
}

/**
 * Render a single still frame for a specific scene at a given time ratio.
 *
 * Requires @remotion/bundler and @remotion/renderer to be installed.
 */
export async function renderStillForScene(
  options: RenderStillOptions,
): Promise<string> {
  const deps = checkDependencies();
  if (!deps.ok) {
    throw new Error(
      `Missing dependencies: ${deps.missing.join(", ")}.\n` +
        `Install with: npm install --save-dev ${deps.missing.join(" ")}`,
    );
  }

  const { selectComposition, renderStill } = await import("@remotion/renderer");

  const bundlePath = await getBundle();
  const compositionId = options.compositionId ?? `${options.bookId}-longform`;

  // Load book content to compute the frame offset for the target scene
  const bookPath = path.resolve(
    process.cwd(),
    "content",
    "books",
    `${options.bookId}.json`,
  );

  if (!fs.existsSync(bookPath)) {
    throw new Error(`Book content not found: ${bookPath}`);
  }

  const bookContent = JSON.parse(fs.readFileSync(bookPath, "utf-8"));
  const scenes = bookContent.scenes as Array<{
    id: string;
    durationFrames?: number;
    from?: number;
  }>;

  // Find the scene and compute the absolute frame
  let sceneFrom = 0;
  let sceneDuration = 0;
  let found = false;

  for (const scene of scenes) {
    const dur = scene.durationFrames ?? 150; // fallback default
    if (scene.id === options.sceneId) {
      sceneFrom = scene.from ?? sceneFrom;
      sceneDuration = dur;
      found = true;
      break;
    }
    sceneFrom += dur;
  }

  if (!found) {
    throw new Error(
      `Scene "${options.sceneId}" not found in book "${options.bookId}"`,
    );
  }

  const absoluteFrame =
    sceneFrom + Math.round(sceneDuration * options.frameRatio);

  // Select composition
  const composition = await selectComposition({
    serveUrl: bundlePath,
    id: compositionId,
  });

  // Ensure output directory exists
  const outputDir = path.dirname(options.outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  await renderStill({
    composition,
    serveUrl: bundlePath,
    output: options.outputPath,
    frame: absoluteFrame,
  });

  return options.outputPath;
}
