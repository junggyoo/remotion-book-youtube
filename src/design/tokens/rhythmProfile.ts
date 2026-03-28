import type { SceneType } from "@/types";

export type RhythmProfileType = "even" | "front-loaded" | "back-loaded";

export const RHYTHM_PROFILES: Record<SceneType, RhythmProfileType> = {
  cover: "even",
  chapterDivider: "even",
  keyInsight: "front-loaded",
  compareContrast: "even",
  quote: "back-loaded",
  framework: "even",
  application: "even",
  data: "even",
  closing: "back-loaded",
  timeline: "even",
  highlight: "front-loaded",
  transition: "even",
  listReveal: "even",
  splitQuote: "even",
  custom: "even",
};

/**
 * Beat position에 따른 stagger delay 수정 계수.
 *
 * >1 = compress/faster (shorter stagger delay)
 * <1 = stretch/slower (longer stagger delay)
 * =1 = unchanged
 *
 * @param profile - 리듬 프로파일 타입
 * @param position - beat 진행 위치 (0~1, 0=시작, 1=끝)
 */
export function getRhythmModifier(
  profile: RhythmProfileType,
  position: number,
): number {
  const t = Math.max(0, Math.min(1, position));
  switch (profile) {
    case "even":
      return 1.0;
    case "front-loaded":
      return 1.3 - 0.6 * t;
    case "back-loaded":
      return 0.7 + 0.6 * t;
  }
}
