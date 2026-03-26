/**
 * C.2: Structural QA — analyze blueprint/scene metadata for layout and content issues.
 *
 * Validates scenes against structural rules without requiring rendered images.
 * Works on the content JSON directly.
 *
 * Usage:
 *   npx ts-node scripts/visual-qa/structural-qa.ts content/books/atomic-habits.json
 *   npx ts-node scripts/visual-qa/structural-qa.ts content/books/atomic-habits.json --output report.json
 */

import fs from "fs";
import path from "path";

import "tsconfig-paths/register";

import type {
  BookContent,
  TypedScene,
  Beat,
  FrameworkContent,
  ApplicationContent,
  TimelineContent,
  ListRevealContent,
  DataContent,
} from "../../src/types/index";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IssueSeverity = "pass" | "warn" | "fail";

export interface QAIssue {
  ruleId: string;
  severity: IssueSeverity;
  sceneId: string;
  message: string;
  detail?: string;
}

export interface SceneQAResult {
  sceneId: string;
  sceneType: string;
  severity: IssueSeverity;
  issues: QAIssue[];
}

export interface VisualQAReport {
  bookId: string;
  timestamp: string;
  summary: {
    totalScenes: number;
    pass: number;
    warn: number;
    fail: number;
  };
  scenes: SceneQAResult[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Characters per second for Korean TTS (edge-tts ko-KR-SunHiNeural speed=1) */
const DEFAULT_CPS = 5.7;
const FPS = 30;

/** Max headline length per CLAUDE.md */
const MAX_HEADLINE_CHARS = 60;

/** Min beat duration ratio per Beat spec */
const MIN_BEAT_DURATION_RATIO = 0.12;

/** Max elements per scene for longform */
const MAX_ELEMENTS_LONGFORM = 8;

/** Max framework items */
const MAX_FRAMEWORK_ITEMS = 5;

/** Max application steps */
const MAX_APPLICATION_STEPS = 4;

/** Max timeline events */
const MAX_TIMELINE_EVENTS = 6;

/** Max listReveal items */
const MAX_LIST_REVEAL_ITEMS = 7;

/** Chars-per-second thresholds for text density */
const CPS_WARN_THRESHOLD = 7.0;
const CPS_FAIL_THRESHOLD = 9.0;

// ---------------------------------------------------------------------------
// Rule implementations
// ---------------------------------------------------------------------------

function ruleTextDensity(scene: TypedScene, fps: number): QAIssue[] {
  const issues: QAIssue[] = [];
  const narration = scene.narrationText;
  if (!narration) return issues;

  const durationFrames = scene.durationFrames;
  if (!durationFrames || durationFrames <= 0) {
    // Without duration, we can estimate from narration length
    // but can't calculate CPS — skip with info
    return issues;
  }

  const durationSec = durationFrames / fps;
  const cps = narration.length / durationSec;

  if (cps > CPS_FAIL_THRESHOLD) {
    issues.push({
      ruleId: "text-density",
      severity: "fail",
      sceneId: scene.id,
      message: `Text density too high: ${cps.toFixed(1)} chars/sec (max ${CPS_FAIL_THRESHOLD})`,
      detail: `narration=${narration.length} chars, duration=${durationSec.toFixed(1)}s`,
    });
  } else if (cps > CPS_WARN_THRESHOLD) {
    issues.push({
      ruleId: "text-density",
      severity: "warn",
      sceneId: scene.id,
      message: `Text density elevated: ${cps.toFixed(1)} chars/sec (warn at ${CPS_WARN_THRESHOLD})`,
      detail: `narration=${narration.length} chars, duration=${durationSec.toFixed(1)}s`,
    });
  }

  return issues;
}

function ruleHeadlineLength(scene: TypedScene): QAIssue[] {
  const issues: QAIssue[] = [];

  // Extract headline from content based on scene type
  let headline: string | undefined;

  if (scene.type === "keyInsight") {
    headline = scene.content.headline;
  } else if (scene.type === "framework") {
    headline = scene.content.frameworkLabel;
  } else if (scene.type === "application") {
    headline = scene.content.anchorStatement;
  } else if (scene.type === "highlight") {
    headline = scene.content.mainText;
  } else if (scene.type === "timeline") {
    headline = scene.content.timelineLabel;
  } else if (scene.type === "listReveal") {
    headline = scene.content.listLabel;
  }

  if (headline && headline.length > MAX_HEADLINE_CHARS) {
    issues.push({
      ruleId: "headline-length",
      severity: "fail",
      sceneId: scene.id,
      message: `Headline exceeds ${MAX_HEADLINE_CHARS} chars: ${headline.length} chars`,
      detail: `"${headline.substring(0, 80)}${headline.length > 80 ? "..." : ""}"`,
    });
  }

  return issues;
}

function ruleBeatCoverage(scene: TypedScene): QAIssue[] {
  const issues: QAIssue[] = [];
  const beats = scene.beats;
  if (!beats || beats.length === 0) return issues;

  // Check minimum duration for each beat
  for (const beat of beats) {
    const duration = beat.endRatio - beat.startRatio;
    if (duration < MIN_BEAT_DURATION_RATIO) {
      issues.push({
        ruleId: "beat-coverage",
        severity: "warn",
        sceneId: scene.id,
        message: `Beat "${beat.id}" too short: ${(duration * 100).toFixed(1)}% (min ${MIN_BEAT_DURATION_RATIO * 100}%)`,
      });
    }
  }

  // Check for overlapping beats
  const sorted = [...beats].sort((a, b) => a.startRatio - b.startRatio);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startRatio < sorted[i - 1].endRatio) {
      issues.push({
        ruleId: "beat-coverage",
        severity: "fail",
        sceneId: scene.id,
        message: `Beats overlap: "${sorted[i - 1].id}" ends at ${sorted[i - 1].endRatio}, "${sorted[i].id}" starts at ${sorted[i].startRatio}`,
      });
    }
  }

