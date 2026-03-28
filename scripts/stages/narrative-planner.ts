/**
 * NarrativePlanner stage runner — generates EditorialOutline from fingerprint + content.
 *
 * Analyzes book content to produce an editorial outline with duration estimates,
 * core messages, narrative arc, and tone keywords.
 */

import "tsconfig-paths/register";
import { readFileSync } from "fs";
import path from "path";
import type { BookContent } from "../../src/types";
import type {
  DsgsStage,
  DsgsContext,
  DsgsStageResult,
} from "../dsgs-orchestrate";
import type { EditorialOutline } from "../../src/planning/types";
import { EditorialOutlineSchema } from "../../src/planning/schemas";
import { savePlanArtifact } from "../../src/planning/loaders/save-book-plan";
import {
  extractSceneComposition,
  calculateBudget,
} from "../../src/pipeline/durationBudget";

const GENRE_AUDIENCE: Record<string, string> = {
  selfHelp: "자기계발과 습관 형성에 관심 있는 20-40대 한국어 유튜브 시청자",
  psychology: "심리학과 인간 행동에 호기심이 있는 한국어 유튜브 시청자",
  business: "비즈니스 전략과 성공에 관심 있는 직장인 및 창업가 시청자",
  philosophy: "삶의 의미와 사고 방식에 관심 있는 깊이 있는 콘텐츠 시청자",
  science: "과학적 사고와 최신 연구에 관심 있는 지적 호기심이 강한 시청자",
  ai: "인공지능과 기술 트렌드에 관심 있는 한국어 유튜브 시청자",
};

function inferNarrativeArc(
  fingerprint: Record<string, unknown>,
): EditorialOutline["narrativeArc"] {
  const structure = fingerprint.structure as string;
  const arcType = fingerprint.narrativeArcType as string;

  if (structure === "framework" || arcType === "instruction")
    return "framework-driven";
  if (arcType === "transformation") return "transformation";
  if (arcType === "discovery") return "linear";
  return "problem-solution";
}

function extractCoreMessages(book: BookContent): string[] {
  const messages: string[] = [];

  for (const scene of book.scenes) {
    if (
      scene.type === "cover" ||
      scene.type === "closing" ||
      scene.type === "chapterDivider" ||
      scene.type === "transition"
    ) {
      continue;
    }
    const content = scene.content as unknown as Record<string, unknown>;
    const headline =
      (content?.headline as string) ?? (content?.mainText as string);
    if (headline && headline.length > 5) {
      messages.push(headline);
    }
  }

  // Limit to 5 core messages
  return messages.slice(0, 5);
}

function generateOneLiner(
  book: BookContent,
  fingerprint: Record<string, unknown>,
): string {
  const title = book.metadata.title;
  const structure = fingerprint.structure as string;
  const coreFramework = fingerprint.coreFramework as string | undefined;

  if (coreFramework) {
    return `${title}의 핵심 프레임워크 '${coreFramework}'를 통해 실천 가능한 변화를 이끈다`;
  }
  if (structure === "narrative") {
    return `${title}이 전하는 이야기와 통찰을 압축적으로 전달한다`;
  }
  return `${title}의 핵심 인사이트를 체계적으로 정리한다`;
}

function generateHookAngle(fingerprint: Record<string, unknown>): string {
  const hookStrategy = fingerprint.hookStrategy as string;
  const entryAngle = fingerprint.entryAngle as string;

  const strategyPrefix: Record<string, string> = {
    contrarian: "반직관적 선언으로 시작하여",
    question: "근본적 질문을 던지며",
    system: "시스템적 사고를 강조하며",
    transformation: "변화의 가능성을 보여주며",
    pain: "공감할 수 있는 문제를 제기하며",
    identity: "정체성 변화를 다루며",
    urgency: "시급성을 강조하며",
  };

  const prefix = strategyPrefix[hookStrategy] ?? "핵심 메시지를 전달하며";
  return `${prefix} ${entryAngle}`;
}

function estimateTargetDuration(book: BookContent): number {
  const explicit = book.production?.targetDurationSeconds;
  if (explicit && explicit > 0) return explicit;

  const compositions = extractSceneComposition(book.scenes);
  const budget = calculateBudget(300, compositions);
  const totalChars = book.scenes.reduce(
    (sum, s) => sum + (s.narrationText?.length ?? 0),
    0,
  );

  if (totalChars > 0) {
    const estimated = Math.round(totalChars / 7.5);
    return Math.max(120, Math.min(600, estimated));
  }

  return 300; // default 5 minutes
}

export const planNarrative: DsgsStage = {
  id: "2-planner",
  name: "NarrativePlanner",
  async run(ctx: DsgsContext): Promise<DsgsStageResult> {
    const start = Date.now();
    const book = JSON.parse(readFileSync(ctx.bookPath, "utf-8")) as BookContent;

    // Read fingerprint from previous stage
    const fpPath =
      ctx.artifacts.get("1-analyzer") ??
      path.join(ctx.planDir, "00-fingerprint.json");
    let fingerprint: Record<string, unknown>;
    try {
      fingerprint = JSON.parse(readFileSync(fpPath, "utf-8")) as Record<
        string,
        unknown
      >;
    } catch {
      return {
        stageId: "2-planner",
        status: "halted",
        artifacts: [],
        durationMs: Date.now() - start,
        message: `Cannot read fingerprint at ${fpPath}. Run stage 1-analyzer first.`,
      };
    }

    const genre = (fingerprint.genre as string) ?? "selfHelp";
    const targetDuration = estimateTargetDuration(book);

    const outline: EditorialOutline = {
      bookId: ctx.bookId,
      oneLiner: generateOneLiner(book, fingerprint),
      targetAudience: GENRE_AUDIENCE[genre] ?? GENRE_AUDIENCE.selfHelp,
      hookAngle: generateHookAngle(fingerprint),
      coreMessages: extractCoreMessages(book),
      excludedTopics: [],
      targetDurationSeconds: targetDuration,
      toneKeywords: ["구어체", "정보 밀도", "동기 부여", "실용적"],
      narrativeArc: inferNarrativeArc(fingerprint),
    };

    // Validate before saving
    const result = EditorialOutlineSchema.safeParse(outline);
    if (!result.success) {
      return {
        stageId: "2-planner",
        status: "halted",
        artifacts: [],
        durationMs: Date.now() - start,
        message: `Outline validation failed: ${result.error.issues.map((i) => i.message).join(", ")}`,
      };
    }

    savePlanArtifact(ctx.bookId, "01-editorial-outline", outline, true);
    const outPath = path.join(ctx.planDir, "01-editorial-outline.json");

    return {
      stageId: "2-planner",
      status: "success",
      artifacts: [outPath],
      durationMs: Date.now() - start,
      message: `Outline: ${outline.narrativeArc}, ${targetDuration}s, ${outline.coreMessages.length} messages`,
    };
  },
};
