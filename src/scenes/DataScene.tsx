import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";
import { evolvePath } from "@remotion/paths";
import type {
  BaseSceneProps,
  DataContent,
  DataPoint,
  ElementBeatState,
} from "@/types";
import { useFormat } from "@/design/themes/useFormat";
import { sp } from "@/design/tokens/spacing";
import { typography } from "@/design/tokens/typography";
import { SafeArea } from "@/components/layout/SafeArea";
import { BeatElement } from "@/components/motion/BeatElement";
import { ScaleReveal } from "@/components/motion/ScaleReveal";
import { PulseEmphasis } from "@/components/motion/PulseEmphasis";
import { TextBlock } from "@/components/primitives/TextBlock";
import { NumberBadge } from "@/components/primitives/NumberBadge";
import { ConnectorLine } from "@/components/primitives/ConnectorLine";
import { useBeatTimeline } from "@/hooks/useBeatTimeline";
import { resolveBeats } from "@/pipeline/resolveBeats";
import motionPresets from "@/design/tokens/motion-presets.json";
import { applyPreset } from "@/design/tokens/motion";

// zIndex layers from scene-catalog.json → data
const LAYERS = {
  background: 0,
  texture: 5,
  sourceCredit: 15,
  dataLabel: 20,
  chart: 30,
  annotation: 35,
  hud: 70,
} as const;

const STAGGER = motionPresets.defaults.staggerFrames; // 3

interface DataSceneProps extends BaseSceneProps {
  content: DataContent;
}

// --- Bar Chart ---

interface BarChartProps {
  format: DataSceneProps["format"];
  theme: DataSceneProps["theme"];
  data: DataPoint[];
  unit?: string;
}

const BarChart: React.FC<BarChartProps> = ({ format, theme, data, unit }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const isShorts = format === "shorts";
  const barHeight = isShorts ? 24 : 32;
  const maxBarWidth = isShorts ? 200 : 320;
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: sp(3),
        width: "100%",
      }}
    >
      {data.map((point, i) => {
        const delay = i * 6;
        const adjustedFrame = Math.max(0, frame - delay);
        const progress = applyPreset(
          "smooth",
          adjustedFrame,
          fps,
          durationInFrames,
        );
        const barWidth = interpolate(
          progress,
          [0, 1],
          [0, (point.value / maxValue) * maxBarWidth],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          },
        );
        const barColor = point.highlight ? theme.accent : theme.surfaceMuted;

        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: sp(3),
            }}
          >
            {/* Label */}
            <div style={{ width: isShorts ? 80 : 120, flexShrink: 0 }}>
              <TextBlock
                format={format}
                theme={theme}
                text={point.label}
                variant="bodyS"
                color={theme.textMuted}
                align="right"
                maxLines={1}
              />
            </div>

            {/* Bar */}
            <div
              style={{
                height: barHeight,
                width: barWidth,
                backgroundColor: barColor,
                borderRadius: 2,
                flexShrink: 0,
                minWidth: 2,
              }}
            />

            {/* Value */}
            <div style={{ flexShrink: 0 }}>
              <TextBlock
                format={format}
                theme={theme}
                text={`${point.value}${unit ? unit : ""}`}
                variant="bodyS"
                weight="semibold"
                color={point.highlight ? theme.accent : theme.textStrong}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// --- Compare Chart ---

interface CompareChartProps {
  format: DataSceneProps["format"];
  theme: DataSceneProps["theme"];
  data: DataPoint[];
  unit?: string;
}

