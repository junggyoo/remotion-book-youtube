/**
 * NodeActivation — P2-1c: 다이어그램 노드 순차 활성화 프리미티브.
 *
 * 3축 활성화:
 * 1. fillTransition: mutedColor → activeColor 색상 전환
 * 2. scalePulse: 1.0 → 1.03 → 1.0 (CLAUDE.md 한도 1.06 내)
 * 3. glowRing: 미세 glow 링 (optional, hook/keyInsight 전용)
 *
 * 용도: DiagramGeometry nodes의 순차 활성화 연출.
 */

import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { applyPreset } from "@/design/tokens/motion";
import type { FormatKey, Theme, DiagramCompletionBehavior } from "@/types";

/** 노드 활성화 효과 플래그 */
export interface ActivationEffects {
  /** muted → active 색상 전환 (기본: true) */
  fillTransition: boolean;
  /** 1.0 → 1.03 → 1.0 scale pulse (기본: true). CLAUDE.md: max 1.06 */
  scalePulse: boolean;
  /** 미세 glow 링 (기본: false, hook/keyInsight만) */
  glowRing: boolean;
}

export interface NodeActivationNode {
  label: string;
  x: number;
  y: number;
}

export interface NodeActivationProps {
  /** 노드 배열 (label + 위치) */
  nodes: NodeActivationNode[];
  /** 활성화 순서 (nodes 인덱스 배열) */
  activationOrder: number[];
  /** 노드 간 활성화 지연 (프레임) */
  staggerDelay: number;
  /** 활성화 시작 프레임 */
  startFrame: number;
  /** 비활성 상태 색상 */
  mutedColor: string;
  /** 활성 상태 색상 */
  activeColor: string;
  /** 활성화 효과 설정 */
  activationEffects: ActivationEffects;
  format: FormatKey;
  theme: Theme;
  /** 노드 크기 (기본: 48) */
  nodeSize?: number;
  /** SVG 캔버스 너비 */
  width?: number;
  /** SVG 캔버스 높이 */
  height?: number;
  /** 완성 후 행동 (기본: "hold") */
  completionBehavior?: DiagramCompletionBehavior;
  /** fade-summary용: summary 요소를 렌더하는 children */
  summaryElement?: React.ReactNode;
}

/** scale pulse 최대값 (CLAUDE.md: maxScaleEmphasis 1.06 내) */
const SCALE_PULSE_PEAK = 1.03;

/** scale pulse duration (프레임) */
const SCALE_PULSE_DURATION = 16;

/** glow ring 최대 반경 오프셋 */
const GLOW_RING_OFFSET = 8;

/** 색상 전환 duration (프레임) */
const FILL_TRANSITION_DURATION = 12;

