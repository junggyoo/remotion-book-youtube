import { useCurrentFrame } from "remotion";
import type {
  Beat,
  BeatTimelineState,
  ChannelKey,
  ElementBeatState,
  MotionPresetKey,
} from "@/types";
import {
  BASE_POLICY,
  CHANNEL_PRIORITY,
  RECOVERY_WINDOW_FRAMES,
  getActiveChannelCap,
} from "@/design/tokens/emphasisPolicy";

/**
 * 모션 프리셋별 entering 애니메이션 duration (프레임).
 * ArchitecturalReveal의 spring duration과 대응.
 */
const ENTERING_DURATION: Record<MotionPresetKey, number> = {
  gentle: 45,
  smooth: 30,
  snappy: 18,
  heavy: 36,
  dramatic: 54,
  wordReveal: 30,
};

/**
 * Beat 기반 타임라인 상태를 계산하는 훅.
 *
 * 원칙 6: 요소는 마운트 유지, 상태만 전이.
 * - hidden → entering → visible → exiting/emphasized
 * - gap 구간에서는 마지막 beat의 상태를 hold
 *
 * P2-4: activeChannels + isInRecoveryWindow 추가.
 * sceneType/format/simultaneousMotionCap은 선택적 — 미제공 시 채널 추적 비활성.
 *
 * @param beats - resolveBeats()가 반환한 beat 배열
 * @param durationFrames - 씬 전체 duration (프레임)
 * @param defaultMotionPreset - beat에 motionPreset이 없을 때 사용할 기본값
 * @param options - P2-4 emphasis channel options (optional)
 */
export function useBeatTimeline(
  beats: Beat[],
  durationFrames: number,
  defaultMotionPreset: MotionPresetKey = "heavy",
  options?: {
    sceneType?: string;
    format?: "longform" | "shorts" | "both";
    simultaneousMotionCap?: number;
  },
): BeatTimelineState {
  const frame = useCurrentFrame();

  // 1. 현재 프레임이 어느 beat에 속하는지 찾기
  const activeBeat =
    beats.find((b) => {
      const start = Math.round(durationFrames * b.startRatio);
      const end = Math.round(durationFrames * b.endRatio);
      return frame >= start && frame < end;
    }) ?? null;

  // 2. 요소별 상태 계산
  const elementStates = new Map<string, ElementBeatState>();
  const activatedElements = new Set<string>();
  const deactivatedElements = new Set<string>();

  for (const beat of beats) {
    const beatStart = Math.round(durationFrames * beat.startRatio);
    const beatEnd = Math.round(durationFrames * beat.endRatio);
    const preset = beat.motionPreset ?? defaultMotionPreset;
    const enteringDur = ENTERING_DURATION[preset];

    if (frame >= beatStart) {
      // activates 처리
      for (const key of beat.activates) {
        if (key === "*") {
          // 모든 요소 활성화 — 암묵적 beat 호환. 컴포넌트 레벨에서 별도 처리.
          continue;
        }

        if (!activatedElements.has(key) || deactivatedElements.has(key)) {
          // 새로 활성화되는 요소
          activatedElements.add(key);
          deactivatedElements.delete(key);

          const isEntering = frame < beatStart + enteringDur;

          elementStates.set(key, {
            visibility: isEntering ? "entering" : "visible",
            entryFrame: beatStart,
            emphasis: false,
            motionPreset: preset,
          });
        }
      }

      // deactivates 처리
      if (beat.deactivates) {
        for (const key of beat.deactivates) {
          deactivatedElements.add(key);
          const existing = elementStates.get(key);
          if (existing && existing.visibility !== "hidden") {
            elementStates.set(key, {
              ...existing,
              visibility: "exiting",
              exitFrame: beatStart,
            });
          }
        }
      }
    }
  }

  // 3. emphasis 적용
  const currentEmphasis = activeBeat?.emphasisTargets ?? [];
  if (activeBeat?.transition === "emphasis") {
    for (const key of activeBeat.activates) {
      const state = elementStates.get(key);
      if (state && state.visibility === "visible") {
        elementStates.set(key, {
          ...state,
          visibility: "emphasized",
          emphasis: true,
        });
      }
    }
  }

  // 4. beat 진행률 (gap 구간에서는 마지막 완료 beat의 progress=1.0으로 hold)
  let beatProgress = 0;
  if (activeBeat) {
    const start = Math.round(durationFrames * activeBeat.startRatio);
    const end = Math.round(durationFrames * activeBeat.endRatio);
    beatProgress = Math.min(1, (frame - start) / Math.max(1, end - start));
  } else if (beats.length > 0) {
    const lastCompleted = [...beats]
      .reverse()
      .find((b) => frame >= Math.round(durationFrames * b.endRatio));
    if (lastCompleted) beatProgress = 1;
  }

  // 5. P2-4: emphasis channel tracking + recovery window
  const activeChannels = new Set<ChannelKey>();
  let isInRecoveryWindow = false;

  if (options?.sceneType) {
    const sceneType = options.sceneType as import("@/types").SceneType;
    const format = options.format ?? "longform";
    const cap = getActiveChannelCap(options.simultaneousMotionCap, format);
    const policy = BASE_POLICY[sceneType] ?? BASE_POLICY.closing;

    // Determine if currently in an emphasis beat
    const isEmphasisActive = activeBeat?.transition === "emphasis";

    if (isEmphasisActive) {
      // Populate activeChannels up to cap, in priority order
      for (const ch of CHANNEL_PRIORITY) {
        if (policy[ch] && activeChannels.size < cap) {
          activeChannels.add(ch);
        }
      }
    }

    // Recovery window: 12f after the most recent emphasis beat ended
    if (!isEmphasisActive) {
      const lastEmphasisBeat = [...beats]
        .reverse()
        .find(
          (b) =>
            b.transition === "emphasis" &&
            frame >= Math.round(durationFrames * b.endRatio),
        );

      if (lastEmphasisBeat) {
        const emphasisEnd = Math.round(
          durationFrames * lastEmphasisBeat.endRatio,
        );
        const framesSinceEnd = frame - emphasisEnd;
        if (framesSinceEnd >= 0 && framesSinceEnd < RECOVERY_WINDOW_FRAMES) {
          isInRecoveryWindow = true;
        }
      }
    }
  }

  return {
    activeBeat,
    elementStates,
    beatProgress,
    currentEmphasis,
    activeChannels,
    isInRecoveryWindow,
  };
}
