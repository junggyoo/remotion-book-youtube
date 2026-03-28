import type { Beat, FormatKey, SceneBase } from "@/types";
import type { BeatSegment, SceneSpec } from "@/direction/types";
import { toLegacyRole } from "@/direction/beat/beatRoleMapping";

/**
 * 씬의 beat 배열을 해석한다. 하위 호환 보장.
 *
 * 해결 순서:
 * 1. shorts 포맷이고 shorts.beats가 있으면 → 사용
 * 2. longform beats가 있으면 → shorts일 경우 자동 압축, 아니면 그대로
 * 3. beats가 없으면 → 암묵적 단일 beat (기존 동작 유지)
 */
export function resolveBeats(
  scene: SceneBase,
  format: FormatKey,
  sceneSpec?: SceneSpec,
): Beat[] {
  // shorts인 경우 shorts.beats 우선
  if (
    format === "shorts" &&
    scene.shorts?.beats &&
    scene.shorts.beats.length > 0
  ) {
    return scene.shorts.beats;
  }

  // longform beats
  if (scene.beats && scene.beats.length > 0) {
    // shorts인데 shorts.beats가 없으면 → 자동 압축
    if (format === "shorts") {
      return compressBeatsForShorts(scene.beats);
    }
    return scene.beats;
  }

  // Phase 1: semantic beats from direction system
  if (
    sceneSpec?.beatProfile?.segments &&
    sceneSpec.beatProfile.segments.length > 0
  ) {
    const semanticBeats = sceneSpec.beatProfile.segments.map((seg) =>
      convertSegmentToBeat(seg, scene.id),
    );
    if (format === "shorts") {
      return compressBeatsForShorts(semanticBeats);
    }
    return semanticBeats;
  }

  // 암묵적 단일 beat: 씬 전체가 하나의 beat
  return [
    {
      id: `${scene.id}-implicit`,
      role: "headline",
      startRatio: 0,
      endRatio: 1,
      narrationText: scene.narrationText,
      activates: ["*"], // 모든 요소 동시 활성화 (기존 동작 유지)
      transition: "enter",
    },
  ];
}

/**
 * longform beats → shorts 자동 압축.
 * 규칙:
 * - 3 beats 이하: 비율만 재조정하여 그대로 유지
 * - 4+ beats: "headline" + 중간 합침 + 마지막 유지 → 최대 3개
 */
export function compressBeatsForShorts(longformBeats: Beat[]): Beat[] {
  if (longformBeats.length <= 3) {
    // 비율만 균등 재배분
    const count = longformBeats.length;
    return longformBeats.map((beat, i) => ({
      ...beat,
      id: `${beat.id}-shorts`,
      startRatio: i / count,
      endRatio: (i + 1) / count,
    }));
  }

  // 4+ beats: headline + 나머지 합침 + 마지막 유지 → 최대 3개
  const headlineBeat =
    longformBeats.find((b) => b.role === "headline") ?? longformBeats[0];
  const lastBeat = longformBeats[longformBeats.length - 1];

  // Edge case guard: headlineBeat === lastBeat (Architect review fix)
  if (headlineBeat === lastBeat) {
    const midBeats = longformBeats.filter((b) => b !== headlineBeat);
    return [
      {
        ...headlineBeat,
        id: `${headlineBeat.id}-shorts`,
        startRatio: 0,
        endRatio: 0.5,
      },
      {
        id: `${midBeats[0]?.id ?? headlineBeat.id}-shorts-merged`,
        role: "support" as const,
        startRatio: 0.5,
        endRatio: 1,
        narrationText: midBeats
          .map((b) => b.narrationText)
          .filter(Boolean)
          .join(" "),
        activates: midBeats.flatMap((b) => b.activates),
        transition: "enter" as const,
      },
    ];
  }

  const midBeats = longformBeats.filter(
    (b) => b !== headlineBeat && b !== lastBeat,
  );

  const result: Beat[] = [
    {
      ...headlineBeat,
      id: `${headlineBeat.id}-shorts`,
      startRatio: 0,
      endRatio: 0.4,
    },
  ];

  if (midBeats.length > 0) {
    // 중간 beats를 하나로 합침
    result.push({
      id: `${midBeats[0].id}-shorts-merged`,
      role: "support",
      startRatio: 0.4,
      endRatio: 0.7,
      narrationText: midBeats
        .map((b) => b.narrationText)
        .filter(Boolean)
        .join(" "),
      activates: midBeats.flatMap((b) => b.activates),
      transition: "enter",
    });
  }

  result.push({
    ...lastBeat,
    id: `${lastBeat.id}-shorts`,
    startRatio: result.length === 2 ? 0.7 : 0.4,
    endRatio: 1,
  });

  return result;
}

/** Convert a direction BeatSegment to a legacy Beat */
function convertSegmentToBeat(segment: BeatSegment, sceneId: string): Beat {
  return {
    id: `${sceneId}-${segment.id}`,
    role: toLegacyRole(segment.role),
    startRatio: segment.startRatio,
    endRatio: segment.endRatio,
    narrationText: segment.narrationText,
    activates: segment.activates,
    emphasisTargets: segment.emphasisTargets,
    transition:
      segment.transition === "hold" || segment.transition === "exit"
        ? "enter" // legacy Beat only supports enter/replace/emphasis
        : segment.transition,
  };
}