const CompareChart: React.FC<CompareChartProps> = ({
  format,
  theme,
  data,
  unit,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const isShorts = format === "shorts";
  const maxHalfWidth = isShorts ? 140 : 220;
  const maxValue = Math.max(...data.slice(0, 2).map((d) => d.value), 1);

  const left = data[0];
  const right = data[1];

  if (!left || !right) return null;

  const leftProgress = applyPreset(
    "smooth",
    Math.max(0, frame - 0),
    fps,
    durationInFrames,
  );
  const rightProgress = applyPreset(
    "smooth",
    Math.max(0, frame - 6),
    fps,
    durationInFrames,
  );

  const leftWidth = interpolate(
    leftProgress,
    [0, 1],
    [0, (left.value / maxValue) * maxHalfWidth],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const rightWidth = interpolate(
    rightProgress,
    [0, 1],
    [0, (right.value / maxValue) * maxHalfWidth],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const barHeight = isShorts ? 28 : 36;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: sp(5),
        width: "100%",
      }}
    >
      {/* Left bar (extends left from center) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: sp(3),
          justifyContent: "center",
        }}
      >
        <TextBlock
          format={format}
          theme={theme}
          text={`${left.value}${unit ?? ""}`}
          variant="bodyS"
          weight="semibold"
          color={theme.signal}
          align="right"
        />
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            width: maxHalfWidth,
          }}
        >
          <div
            style={{
              height: barHeight,
              width: leftWidth,
              backgroundColor: theme.signal,
              borderRadius: 2,
            }}
          />
        </div>
        <div
          style={{
            width: 2,
            height: barHeight,
            backgroundColor: theme.lineSubtle,
            flexShrink: 0,
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "flex-start",
            width: maxHalfWidth,
          }}
        >
          <div
            style={{
              height: barHeight,
              width: rightWidth,
              backgroundColor: theme.accent,
              borderRadius: 2,
            }}
          />
        </div>
        <TextBlock
          format={format}
          theme={theme}
          text={`${right.value}${unit ?? ""}`}
          variant="bodyS"
          weight="semibold"
          color={theme.accent}
        />
      </div>

      {/* Labels */}
      <div style={{ display: "flex", gap: sp(4), justifyContent: "center" }}>
        <TextBlock
          format={format}
          theme={theme}
          text={left.label}
          variant="bodyS"
          color={theme.textMuted}
          align="center"
        />
        <TextBlock
          format={format}
          theme={theme}
          text="vs"
          variant="bodyS"
          color={theme.lineSubtle}
          align="center"
        />
        <TextBlock
          format={format}
          theme={theme}
          text={right.label}
          variant="bodyS"
          color={theme.textMuted}
          align="center"
        />
      </div>
    </div>
  );
};

// --- StepFlow Chart ---

interface StepFlowChartProps {
  format: DataSceneProps["format"];
  theme: DataSceneProps["theme"];
  data: DataPoint[];
}

