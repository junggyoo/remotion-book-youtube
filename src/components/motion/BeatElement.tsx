import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { ArchitecturalReveal } from "@/components/motion/ArchitecturalReveal";
import { ScaleReveal } from "@/components/motion/ScaleReveal";
import { SlideReveal } from "@/components/motion/SlideReveal";
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
  wordReveal: 24,
};

/** 프리셋별 emphasis scale 최대값 (1.06 이하 제약) */
const EMPHASIS_SCALE = 1.05;

/** emphasis pulse duration (프레임). 20f ≈ 0.67초 — 인지 가능한 최소 임계 이상 */
const EMPHASIS_DURATION = 20;

/** BeatElement가 entering 상태에서 사용할 모션 프리미티브 */
type BeatMotionType = "architectural" | "scale" | "slide" | "none";

interface BeatElementProps {
  elementKey: string;
  beatState: ElementBeatState | undefined;
  format: FormatKey;
  theme: Theme;
  /** entering 모션 프리미티브 선택 (기본: architectural) */
  motionType?: BeatMotionType;
  /** SlideReveal 방향 (motionType="slide"일 때) */
  slideDirection?: "left" | "right";
  /** ScaleReveal 시작 스케일 (motionType="scale"일 때, 기본 0.95) */
  scaleFrom?: number;
  /** SlideReveal X 이동 거리 (motionType="slide"일 때) */
  translateX?: number;
  /** P2-4: emphasis gate — when false, "emphasized" renders as plain "visible" */
  emphasisGateActive?: boolean;
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
  motionType = "architectural",
  slideDirection,
  scaleFrom,
  translateX,
  emphasisGateActive = true,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // hidden 또는 beatState 없음: 마운트 유지, 렌더하지 않음
  if (!beatState || beatState.visibility === "hidden") {
    return <div style={{ opacity: 0, pointerEvents: "none" }}>{children}</div>;
  }

  // entering: motionType에 따라 모션 프리미티브 선택
  if (beatState.visibility === "entering") {
    switch (motionType) {
      case "scale":
        return (
          <ScaleReveal
            format={format}
            theme={theme}
            preset={beatState.motionPreset}
            delay={beatState.entryFrame}
            scaleFrom={scaleFrom}
          >
            {children}
          </ScaleReveal>
        );
      case "slide":
        return (
          <SlideReveal
            format={format}
            theme={theme}
            preset={beatState.motionPreset}
            delay={beatState.entryFrame}
            direction={slideDirection}
            translateX={translateX}
          >
            {children}
          </SlideReveal>
        );
      case "none":
        // 단일 프레임 opacity snap — 차트 등 자체 애니메이션이 있는 요소용
        return (
          <div style={{ opacity: frame >= beatState.entryFrame ? 1 : 0 }}>
            {children}
          </div>
        );
      case "architectural":
      default:
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

  // emphasized: interpolate 기반 scale pulse + accent tint
  // P2-4: when emphasis gate is inactive, render as plain visible (no scale pulse)
  if (beatState.visibility === "emphasized" && !emphasisGateActive) {
    return <>{children}</>;
  }
  if (beatState.visibility === "emphasized") {
    const emphasisProgress = Math.min(
      1,
      Math.max(0, frame - beatState.entryFrame) / EMPHASIS_DURATION,
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
    const tintOpacity = interpolate(
      emphasisProgress,
      [0, 0.5, 1],
      [0, 0.04, 0],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      },
    );

    // hex (#RRGGBB) → r,g,b for rgba()
    const r = parseInt(theme.accent.slice(1, 3), 16);
    const g = parseInt(theme.accent.slice(3, 5), 16);
    const b = parseInt(theme.accent.slice(5, 7), 16);

    return (
      <div
        style={{
          transform: `scale(${scale})`,
          backgroundColor: `rgba(${r},${g},${b},${tintOpacity})`,
          willChange: "transform",
        }}
      >
        {children}
      </div>
    );
  }

  // visible: 정상 표시
  return <>{children}</>;
};

export default BeatElement;
