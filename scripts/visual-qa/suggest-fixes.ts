/**
 * C.3: Fix suggestion generator for visual QA issues.
 *
 * Reads a visual-qa-report.json and produces actionable fix suggestions.
 *
 * Usage:
 *   npx ts-node scripts/visual-qa/suggest-fixes.ts generated/books/atomic-habits-2024/.visual-qa/visual-qa-report.json
 *   npx ts-node scripts/visual-qa/suggest-fixes.ts <report.json> [--output fixes.json]
 */

import fs from "fs";
import path from "path";

import "tsconfig-paths/register";

import type { QAIssue, VisualQAReport, IssueSeverity } from "./structural-qa";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FixSuggestion {
  sceneId: string;
  ruleId: string;
  severity: IssueSeverity;
  problem: string;
  suggestion: string;
  /** Specific field or property to modify */
  targetField?: string;
}

export interface FixReport {
  bookId: string;
  timestamp: string;
  sourceReport: string;
  totalIssues: number;
  suggestions: FixSuggestion[];
}

// ---------------------------------------------------------------------------
// Fix generators per rule
// ---------------------------------------------------------------------------

function suggestTextDensityFix(issue: QAIssue): FixSuggestion {
  const cpsMatch = issue.message.match(/([\d.]+) chars\/sec/);
  const cps = cpsMatch ? parseFloat(cpsMatch[1]) : 0;

  let suggestion: string;
  if (cps > 9) {
    suggestion =
      "Split this scene into two scenes, or significantly reduce narration text. " +
      "Consider moving supporting details to a separate keyInsight or application scene.";
  } else {
    suggestion =
      "Slightly reduce narration text or increase scene duration. " +
      "Remove filler phrases or compress supporting sentences.";
  }

  return {
    sceneId: issue.sceneId,
    ruleId: issue.ruleId,
    severity: issue.severity,
    problem: issue.message,
    suggestion,
    targetField: "narrationText",
  };
}

function suggestHeadlineLengthFix(issue: QAIssue): FixSuggestion {
  return {
    sceneId: issue.sceneId,
    ruleId: issue.ruleId,
    severity: issue.severity,
    problem: issue.message,
    suggestion:
      "Truncate headline to 60 characters or fewer. Move extra detail to supportText or description. " +
      "Korean headlines should convey the core idea in a single phrase.",
    targetField: "content.headline",
  };
}

function suggestBeatCoverageFix(issue: QAIssue): FixSuggestion {
  let suggestion: string;
  let targetField = "beats";

  if (issue.message.includes("too short")) {
    suggestion =
      "Extend this beat's duration or merge it with an adjacent beat. " +
      "Minimum beat ratio is 0.12 (roughly 1 second in a 8-second scene).";
  } else if (issue.message.includes("overlap")) {
    suggestion =
      "Fix beat boundaries so endRatio of one beat equals startRatio of the next. " +
      "Beats must not overlap.";
  } else if (issue.message.includes("first")) {
    suggestion =
      "Add an introductory beat starting at ratio 0.0 to cover the scene opening. " +
      "Consider a 'headline' or 'hook' role beat.";
    targetField = "beats[0].startRatio";
  } else if (issue.message.includes("last")) {
    suggestion =
      "Extend the final beat to ratio 1.0, or add a 'recap'/'transition' beat " +
      "to cover the scene ending.";
    targetField = "beats[last].endRatio";
  } else {
    suggestion = "Review beat timing to ensure adequate scene coverage.";
  }

  return {
    sceneId: issue.sceneId,
    ruleId: issue.ruleId,
    severity: issue.severity,
    problem: issue.message,
    suggestion,
    targetField,
  };
}

function suggestElementCountFix(issue: QAIssue): FixSuggestion {
  let suggestion: string;

  if (issue.message.includes("0 items") || issue.message.includes("0 steps")) {
    suggestion =
      "Add at least one item/step. An empty scene has no visual content to render.";
  } else {
    const match = issue.message.match(/has (\d+)/);
    const count = match ? parseInt(match[1], 10) : 0;
    suggestion =
      `Reduce to the most important items. With ${count} elements, ` +
      "the scene risks visual clutter. Prioritize the top items and move " +
      "the rest to a continuation scene or footnote.";
  }

  return {
    sceneId: issue.sceneId,
    ruleId: issue.ruleId,
    severity: issue.severity,
    problem: issue.message,
    suggestion,
    targetField: "content.items",
  };
}

