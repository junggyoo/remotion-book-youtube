/**
 * ScenePlanner stage runner — generates StoryboardPlan from fingerprint + outline + book content.
 *
 * Hybrid approach:
 * - matchPresets() → confidence scoring per scene type
 * - BookContent scenes → populate StoryboardScene fields (IDs, text, structure)
 * - calculateBudget() → duration allocation per scene
 */

import "tsconfig-paths/register";
import { existsSync, readFileSync } from "fs";
import path from "path";
import type {
  BookContent,
  BookFingerprint,
  FormatKey,
  OpeningPackage,
  SceneType,
} from "../../src/types";
import type {
  EditorialOutline,
  StoryboardScene,
  StoryboardPlan,
  VisualFunction,
} from "../../src/planning/types";
import { StoryboardPlanSchema } from "../../src/planning/schemas";
import type {
  DsgsStage,
  DsgsContext,
  DsgsStageResult,
} from "../dsgs-orchestrate";
import { savePlanArtifact } from "../../src/planning/loaders/save-book-plan";
import { matchPresets } from "../../src/planner/scenePlanner";
import {
  extractSceneComposition,
  calculateBudget,
  type SceneBudgetPlan,
} from "../../src/pipeline/durationBudget";
import {
  buildNarrativePlan,
  buildDefaultPolicy,
} from "../../src/planner/narrativePlanBuilder";

// ---------------------------------------------------------------------------
// Scene type → visual function mapping
// ---------------------------------------------------------------------------

const VISUAL_FUNCTION_MAP: Record<string, VisualFunction> = {
  cover: "transition",
  chapterDivider: "transition",
  keyInsight: "explain",
  compareContrast: "compare",
  quote: "quote",
  framework: "framework",
  application: "process",
  data: "evidence",
  closing: "compress-recap",
  highlight: "hook",
  timeline: "process",
  listReveal: "reveal-relation",
  transition: "transition",
  splitQuote: "quote",
};

// Scene types with dedicated preset components (CoreSceneType from presetBlueprintRegistry).
// These always render via the existing scene component path regardless of matchPresets confidence.
// Only types WITHOUT preset support (highlight, timeline, listReveal, transition, splitQuote)
// fall through to confidence-based blueprint routing.
const ALWAYS_PRESET_TYPES = new Set<string>([
  "cover",
  "chapterDivider",
  "keyInsight",
  "compareContrast",
  "quote",
  "framework",
  "application",
  "data",
  "closing",
]);

const LAYOUT_MODE_MAP: Record<string, string> = {
  cover: "center-focus",
  chapterDivider: "band-divider",
  keyInsight: "center-focus",
  compareContrast: "split-compare",
  quote: "quote-hold",
  framework: "grid-expand",
  application: "left-anchor",
  data: "grid-expand",
  closing: "center-focus",
  highlight: "center-focus",
  timeline: "left-anchor",
  listReveal: "grid-expand",
  transition: "center-focus",
  splitQuote: "quote-hold",
};

// ---------------------------------------------------------------------------
// Required delivery terms per segment role (English, matching PRESET_CAPABILITIES)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildConfidenceMap(
  scenePlan: ReturnType<typeof matchPresets>,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const match of scenePlan.presetMatches) {
    const current = map.get(match.sceneType) ?? 0;
    if (match.confidence > current) {
      map.set(match.sceneType, match.confidence);
    }
  }
  return map;
}

function extractOnScreenText(scene: BookContent["scenes"][number]): string[] {
  const texts: string[] = [];
  const c = scene.content as Record<string, unknown>;
  if (!c) return texts;

  // headline / mainText / title
  if (typeof c.headline === "string" && c.headline) texts.push(c.headline);
  if (typeof c.mainText === "string" && c.mainText) texts.push(c.mainText);
  if (typeof c.title === "string" && c.title) texts.push(c.title);
  if (typeof c.subText === "string" && c.subText) texts.push(c.subText);

  // framework items
  if (typeof c.frameworkLabel === "string" && c.frameworkLabel)
    texts.push(c.frameworkLabel);
  if (Array.isArray(c.items)) {
    for (const item of c.items) {
      const label =
        (item as Record<string, unknown>)?.label ??
        (item as Record<string, unknown>)?.title;
      if (typeof label === "string" && label) texts.push(label);
    }
  }

  // application steps
  if (typeof c.anchorStatement === "string" && c.anchorStatement)
    texts.push(c.anchorStatement);
  if (Array.isArray(c.steps)) {
    for (const step of c.steps) {
      const t =
        (step as Record<string, unknown>)?.title ??
        (step as Record<string, unknown>)?.label;
      if (typeof t === "string" && t) texts.push(t);
    }
  }

  // quote
  if (typeof c.quoteText === "string" && c.quoteText) texts.push(c.quoteText);

  // compare
  if (typeof c.leftLabel === "string" && c.leftLabel) texts.push(c.leftLabel);
  if (typeof c.rightLabel === "string" && c.rightLabel)
    texts.push(c.rightLabel);
  if (typeof c.leftContent === "string" && c.leftContent)
    texts.push(c.leftContent);
  if (typeof c.rightContent === "string" && c.rightContent)
    texts.push(c.rightContent);

  // data
  if (typeof c.dataLabel === "string" && c.dataLabel) texts.push(c.dataLabel);

  // closing
  if (typeof c.recapStatement === "string" && c.recapStatement)
    texts.push(c.recapStatement);
  if (typeof c.ctaText === "string" && c.ctaText) texts.push(c.ctaText);

  // cover
  if (typeof c.author === "string" && c.author) texts.push(c.author);

  // chapter divider
  if (typeof c.chapterTitle === "string" && c.chapterTitle)
    texts.push(c.chapterTitle);

  return texts.filter((t) => t.length > 0);
}