/** 개별 노드 렌더링 */
const ActivationNode: React.FC<{
  node: NodeActivationNode;
  activationFrame: number;
  mutedColor: string;
  activeColor: string;
  effects: ActivationEffects;
  nodeSize: number;
  format: FormatKey;
  theme: Theme;
}> = ({
  node,
  activationFrame,
  mutedColor,
  activeColor,
  effects,
  nodeSize,
  format,
  theme,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const elapsed = Math.max(0, frame - activationFrame);
  const isActivated = frame >= activationFrame;

  // 1. Fill transition
  const fillProgress = effects.fillTransition
    ? interpolate(elapsed, [0, FILL_TRANSITION_DURATION], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : isActivated
      ? 1
      : 0;

  // 2. Scale pulse: 1.0 → SCALE_PULSE_PEAK → 1.0
  let scale = 1;
  if (effects.scalePulse && isActivated) {
    const pulseProgress = interpolate(
      elapsed,
      [0, SCALE_PULSE_DURATION],
      [0, 1],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      },
    );
    scale = interpolate(pulseProgress, [0, 0.4, 1], [1, SCALE_PULSE_PEAK, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  }

  // 3. Glow ring
  const glowOpacity =
    effects.glowRing && isActivated
      ? interpolate(elapsed, [0, 20, 40], [0, 0.3, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;

  const half = nodeSize / 2;
  const isShorts = format === "shorts";
  const fontSize = isShorts ? 10 : 12;

  return (
    <g
      transform={`translate(${node.x}, ${node.y}) scale(${scale})`}
      style={{ transformOrigin: `${node.x}px ${node.y}px` }}
    >
      {/* Glow ring (behind node) */}
      {effects.glowRing && glowOpacity > 0 && (
        <circle
          cx={0}
          cy={0}
          r={half + GLOW_RING_OFFSET}
          fill="none"
          stroke={activeColor}
          strokeWidth={2}
          opacity={glowOpacity}
        />
      )}

      {/* Node circle */}
      <circle cx={0} cy={0} r={half} fill={mutedColor} />
      {fillProgress > 0 && (
        <circle
          cx={0}
          cy={0}
          r={half}
          fill={activeColor}
          opacity={fillProgress}
        />
      )}

      {/* Label */}
      <text
        x={0}
        y={half + fontSize + 4}
        textAnchor="middle"
        fill={isActivated ? theme.textStrong : theme.textMuted}
        fontSize={fontSize}
        fontFamily="Pretendard, Inter, system-ui, sans-serif"
      >
        {node.label}
      </text>
    </g>
  );
};

/** fade-summary 전환 duration (프레임) */
const FADE_SUMMARY_DURATION = 18;

/** fade-summary 시 다이어그램 최소 opacity */
const FADE_SUMMARY_DIAGRAM_OPACITY = 0.4;

export const NodeActivation: React.FC<NodeActivationProps> = ({
  nodes,
  activationOrder,
  staggerDelay,
  startFrame,
  mutedColor,
  activeColor,
  activationEffects,
  format,
  theme,
  nodeSize = 48,
  width,
  height,
  completionBehavior = "hold",
  summaryElement,
}) => {
  const frame = useCurrentFrame();

  // 각 노드의 활성화 프레임 계산
  const activationFrames = new Map<number, number>();
  activationOrder.forEach((nodeIdx, orderIdx) => {
    activationFrames.set(nodeIdx, startFrame + orderIdx * staggerDelay);
  });

  // 마지막 노드 활성화 완료 프레임 (fill transition 포함)
  const lastActivationStart =
    startFrame + (activationOrder.length - 1) * staggerDelay;
  const completionFrame = lastActivationStart + FILL_TRANSITION_DURATION;

  // fade-summary: summary 요소가 없으면 hold로 fallback
  const effectiveBehavior =
    completionBehavior === "fade-summary" && !summaryElement
      ? "hold"
      : completionBehavior;

  const allNodesActive = frame >= completionFrame;

  // fade-summary opacity 계산
  let diagramOpacity = 1;
  let summaryOpacity = 0;

  if (effectiveBehavior === "fade-summary" && allNodesActive) {
    const fadeElapsed = frame - completionFrame;
    const fadeProgress = interpolate(
      fadeElapsed,
      [0, FADE_SUMMARY_DURATION],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );
    diagramOpacity = interpolate(
      fadeProgress,
      [0, 1],
      [1, FADE_SUMMARY_DIAGRAM_OPACITY],
    );
    summaryOpacity = interpolate(fadeProgress, [0, 1], [0, 1]);
  }

  return (
    <>
      <svg
        width={width ?? "100%"}
        height={height ?? "100%"}
        style={{
          overflow: "visible",
          position: "absolute",
          top: 0,
          left: 0,
          opacity: diagramOpacity,
        }}
        viewBox={width && height ? `0 0 ${width} ${height}` : undefined}
      >
        {nodes.map((node, i) => (
          <ActivationNode
            key={i}
            node={node}
            activationFrame={
              activationFrames.get(i) ?? startFrame + i * staggerDelay
            }
            mutedColor={mutedColor}
            activeColor={activeColor}
            effects={activationEffects}
            nodeSize={nodeSize}
            format={format}
            theme={theme}
          />
        ))}
      </svg>
      {effectiveBehavior === "fade-summary" && summaryElement && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            opacity: summaryOpacity,
            pointerEvents: summaryOpacity > 0 ? "auto" : "none",
          }}
        >
          {summaryElement}
        </div>
      )}
    </>
  );
};

export default NodeActivation;