  // Check coverage gaps (large gaps are warnings)
  const firstStart = sorted[0].startRatio;
  const lastEnd = sorted[sorted.length - 1].endRatio;

  if (firstStart > 0.15) {
    issues.push({
      ruleId: "beat-coverage",
      severity: "warn",
      sceneId: scene.id,
      message: `No beat covers the first ${(firstStart * 100).toFixed(0)}% of scene duration`,
    });
  }

  if (lastEnd < 0.85) {
    issues.push({
      ruleId: "beat-coverage",
      severity: "warn",
      sceneId: scene.id,
      message: `No beat covers the last ${((1 - lastEnd) * 100).toFixed(0)}% of scene duration`,
    });
  }

  return issues;
}

function ruleElementCount(scene: TypedScene): QAIssue[] {
  const issues: QAIssue[] = [];
  let elementCount = 0;
  let maxElements = MAX_ELEMENTS_LONGFORM;

  switch (scene.type) {
    case "framework": {
      const content = scene.content as FrameworkContent;
      elementCount = content.items.length;
      maxElements = MAX_FRAMEWORK_ITEMS;
      if (elementCount > maxElements) {
        issues.push({
          ruleId: "element-count",
          severity: "fail",
          sceneId: scene.id,
          message: `Framework has ${elementCount} items (max ${maxElements})`,
        });
      }
      if (elementCount === 0) {
        issues.push({
          ruleId: "element-count",
          severity: "fail",
          sceneId: scene.id,
          message: "Framework has 0 items",
        });
      }
      break;
    }
    case "application": {
      const content = scene.content as ApplicationContent;
      elementCount = content.steps.length;
      maxElements = MAX_APPLICATION_STEPS;
      if (elementCount > maxElements) {
        issues.push({
          ruleId: "element-count",
          severity: "fail",
          sceneId: scene.id,
          message: `Application has ${elementCount} steps (max ${maxElements})`,
        });
      }
      if (elementCount === 0) {
        issues.push({
          ruleId: "element-count",
          severity: "fail",
          sceneId: scene.id,
          message: "Application has 0 steps",
        });
      }
      break;
    }
    case "timeline": {
      const content = scene.content as TimelineContent;
      elementCount = content.events.length;
      maxElements = MAX_TIMELINE_EVENTS;
      if (elementCount > maxElements) {
        issues.push({
          ruleId: "element-count",
          severity: "warn",
          sceneId: scene.id,
          message: `Timeline has ${elementCount} events (max ${maxElements})`,
        });
      }
      break;
    }
    case "listReveal": {
      const content = scene.content as ListRevealContent;
      elementCount = content.items.length;
      maxElements = MAX_LIST_REVEAL_ITEMS;
      if (elementCount > maxElements) {
        issues.push({
          ruleId: "element-count",
          severity: "warn",
          sceneId: scene.id,
          message: `ListReveal has ${elementCount} items (max ${maxElements})`,
        });
      }
      break;
    }
    case "data": {
      const content = scene.content as DataContent;
      elementCount = content.data.length;
      if (elementCount > 10) {
        issues.push({
          ruleId: "element-count",
          severity: "warn",
          sceneId: scene.id,
          message: `Data scene has ${elementCount} data points (may cause visual clutter)`,
        });
      }
      break;
    }
    default:
      break;
  }

  return issues;
}