function derivePurpose(scene: BookContent["scenes"][number]): string {
  const c = scene.content as Record<string, unknown>;
  const headline =
    (c?.headline as string) ??
    (c?.mainText as string) ??
    (c?.frameworkLabel as string) ??
    (c?.quoteText as string) ??
    "";
  const typeLabel: Record<string, string> = {
    cover: "책 표지와 브랜드 소개",
    chapterDivider: "챕터 전환",
    keyInsight: "핵심 인사이트 전달",
    compareContrast: "대비를 통한 이해 강화",
    quote: "핵심 명언으로 감정적 임팩트",
    framework: "핵심 프레임워크 순차 공개",
    application: "실천 방법 제시",
    data: "데이터 기반 근거 제시",
    closing: "행동 촉구 + CTA",
    highlight: "시선을 사로잡는 후크",
    timeline: "시간순 전개",
    listReveal: "항목 순차 공개",
    transition: "전환 씬",
  };
  const base = typeLabel[scene.type] ?? scene.type;
  return headline ? `${base}: ${headline.slice(0, 40)}` : base;
}

function deriveNarrativeGoal(scene: BookContent["scenes"][number]): string {
  if (scene.narrationText) {
    // First sentence of narration
    const first = scene.narrationText.split(/[.!?。]/)[0];
    if (first && first.length > 5) return first.slice(0, 80);
  }
  const c = scene.content as Record<string, unknown>;
  return (c?.headline as string) ?? (c?.mainText as string) ?? scene.type;
}

function deriveVisualIntent(sceneType: string, layoutMode: string): string {
  const intents: Record<string, string> = {
    cover: "표지 이미지 중심 레이아웃, 브랜드 라벨 배치",
    chapterDivider: "챕터 번호 + 타이틀 중앙 배치",
    keyInsight: "headline 등장 후 support text 확장",
    compareContrast: "좌우 분할 패널, 순차 공개",
    quote: "serif 서체 인용문 중앙 배치, texture 배경",
    framework: "항목 stagger reveal, 번호 배지 + 제목 + 설명",
    application: "anchor statement 후 step 순차 공개",
    data: "데이터 시각화 + headline",
    closing: "recap statement 중앙 + CTA 텍스트 하단",
    highlight: "강렬한 텍스트 등장, 키워드 강조",
    timeline: "시간순 이벤트 순차 공개",
    listReveal: "항목 순차 등장",
    transition: "간결한 전환 텍스트",
  };
  return intents[sceneType] ?? `${layoutMode} 기반 레이아웃`;
}

function deriveTransitionIntent(
  sceneType: string,
): "cut" | "fade" | "directional" | "morph" {
  if (sceneType === "cover" || sceneType === "closing") return "fade";
  if (sceneType === "chapterDivider") return "directional";
  if (sceneType === "quote") return "fade";
  return "cut";
}

function toStoryboardScenes(
  book: BookContent,
  confidenceMap: Map<string, number>,
  budgetPlan: SceneBudgetPlan,
  threshold: number,
): StoryboardScene[] {
  return book.scenes.map((scene, i) => {
    const sceneType = scene.type as string;
    const confidence = confidenceMap.get(sceneType) ?? 0;
    // Types with dedicated preset components always use preset renderMode.
    // Only types without preset support (highlight, timeline, etc.) use
    // confidence-based routing to determine if blueprint synthesis is needed.
    const isPreset =
      ALWAYS_PRESET_TYPES.has(sceneType) ||
      (!ALWAYS_PRESET_TYPES.has(sceneType) &&
        sceneType !== "highlight" &&
        confidence >= threshold);
    const layoutMode = LAYOUT_MODE_MAP[sceneType] ?? "center-focus";

    const budgetScene = budgetPlan.scenes[i];
    const targetDurationSeconds = budgetScene
      ? budgetScene.targetSeconds
      : Math.round(budgetPlan.targetDurationSeconds / book.scenes.length);

    return {
      sceneId: scene.id,
      order: i,
      purpose: derivePurpose(scene),
      narrativeGoal: deriveNarrativeGoal(scene),
      visualFunction: (VISUAL_FUNCTION_MAP[sceneType] ??
        "explain") as VisualFunction,
      visualIntent: deriveVisualIntent(sceneType, layoutMode),
      layoutMode,
      targetDurationSeconds,
      onScreenText: extractOnScreenText(scene),
      transitionIntent: deriveTransitionIntent(sceneType),
      renderMode: isPreset ? ("preset" as const) : ("blueprint" as const),
      ...(isPreset
        ? { presetSceneType: sceneType as SceneType }
        : { blueprintId: scene.id }),
    };
  });
}