function suggestSafeAreaFix(issue: QAIssue): FixSuggestion {
  let suggestion: string;

  if (issue.message.includes("Subtitle segment")) {
    suggestion =
      "Break long sentences into shorter clauses (max 28 chars per line, 2 lines). " +
      "Use periods or commas as natural break points in the narration text.";
  } else {
    suggestion =
      "Simplify the scene: reduce beat count or shorten narration. " +
      "Long narration with many visual beats creates cognitive overload.";
  }

  return {
    sceneId: issue.sceneId,
    ruleId: issue.ruleId,
    severity: issue.severity,
    problem: issue.message,
    suggestion,
    targetField: "narrationText",
  };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

function generateSuggestion(issue: QAIssue): FixSuggestion {
  switch (issue.ruleId) {
    case "text-density":
      return suggestTextDensityFix(issue);
    case "headline-length":
      return suggestHeadlineLengthFix(issue);
    case "beat-coverage":
      return suggestBeatCoverageFix(issue);
    case "element-count":
      return suggestElementCountFix(issue);
    case "safe-area":
      return suggestSafeAreaFix(issue);
    default:
      return {
        sceneId: issue.sceneId,
        ruleId: issue.ruleId,
        severity: issue.severity,
        problem: issue.message,
        suggestion: "Review this issue manually.",
      };
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function generateFixSuggestions(
  report: VisualQAReport,
  sourcePath: string,
): FixReport {
  const allIssues: QAIssue[] = [];
  for (const scene of report.scenes) {
    for (const issue of scene.issues) {
      allIssues.push(issue);
    }
  }

  const suggestions = allIssues.map(generateSuggestion);

  return {
    bookId: report.bookId,
    timestamp: new Date().toISOString(),
    sourceReport: sourcePath,
    totalIssues: allIssues.length,
    suggestions,
  };
}

function main(): void {
  const reportPath = process.argv[2];
  if (!reportPath) {
    console.error(
      "Usage: npx ts-node scripts/visual-qa/suggest-fixes.ts <visual-qa-report.json> [--output fixes.json]",
    );
    process.exit(1);
  }

  const absPath = path.resolve(process.cwd(), reportPath);
  if (!fs.existsSync(absPath)) {
    console.error(`Report file not found: ${absPath}`);
    process.exit(1);
  }

  // Parse --output flag
  let outputPath: string | null = null;
  const outputIdx = process.argv.indexOf("--output");
  if (outputIdx !== -1 && process.argv[outputIdx + 1]) {
    outputPath = path.resolve(process.cwd(), process.argv[outputIdx + 1]);
  }

  const report: VisualQAReport = JSON.parse(fs.readFileSync(absPath, "utf-8"));

  console.log(`\n=== Fix Suggestions: ${report.bookId} ===\n`);

  const fixReport = generateFixSuggestions(report, absPath);

  if (fixReport.totalIssues === 0) {
    console.log("No issues found — nothing to suggest.");
    return;
  }

  console.log(`Total issues: ${fixReport.totalIssues}\n`);

  // Group suggestions by scene
  const byScene = new Map<string, FixSuggestion[]>();
  for (const s of fixReport.suggestions) {
    const list = byScene.get(s.sceneId) ?? [];
    list.push(s);
    byScene.set(s.sceneId, list);
  }

  for (const [sceneId, suggestions] of byScene) {
    console.log(`  ${sceneId}:`);
    for (const s of suggestions) {
      const icon = s.severity === "fail" ? "  x" : "  !";
      console.log(`  ${icon} [${s.ruleId}] ${s.problem}`);
      console.log(`      -> ${s.suggestion}`);
      if (s.targetField) {
        console.log(`      target: ${s.targetField}`);
      }
    }
    console.log();
  }

  // Write fix report
  const defaultOutputPath = absPath.replace(
    "visual-qa-report.json",
    "fix-suggestions.json",
  );
  const finalOutputPath = outputPath ?? defaultOutputPath;
  const outputDir = path.dirname(finalOutputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(finalOutputPath, JSON.stringify(fixReport, null, 2));
  console.log(`Fix suggestions written to: ${finalOutputPath}`);
}

main();
