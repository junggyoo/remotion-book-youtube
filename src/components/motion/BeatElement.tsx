import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { ArchitecturalReveal } from "@/components/motion/ArchitecturalReveal";
import type {
  ElementBeatState,
  FormatKey,
  MotionPresetKey,
  Theme,
} from "@/types";

/**
 * 암묵적 단일 beat ("*")일 때 사용하는 상수.
 * 모든 요소가 처음부터 보이는 상태 — 기존 동작 유지.
 */
export const ALWAYS_VISIBLE: ElementBeatState = {
  visibility: "visible",
  entryFrame: 0,
  emphasis: false,
  motionPreset: "heavy",
};

/** 프리셋별 exiting 애니메이션 duration (프레임) */
const EXITING_DURATION: Record<MotionPresetKey, number> = {
  gentle: 30,
  smooth: 20,
  snappy: 12,
  heavy: 24,
  dramatic: 36,
};

/** 프리셋별 emphasis scale 최대값 (1.06 이하 제약) */
const EMPHASIS_SCALE = 1.02;

interface BeatElementProps {
  elementKey: string;
  beatState: ElementBeatState | undefined;
  format: FormatKey;
  theme: Theme;
  children: React.ReactNode;
}

/**
 * BeatElement — 요소를 항상 마운트하고, beat state에 따라 시각 상태만 전이.
 *
 * 원칙 6: 마운트 유지, 상태만 전이.
 * 스펙 §6-3 기반, Architect review 반영:
 * - delay={beatState.entryFrame} (not delay={0}) — Sequence-scoped frame 보정
 * - interpolate() 기반 exit/emphasis (CSS transitions은 Remotion export에서 동작 안 함)
 */
export const BeatElement: React.FC<BeatElementProps> = ({
  elementKey,
  beatState,
  format,
  theme,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // hidden 또는 beatState 없음: 마운트 유지, 렌더하지 않음
  if (!beatState || beatState.visibility === "hidden") {
    return <div style={{ opacity: 0, pointerEvents: "none" }}>{children}</div>;
  }

  // entering: ArchitecturalReveal로 등장 애니메이션
  if (beatState.visibility === "entering") {
    return (
      <ArchitecturalReveal
        format={format}
        theme={theme}
        preset={beatState.motionPreset}
        delay={beatState.entryFrame}
      >
        {children}
      </ArchitecturalReveal>
    );
  }

  // exiting: interpolate 기반 opacity fade out
  if (beatState.visibility === "exiting") {
    const exitDur = EXITING_DURATION[beatState.motionPreset];
    const exitFrame = beatState.exitFrame ?? frame;
    const exitProgress = Math.min(1, Math.max(0, frame - exitFrame) / exitDur);
    const opacity = interpolate(exitProgress, [0, 1], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    return <div style={{ opacity }}>{children}</div>;
  }

  // emphasized: interpolate 기반 scale pulse
  if (beatState.visibility === "emphasized") {
    const emphasisProgress = Math.min(
      1,
      Math.max(0, frame - beatState.entryFrame) / 12,
    );
    const scale = interpolate(
      emphasisProgress,
      [0, 0.5, 1],
      [1, EMPHASIS_SCALE, 1],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      },
    );

    return (
      <div style={{ transform: `scale(${scale})`, willChange: "transform" }}>
        {children}
      </div>
    );
  }

  // visible: 정상 표시
  return <>{children}</>;
};

export default BeatElement;