// ---------------------------------------------------------------------------
// Stage export
// ---------------------------------------------------------------------------

export const planScenes: DsgsStage = {
  id: "4-scene-planner",
  name: "ScenePlanner",
  artifactFile: "03-storyboard.json",
  async run(ctx: DsgsContext): Promise<DsgsStageResult> {
    const start = Date.now();
    const outPath = path.join(ctx.planDir, "03-storyboard.json");

    // Skip if artifact already exists
    if (existsSync(outPath)) {
      return {
        stageId: "4-scene-planner",
        status: "skipped",
        artifacts: [outPath],
        durationMs: Date.now() - start,
        message: "Artifact exists: 03-storyboard.json",
      };
    }

    // 1. Read fingerprint
    const fpPath =
      ctx.artifacts.get("1-analyzer") ??
      path.join(ctx.planDir, "00-fingerprint.json");
    let fingerprint: BookFingerprint;
    try {
      fingerprint = JSON.parse(
        readFileSync(fpPath, "utf-8"),
      ) as BookFingerprint;
    } catch {
      return {
        stageId: "4-scene-planner",
        status: "halted",
        artifacts: [],
        durationMs: Date.now() - start,
        message: `Cannot read fingerprint at ${fpPath}. Run stage 1-analyzer first.`,
      };
    }

    // 2. Read editorial outline
    const outlinePath =
      ctx.artifacts.get("2-planner") ??
      path.join(ctx.planDir, "01-editorial-outline.json");
    let outline: EditorialOutline;
    try {
      outline = JSON.parse(
        readFileSync(outlinePath, "utf-8"),
      ) as EditorialOutline;
    } catch {
      return {
        stageId: "4-scene-planner",
        status: "halted",
        artifacts: [],
        durationMs: Date.now() - start,
        message: `Cannot read outline at ${outlinePath}. Run stage 2-planner first.`,
      };
    }

    // 3. Read book content
    const book = JSON.parse(readFileSync(ctx.bookPath, "utf-8")) as BookContent;

    // 4. Build inputs for matchPresets
    const narrativePlan = buildNarrativePlan(outline, book);
    const policy = buildDefaultPolicy(ctx.format);

    // 5. Call matchPresets for confidence scoring
    // OpeningPackage param is unused (_openingPackage at line 314 of scenePlanner.ts)
    const scenePlan = matchPresets(
      narrativePlan,
      fingerprint,
      null as unknown as OpeningPackage,
      policy,
    );
    const confidenceMap = buildConfidenceMap(scenePlan);

    // 6. Calculate duration budget from book scenes
    const compositions = extractSceneComposition(book.scenes);
    const budgetPlan = calculateBudget(
      outline.targetDurationSeconds,
      compositions,
    );

    // 7. Convert book scenes → StoryboardScene[]
    const scenes = toStoryboardScenes(
      book,
      confidenceMap,
      budgetPlan,
      policy.presetConfidenceThreshold,
    );

    // 8. Assemble StoryboardPlan
    const storyboard: StoryboardPlan = {
      bookId: ctx.bookId,
      totalScenes: scenes.length,
      estimatedDurationSeconds: scenes.reduce(
        (sum, s) => sum + s.targetDurationSeconds,
        0,
      ),
      scenes,
    };

    // 9. Validate
    const result = StoryboardPlanSchema.safeParse(storyboard);
    if (!result.success) {
      return {
        stageId: "4-scene-planner",
        status: "halted",
        artifacts: [],
        durationMs: Date.now() - start,
        message: `Storyboard validation failed: ${result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
      };
    }

    // 10. Save
    savePlanArtifact(ctx.bookId, "03-storyboard", storyboard, true);

    const presetCount = scenes.filter((s) => s.renderMode === "preset").length;
    const blueprintCount = scenes.filter(
      (s) => s.renderMode === "blueprint",
    ).length;

    return {
      stageId: "4-scene-planner",
      status: "success",
      artifacts: [outPath],
      durationMs: Date.now() - start,
      message: `Storyboard: ${scenes.length} scenes (${presetCount} preset, ${blueprintCount} blueprint), ${storyboard.estimatedDurationSeconds}s`,
    };
  },
};
