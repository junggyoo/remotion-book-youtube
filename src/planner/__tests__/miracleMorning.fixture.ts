// ============================================================
// Miracle Morning — Test Fixtures for SceneSynthesizer
// Provides pre-built SceneGap[] and BookFingerprint for testing.
// ============================================================

import type {
  SceneGap,
  BookFingerprint,
  PresetMatch,
  FrameworkContent,
  ApplicationContent,
} from "@/types";

// ---------------------------------------------------------------------------
// BookFingerprint
// ---------------------------------------------------------------------------

export const miracleMorningFingerprint: BookFingerprint = {
  genre: "selfHelp",
  structure: "framework",
  coreFramework: "SAVERS",
  keyConceptCount: 6,
  emotionalTone: ["uplifting", "disciplined"],
  narrativeArcType: "instruction",
  urgencyLevel: "medium",
  visualMotifs: ["wheel"],
  spatialMetaphors: ["순환"],
  hookStrategy: "transformation",
  entryAngle: "아침 루틴이 인생을 바꾼다",
  uniqueElements: ["SAVERS 순환 시스템", "아침 타임라인 순서"],
  contentMode: "actionable",
};

// ---------------------------------------------------------------------------
// SAVERS Wheel Gap (Q1: cyclic-flow → radial layout)
// ---------------------------------------------------------------------------

const saversPresetMatch: PresetMatch = {
  segment: "core",
  slotIndex: 2,
  sceneType: "framework",
  content: {
    frameworkLabel: "SAVERS",
    items: [
      {
        number: 1,
        title: "Silence",
        description: "명상과 고요함으로 하루를 시작합니다",
      },
      {
        number: 2,
        title: "Affirmations",
        description: "긍정적 확언으로 마인드셋을 세팅합니다",
      },
      {
        number: 3,
        title: "Visualization",
        description: "목표 달성을 생생하게 시각화합니다",
      },
      {
        number: 4,
        title: "Exercise",
        description: "운동으로 에너지를 충전합니다",
      },
      { number: 5, title: "Reading", description: "독서로 지식을 쌓습니다" },
      {
        number: 6,
        title: "Scribing",
        description: "일기 쓰기로 생각을 정리합니다",
      },
    ],
    showConnectors: true,
    showDescriptions: true,
  } satisfies FrameworkContent,
  confidence: 0.55,
  scoreBreakdown: {
    delivery: 0.7,
    structure: 0.4,
    contentFit: 0.6,
    layout: 0.5,
    explanation:
      "SAVERS의 순환 구조를 grid-expand로 표현하기 어려움. 방사형/순환형 레이아웃이 필요함.",
  },
};

export const saversWheelGap: SceneGap = {
  segment: "core",
  slotIndex: 2,
  bestPresetMatch: saversPresetMatch,
  gapReason: "Q1: SAVERS의 순환 구조를 기존 grid-expand로 표현 불가",
  requiredCapabilities: ["cyclic-flow", "motif-wheel"],
  priority: "must",
  intent:
    "SAVERS의 순환 구조를 grid-expand로 표현하기 어려움. 방사형/순환형 레이아웃이 필요함.",
};

// ---------------------------------------------------------------------------
// Morning Timeline Gap (Q3: timeline-h)
// ---------------------------------------------------------------------------

const morningTimelinePresetMatch: PresetMatch = {
  segment: "core",
  slotIndex: 4,
  sceneType: "application",
  content: {
    anchorStatement: "미라클 모닝 타임라인",
    steps: [
      { title: "5:00 기상", detail: "알람 후 즉시 일어나기" },
      { title: "5:10 Silence", detail: "10분 명상" },
      { title: "5:20 Affirmations", detail: "긍정 확언 읽기" },
      { title: "5:30 Visualization", detail: "목표 시각화" },
      { title: "5:40 Exercise", detail: "가벼운 운동" },
      { title: "5:50 Reading", detail: "10분 독서" },
    ],
    showPaths: true,
    showCheckmarks: true,
  } satisfies ApplicationContent,
  confidence: 0.6,
  scoreBreakdown: {
    delivery: 0.7,
    structure: 0.5,
    contentFit: 0.7,
    layout: 0.5,
    explanation:
      "시간적 흐름 [아침 타임라인 순서]을 기존 씬으로 표현 불가. timeline 레이아웃 필요.",
  },
};

export const morningTimelineGap: SceneGap = {
  segment: "core",
  slotIndex: 4,
  bestPresetMatch: morningTimelinePresetMatch,
  gapReason: "Q3: 시간적 흐름 [아침 타임라인 순서]을 기존 씬으로 표현 불가",
  requiredCapabilities: ["timeline-h"],
  priority: "nice",
  intent:
    "시간적 흐름 [아침 타임라인 순서]을 기존 씬으로 표현 불가. timeline 레이아웃 필요.",
};

// ---------------------------------------------------------------------------
// Combined gaps array
// ---------------------------------------------------------------------------

export const miracleMorningGaps: SceneGap[] = [
  saversWheelGap,
  morningTimelineGap,
];