function ruleSafeAreaMetadata(scene: TypedScene): QAIssue[] {
  const issues: QAIssue[] = [];

  // Check narration text line length for subtitle overflow
  if (scene.narrationText) {
    const MAX_CHARS_PER_LINE = 28;
    // Split by natural sentence boundaries to estimate subtitle lines
    const sentences = scene.narrationText
      .split(/[.!?。！？]/)
      .filter((s) => s.trim().length > 0);

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length > MAX_CHARS_PER_LINE * 2) {
        issues.push({
          ruleId: "safe-area",
          severity: "warn",
          sceneId: scene.id,
          message: `Subtitle segment may overflow: ${trimmed.length} chars (max ${MAX_CHARS_PER_LINE * 2} for 2 lines)`,
          detail: `"${trimmed.substring(0, 60)}..."`,
        });
        break; // One warning per scene is enough
      }
    }
  }

  // Check for scenes with both many elements and long narration (visual crowding)
  const hasLongNarration = (scene.narrationText?.length ?? 0) > 200;
  const hasManyBeats = (scene.beats?.length ?? 0) > 4;

  if (hasLongNarration && hasManyBeats) {
    issues.push({
      ruleId: "safe-area",
      severity: "warn",
      sceneId: scene.id,
      message: `Scene has long narration (${scene.narrationText?.length} chars) and many beats (${scene.beats?.length}) — risk of visual crowding`,
    });
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

function worstSeverity(issues: QAIssue[]): IssueSeverity {
  if (issues.some((i) => i.severity === "fail")) return "fail";
  if (issues.some((i) => i.severity === "warn")) return "warn";
  return "pass";
}

export function runStructuralQA(bookContent: BookContent): VisualQAReport {
  const fps = bookContent.production?.fps ?? FPS;
  const sceneResults: SceneQAResult[] = [];

  for (const scene of bookContent.scenes) {
    const issues: QAIssue[] = [
      ...ruleTextDensity(scene, fps),
      ...ruleHeadlineLength(scene),
      ...ruleBeatCoverage(scene),
      ...ruleElementCount(scene),
      ...ruleSafeAreaMetadata(scene),
    ];

    sceneResults.push({
      sceneId: scene.id,
      sceneType: scene.type,
      severity: worstSeverity(issues),
      issues,
    });
  }

  const summary = {
    totalScenes: sceneResults.length,
    pass: sceneResults.filter((s) => s.severity === "pass").length,
    warn: sceneResults.filter((s) => s.severity === "warn").length,
    fail: sceneResults.filter((s) => s.severity === "fail").length,
  };

  return {
    bookId: bookContent.metadata.id,
    timestamp: new Date().toISOString(),
    summary,
    scenes: sceneResults,
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function main(): void {
  const bookPath = process.argv[2];
  if (!bookPath) {
    console.error(
      "Usage: npx ts-node scripts/visual-qa/structural-qa.ts <book.json> [--output report.json]",
    );
    process.exit(1);
  }

  const absPath = path.resolve(process.cwd(), bookPath);
  if (!fs.existsSync(absPath)) {
    console.error(`File not found: ${absPath}`);
    process.exit(1);
  }

  // Parse --output flag
  let outputPath: string | null = null;
  const outputIdx = process.argv.indexOf("--output");
  if (outputIdx !== -1 && process.argv[outputIdx + 1]) {
    outputPath = path.resolve(process.cwd(), process.argv[outputIdx + 1]);
  }

  const bookContent: BookContent = JSON.parse(
    fs.readFileSync(absPath, "utf-8"),
  );

  console.log(
    `\n=== Structural QA: ${bookContent.metadata.title} (${bookContent.metadata.id}) ===\n`,
  );

  const report = runStructuralQA(bookContent);

  // Print summary
  console.log(
    `Scenes: ${report.summary.totalScenes} | Pass: ${report.summary.pass} | Warn: ${report.summary.warn} | Fail: ${report.summary.fail}\n`,
  );

  // Print per-scene details
  for (const sceneResult of report.scenes) {
    if (sceneResult.issues.length === 0) {
      console.log(`  [PASS] ${sceneResult.sceneId} (${sceneResult.sceneType})`);
      continue;
    }

    const icon = sceneResult.severity === "fail" ? "[FAIL]" : "[WARN]";
    console.log(`  ${icon} ${sceneResult.sceneId} (${sceneResult.sceneType})`);

    for (const issue of sceneResult.issues) {
      const prefix = issue.severity === "fail" ? "    x" : "    !";
      console.log(`${prefix} [${issue.ruleId}] ${issue.message}`);
      if (issue.detail) {
        console.log(`      ${issue.detail}`);
      }
    }
  }

  // Write report
  const defaultOutputPath = path.resolve(
    process.cwd(),
    "generated",
    "books",
    bookContent.metadata.id,
    ".visual-qa",
    "visual-qa-report.json",
  );

  const finalOutputPath = outputPath ?? defaultOutputPath;
  const outputDir = path.dirname(finalOutputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(finalOutputPath, JSON.stringify(report, null, 2));
  console.log(`\nReport written to: ${finalOutputPath}`);

  // Exit with error code if any failures
  if (report.summary.fail > 0) {
    process.exit(1);
  }
}

main();