const StepFlowChart: React.FC<StepFlowChartProps> = ({
  format,
  theme,
  data,
}) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        gap: sp(2),
      }}
    >
      {data.map((point, i) => (
        <React.Fragment key={i}>
          <ScaleReveal
            format={format}
            theme={theme}
            preset="smooth"
            delay={i * 6}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: sp(2),
              }}
            >
              <NumberBadge
                format={format}
                theme={theme}
                number={i + 1}
                variant={point.highlight ? "signal" : "default"}
              />
              <TextBlock
                format={format}
                theme={theme}
                text={point.label}
                variant="bodyS"
                color={point.highlight ? theme.signal : theme.textMuted}
                align="center"
                maxLines={2}
              />
            </div>
          </ScaleReveal>
          {i < data.length - 1 && (
            <ConnectorLine
              format={format}
              theme={theme}
              orientation="horizontal"
              length={sp(5)}
              color={theme.lineSubtle}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// --- Line Chart (SVG) ---

interface LineChartProps {
  format: DataSceneProps["format"];
  theme: DataSceneProps["theme"];
  data: DataPoint[];
}

const LINE_CHART_WIDTH = 400;
const LINE_CHART_HEIGHT = 160;

const LineChart: React.FC<LineChartProps> = ({ format, theme, data }) => {
  const frame = useCurrentFrame();
  const isShorts = format === "shorts";
  const chartW = isShorts ? 280 : LINE_CHART_WIDTH;
  const chartH = isShorts ? 120 : LINE_CHART_HEIGHT;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const minValue = Math.min(...data.map((d) => d.value), 0);
  const range = Math.max(maxValue - minValue, 1);

  const points = data.map((d, i) => ({
    x: (i / Math.max(data.length - 1, 1)) * chartW,
    y: chartH - ((d.value - minValue) / range) * chartH * 0.8 - chartH * 0.1,
    highlight: d.highlight ?? false,
    label: d.label,
  }));

  // Build SVG path string for @remotion/paths
  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const drawProgress = interpolate(frame, [0, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  const { strokeDasharray, strokeDashoffset } = evolvePath(drawProgress, pathD);

  return (
    <div style={{ position: "relative", width: chartW, height: chartH }}>
      <svg width={chartW} height={chartH} style={{ overflow: "visible" }}>
        {/* Grid baseline */}
        <line
          x1={0}
          y1={chartH}
          x2={chartW}
          y2={chartH}
          stroke={theme.lineSubtle}
          strokeWidth={1}
          opacity={0.4}
        />
        {/* Animated path via @remotion/paths evolvePath */}
        <path
          d={pathD}
          fill="none"
          stroke={theme.signal}
          strokeWidth={2}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Data points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={p.highlight ? 5 : 3}
            fill={p.highlight ? theme.accent : theme.signal}
          />
        ))}
      </svg>

      {/* Pulse on highlighted points */}
      {points
        .filter((p) => p.highlight)
        .map((p, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: p.x - 12,
              top: p.y - 12,
              width: 24,
              height: 24,
            }}
          >
            <PulseEmphasis format={format} theme={theme} delay={30} cycles={2}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  border: `2px solid ${theme.accent}`,
                  opacity: 0.5,
                }}
              />
            </PulseEmphasis>
          </div>
        ))}
    </div>
  );
};

// --- Matrix Chart ---

interface MatrixChartProps {
  format: DataSceneProps["format"];
  theme: DataSceneProps["theme"];
  data: DataPoint[];
  unit?: string;
}

const MatrixChart: React.FC<MatrixChartProps> = ({
  format,
  theme,
  data,
  unit,
}) => {
  const isShorts = format === "shorts";
  const cols = isShorts ? 2 : 3;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: sp(3),
        width: "100%",
      }}
    >
      {data.map((point, i) => (
        <ScaleReveal
          key={i}
          format={format}
          theme={theme}
          preset="smooth"
          delay={i * 6}
        >
          <div
            style={{
              backgroundColor: theme.surface,
              borderRadius: sp(2),
              padding: `${sp(3)}px ${sp(4)}px`,
              display: "flex",
              flexDirection: "column",
              gap: sp(1),
              borderLeft: point.highlight
                ? `2px solid ${theme.accent}`
                : `2px solid ${theme.lineSubtle}`,
            }}
          >
            <TextBlock
              format={format}
              theme={theme}
              text={`${point.value}${unit ?? ""}`}
              variant="headlineS"
              weight="bold"
              color={point.highlight ? theme.accent : theme.textStrong}
            />
            <TextBlock
              format={format}
              theme={theme}
              text={point.label}
              variant="bodyS"
              color={theme.textMuted}
              maxLines={2}
            />
          </div>
        </ScaleReveal>
      ))}
    </div>
  );
};

// --- Wildcard stagger for DataScene outer elements ---

const WILDCARD_STAGGER: Record<string, ElementBeatState> = {
  dataLabel: {
    visibility: "entering",
    entryFrame: 0,
    emphasis: false,
    motionPreset: "smooth",
  },
  chartContainer: {
    visibility: "entering",
    entryFrame: 6,
    emphasis: false,
    motionPreset: "smooth",
  },
  annotation: {
    visibility: "entering",
    entryFrame: 24,
    emphasis: false,
    motionPreset: "smooth",
  },
  sourceCredit: {
    visibility: "entering",
    entryFrame: 30,
    emphasis: false,
    motionPreset: "smooth",
  },
};

// --- Main DataScene ---

