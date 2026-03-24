// ============================================================
// SAVERS Habit Wheel — SceneBlueprint test fixture
// Miracle Morning's 6-step morning routine in radial layout
// ============================================================

import type { SceneBlueprint, VCLElement } from "@/types";
import { useTheme } from "@/design/themes/useTheme";
import { buildDefaultMediaPlan } from "@/renderer/presetBlueprints/types";

const SAVERS_ITEMS = [
  { id: "silence", label: "Silence", description: "명상·기도·감사" },
  { id: "affirmations", label: "Affirmations", description: "긍정 확언" },
  { id: "visualization", label: "Visualization", description: "시각화" },
  { id: "exercise", label: "Exercise", description: "운동" },
  { id: "reading", label: "Reading", description: "독서" },
  { id: "scribing", label: "Scribing", description: "일기 쓰기" },
];

function buildSaversElements(): VCLElement[] {
  const elements: VCLElement[] = [];

  // Center headline: "SAVERS"
  elements.push({
    id: "savers-center",
    type: "headline",
    props: {
      text: "SAVERS",
      role: "center",
      align: "center",
      tokenRef: "typeScale.headlineL",
    },
  });

  // 6 radial label nodes
  SAVERS_ITEMS.forEach((item) => {
    elements.push({
      id: `savers-${item.id}`,
      type: "label",
      props: {
        text: item.label,
        variant: "signal",
      },
    });
  });

  // 6 cycle-connector edges linking adjacent nodes
  SAVERS_ITEMS.forEach((item, i) => {
    const nextItem = SAVERS_ITEMS[(i + 1) % SAVERS_ITEMS.length];
    elements.push({
      id: `connector-${item.id}-${nextItem.id}`,
      type: "cycle-connector",
      props: {
        dotted: false,
        connects: {
          fromId: `savers-${item.id}`,
          toId: `savers-${nextItem.id}`,
        },
      },
    });
  });

  return elements;
}

const theme = useTheme("dark", "selfHelp");

const ctx = {
  format: "longform" as const,
  narrationText: "SAVERS는 미라클 모닝의 핵심 6단계 아침 루틴입니다.",
};

export const saversWheelBlueprint: SceneBlueprint = {
  id: "savers-wheel-demo",
  intent: "SAVERS 6-step habit wheel with radial layout and clockwise stagger",
  origin: "synthesized",
  layout: "radial",
  layoutConfig: {
    centerIndex: 0,
    startAngleDeg: -90,
    radiusRatio: 0.32,
  },
  elements: buildSaversElements(),
  choreography: "stagger-clockwise",
  motionPreset: "smooth",
  format: "longform",
  theme,
  from: 0,
  durationFrames: 150,
  mediaPlan: buildDefaultMediaPlan(ctx.narrationText, {
    format: ctx.format,
    theme,
    from: 0,
    durationFrames: 150,
    narrationText: ctx.narrationText,
  }),
};
