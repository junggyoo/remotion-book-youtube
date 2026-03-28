/**
 * AnimatedPath — P2-1b: 범용 SVG path drawing 프리미티브.
 *
 * DataScene LineChart의 evolvePath() 패턴을 추출.
 * @remotion/paths의 evolvePath()로 strokeDasharray/offset 기반 드로잉.
 *
 * 용도: DiagramGeometry connections, 타임라인 연결선, 플로우 화살표 등.
 */

import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { evolvePath } from "@remotion/paths";

export type AnimatedPathEasing = "linear" | "easeOut" | "easeInOut";

export interface AnimatedPathProps {
  /** SVG path data string (M, L, Q, C 등) */
  pathData: string;
  /** 드로잉 시작 프레임 (씬 내 상대 프레임) */
  startFrame: number;
  /** 드로잉 duration (프레임 수) */
  drawDuration: number;
  /** 선 색상 */
  strokeColor: string;
  /** 선 두께 (기본: 2) */
  strokeWidth?: number;
  /** 끝점에 화살표 마커 표시 여부 (기본: false) */
  arrowHead?: boolean;
  /** 화살표 색상 (기본: strokeColor와 동일) */
  arrowColor?: string;
  /** 이징 함수 (기본: easeOut) */
  easing?: AnimatedPathEasing;
  /** SVG viewBox 너비 (기본: 부모 컨테이너) */
  width?: number;
  /** SVG viewBox 높이 (기본: 부모 컨테이너) */
  height?: number;
  /** 선 끝 모양 (기본: round) */
  lineCap?: "butt" | "round" | "square";
  /** 선 연결 모양 (기본: round) */
  lineJoin?: "miter" | "round" | "bevel";
  /** 드로잉 완료 후 fill 색상 (선택) */
  fillColor?: string;
  /** 드로잉 완료 후 fill opacity (기본: 0) */
  fillOpacity?: number;
}

const EASING_MAP: Record<AnimatedPathEasing, (t: number) => number> = {
  linear: (t: number) => t,
  easeOut: Easing.out(Easing.quad),
  easeInOut: Easing.inOut(Easing.quad),
};

const ARROW_SIZE = 8;

export const AnimatedPath: React.FC<AnimatedPathProps> = ({
  pathData,
  startFrame,
  drawDuration,
  strokeColor,
  strokeWidth = 2,
  arrowHead = false,
  arrowColor,
  easing = "easeOut",
  width,
  height,
  lineCap = "round",
  lineJoin = "round",
  fillColor = "none",
  fillOpacity = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const adjustedFrame = Math.max(0, frame - startFrame);
  const drawProgress = interpolate(adjustedFrame, [0, drawDuration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASING_MAP[easing],
  });

  const { strokeDasharray, strokeDashoffset } = evolvePath(
    drawProgress,
    pathData,
  );

  // 고유 마커 ID (동일 씬 내 여러 AnimatedPath 공존 지원)
  const markerId = `arrow-${startFrame}-${drawDuration}`;
  const resolvedArrowColor = arrowColor ?? strokeColor;

  return (
    <svg
      width={width ?? "100%"}
      height={height ?? "100%"}
      style={{ overflow: "visible", position: "absolute", top: 0, left: 0 }}
      viewBox={width && height ? `0 0 ${width} ${height}` : undefined}
    >
      {arrowHead && (
        <defs>
          <marker
            id={markerId}
            markerWidth={ARROW_SIZE}
            markerHeight={ARROW_SIZE}
            refX={ARROW_SIZE - 1}
            refY={ARROW_SIZE / 2}
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path
              d={`M 0 0 L ${ARROW_SIZE} ${ARROW_SIZE / 2} L 0 ${ARROW_SIZE} Z`}
              fill={resolvedArrowColor}
              opacity={drawProgress}
            />
          </marker>
        </defs>
      )}
      <path
        d={pathData}
        fill={fillColor}
        fillOpacity={drawProgress >= 1 ? fillOpacity : 0}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap={lineCap}
        strokeLinejoin={lineJoin}
        markerEnd={arrowHead ? `url(#${markerId})` : undefined}
      />
    </svg>
  );
};

export default AnimatedPath;