export const DataScene: React.FC<DataSceneProps> = ({
  format,
  theme,
  from,
  durationFrames,
  content,
  beats,
}) => {
  // Beat resolution
  const resolvedBeats = resolveBeats(
    { id: `data-${from}`, type: "data", beats, narrationText: "" },
    format,
  );
  const { elementStates } = useBeatTimeline(resolvedBeats, durationFrames);
  const isWildcard =
    resolvedBeats.length === 1 && resolvedBeats[0].activates.includes("*");

  const getBeatState = (key: string): ElementBeatState | undefined => {
    if (isWildcard) return WILDCARD_STAGGER[key];
    return elementStates.get(key);
  };

  const renderChart = () => {
    switch (content.chartType) {
      case "bar":
        return (
          <BarChart
            format={format}
            theme={theme}
            data={content.data}
            unit={content.unit}
          />
        );
      case "compare":
        return (
          <CompareChart
            format={format}
            theme={theme}
            data={content.data}
            unit={content.unit}
          />
        );
      case "stepFlow":
        return (
          <StepFlowChart format={format} theme={theme} data={content.data} />
        );
      case "line":
        return <LineChart format={format} theme={theme} data={content.data} />;
      case "matrix":
        return (
          <MatrixChart
            format={format}
            theme={theme}
            data={content.data}
            unit={content.unit}
          />
        );
      default:
        return (
          <BarChart
            format={format}
            theme={theme}
            data={content.data}
            unit={content.unit}
          />
        );
    }
  };

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      {/* Background layer */}
      <AbsoluteFill
        style={{
          zIndex: LAYERS.background,
          backgroundColor: theme.bg,
        }}
      />

      {/* Texture layer */}
      <AbsoluteFill
        style={{
          zIndex: LAYERS.texture,
          backgroundColor: theme.surfaceMuted,
          opacity: 0.04,
        }}
      />

      {/* Main content */}
      <div style={{ position: "absolute", inset: 0, zIndex: LAYERS.chart }}>
        <SafeArea format={format} theme={theme}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              height: "100%",
              gap: sp(5),
            }}
          >
            {/* Data label */}
            <div style={{ zIndex: LAYERS.dataLabel }}>
              <BeatElement
                elementKey="dataLabel"
                beatState={getBeatState("dataLabel")}
                format={format}
                theme={theme}
              >
                <TextBlock
                  format={format}
                  theme={theme}
                  text={content.dataLabel}
                  variant="headlineS"
                  weight="semibold"
                  color={theme.signal}
                  maxLines={2}
                />
              </BeatElement>
            </div>

            {/* Chart area — motionType="none" (single-frame snap), chart internals keep own animations */}
            <div style={{ zIndex: LAYERS.chart }}>
              <BeatElement
                elementKey="chartContainer"
                beatState={getBeatState("chartContainer")}
                format={format}
                theme={theme}
                motionType="none"
              >
                {renderChart()}
              </BeatElement>
            </div>

            {/* Annotation */}
            {content.annotation && (
              <div style={{ zIndex: LAYERS.annotation }}>
                <BeatElement
                  elementKey="annotation"
                  beatState={getBeatState("annotation")}
                  format={format}
                  theme={theme}
                >
                  <TextBlock
                    format={format}
                    theme={theme}
                    text={content.annotation}
                    variant="bodyS"
                    color={theme.textMuted}
                    maxLines={3}
                  />
                </BeatElement>
              </div>
            )}

            {/* Source credit */}
            {content.sourceCredit && (
              <div style={{ zIndex: LAYERS.sourceCredit, marginTop: "auto" }}>
                <BeatElement
                  elementKey="sourceCredit"
                  beatState={getBeatState("sourceCredit")}
                  format={format}
                  theme={theme}
                >
                  <TextBlock
                    format={format}
                    theme={theme}
                    text={content.sourceCredit}
                    variant="caption"
                    color={theme.textMuted}
                    maxLines={1}
                  />
                </BeatElement>
              </div>
            )}
          </div>
        </SafeArea>
      </div>

      {/* SubtitleLayer removed — Root HUD global layer principle. */}
    </AbsoluteFill>
  );
};

export default DataScene;
