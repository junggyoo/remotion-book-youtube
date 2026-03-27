import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import type {
  BaseSceneProps,
  CompareContrastContent,
  ElementBeatState,
} from "@/types";
import { sp } from "@/design/tokens/spacing";
import { typography } from "@/design/tokens/typography";
import { shadow, sceneInteriorTokens } from "@/design/tokens/shadow";
import { applyPreset } from "@/design/tokens/motion";
import { useFormat } from "@/design/themes/useFormat";
import { SafeArea } from "@/components/layout/SafeArea";
import { BeatElement } from "@/components/motion/BeatElement";
import { TextBlock } from "@/components/primitives/TextBlock";
import { LabelChip } from "@/components/primitives/LabelChip";
import { useBeatTimeline } from "@/hooks/useBeatTimeline";
import { resolveBeats } from "@/pipeline/resolveBeats";

// zIndex layers from scene-catalog.json → compareContrast
const LAYERS = {
  background: 0,
  texture: 5,
  leftPanel: 20,
  rightPanel: 20,
  divider: 30,
  labels: 35,
  emphasis: 40,
} as const;

/** SVG divider height (longform) / width (shorts) */
const DIVIDER_LENGTH = 400;
const DIVIDER_STROKE_WIDTH = 2;

interface CompareContrastSceneProps extends BaseSceneProps {
  content: CompareContrastContent;
}

/**
 * Wildcard stagger — sequential reveal even without explicit beats.
 * Left first → connector → right (always left-first for wildcard).
 */
function buildWildcardStagger(
  revealOrder: "simultaneous" | "left-first" | "right-first",
): Record<string, ElementBeatState> {
  const leftDelay = revealOrder === "right-first" ? 18 : 0;
  const rightDelay =
    revealOrder === "left-first" ? 18 : revealOrder === "simultaneous" ? 18 : 0;
  const connectorDelay = Math.max(leftDelay, rightDelay) + 15;

  return {
    leftPanel: {
      visibility: "entering",
      entryFrame: leftDelay,
      emphasis: false,
      motionPreset: "smooth",
    },
    rightPanel: {
      visibility: "entering",
      entryFrame: rightDelay,
      emphasis: false,
      motionPreset: "smooth",
    },
    connector: {
      visibility: "entering",
      entryFrame: connectorDelay,
      emphasis: false,
      motionPreset: "smooth",
    },
  };
}

/**
 * Check if a panel is activated (entering, visible, or emphasized).
 */
function isActivated(state: ElementBeatState | undefined): boolean {
  if (!state) return false;
  return (
    state.visibility === "entering" ||
    state.visibility === "visible" ||
    state.visibility === "emphasized"
  );
}

/**
 * SVG Divider with draw-on animation (top→bottom for vertical, left→right for horizontal).
 */
const DrawOnDivider: React.FC<{
  orientation: "vertical" | "horizontal";
  color: string;
  progress: number;
}> = ({ orientation, color, progress }) => {
  const length = DIVIDER_LENGTH;
  const dashOffset = interpolate(progress, [0, 1], [length, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (orientation === "vertical") {
    return (
      <svg
        width={DIVIDER_STROKE_WIDTH}
        height={length}
        viewBox={`0 0 ${DIVIDER_STROKE_WIDTH} ${length}`}
        style={{ overflow: "visible" }}
      >
        <line
          x1={DIVIDER_STROKE_WIDTH / 2}
          y1={0}
          x2={DIVIDER_STROKE_WIDTH / 2}
          y2={length}
          stroke={color}
          strokeWidth={DIVIDER_STROKE_WIDTH}
          strokeDasharray={length}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      width={length}
      height={DIVIDER_STROKE_WIDTH}
      viewBox={`0 0 ${length} ${DIVIDER_STROKE_WIDTH}`}
      style={{ overflow: "visible" }}
    >
      <line
        x1={0}
        y1={DIVIDER_STROKE_WIDTH / 2}
        x2={length}
        y2={DIVIDER_STROKE_WIDTH / 2}
        stroke={color}
        strokeWidth={DIVIDER_STROKE_WIDTH}
        strokeDasharray={length}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
      />
    </svg>
  );
};

export const CompareContrastScene: React.FC<CompareContrastSceneProps> = ({
  format,
  theme,
  from,
  durationFrames,
  content,
  beats,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const isShorts = format === "shorts";
  const { typeScale } = useFormat(format);
  const revealOrder = content.revealOrder ?? "simultaneous";

  // Beat resolution
  const resolvedBeats = resolveBeats(
    {
      id: `compareContrast-${from}`,
      type: "compareContrast",
      beats,
      narrationText: "",
    },
    format,
  );
  const { elementStates, activeBeat } = useBeatTimeline(
    resolvedBeats,
    durationFrames,
  );
  const isWildcard =
    resolvedBeats.length === 1 && resolvedBeats[0].activates.includes("*");

  const wildcardStagger = buildWildcardStagger(revealOrder);

  const getBeatState = (key: string): ElementBeatState | undefined => {
    if (isWildcard) return wildcardStagger[key];
    return elementStates.get(key);
  };

  // --- Dim / emphasis logic (frame-interpolated, no CSS transitions) ---
  const rightState = getBeatState("rightPanel");
  const connectorState = getBeatState("connector");
  const rightIsActive = isActivated(rightState);

  // Determine target opacity for left panel based on beat phase
  const isRecapBeat = activeBeat?.transition === "emphasis";
  const leftTargetOpacity = rightIsActive
    ? isRecapBeat
      ? 0.7 // beat 4: both visible, right emphasized
      : sceneInteriorTokens.dimOpacity // beat 3: left dimmed
    : 1; // beat 1-2: full opacity (or hidden via BeatElement)

  // Smooth frame-interpolated dim (no CSS transition — Remotion renders static frames)
  const rightEntry = rightState?.entryFrame ?? 0;
  const dimProgress = rightIsActive
    ? applyPreset(
        "smooth",
        Math.max(0, frame - rightEntry),
        fps,
        durationFrames,
      )
    : 0;
  const leftFinalOpacity = interpolate(
    dimProgress,
    [0, 1],
    [1, leftTargetOpacity],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  // --- Divider draw-on progress ---
  const connectorEntry = connectorState?.entryFrame ?? 0;
  const dividerProgress = connectorState
    ? applyPreset(
        "smooth",
        Math.max(0, frame - connectorEntry),
        fps,
        durationFrames,
      )
    : 0;

  // Tag label variant mapping
  const leftTagVariant = ((): "default" | "accent" | "signal" => {
    if (!content.leftTag) return "default";
    if (
      content.leftTag === "wrong" ||
      content.leftTag === "myth" ||
      content.leftTag === "before"
    )
      return "accent";
    return "default";
  })();

  const rightTagVariant = ((): "default" | "accent" | "signal" => {
    if (!content.rightTag) return "signal";
    if (
      content.rightTag === "fact" ||
      content.rightTag === "right" ||
      content.rightTag === "after"
    )
      return "signal";
    return "default";
  })();

  const panelTextShadow = shadow.float;

  const leftPanel = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: sp(5),
        flex: 1,
        paddingRight: isShorts ? 0 : sp(6),
        paddingBottom: isShorts ? sp(4) : 0,
        textShadow: panelTextShadow,
      }}
    >
      {content.leftTag && (
        <div style={{ zIndex: LAYERS.labels }}>
          <LabelChip
            format={format}
            theme={theme}
            label={content.leftTag}
            variant={leftTagVariant}
          />
        </div>
      )}
      <div style={{ zIndex: LAYERS.labels, marginBottom: sp(2) }}>
        <LabelChip
          format={format}
          theme={theme}
          label={content.leftLabel}
          variant="accent"
        />
      </div>
      <TextBlock
        format={format}
        theme={theme}
        text={content.leftContent}
        variant="bodyL"
        maxLines={6}
      />
    </div>
  );

  const rightPanel = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: sp(5),
        flex: 1,
        paddingLeft: isShorts ? 0 : sp(6),
        paddingTop: isShorts ? sp(4) : 0,
        textShadow: panelTextShadow,
      }}
    >
      {content.rightTag && (
        <div style={{ zIndex: LAYERS.labels }}>
          <LabelChip
            format={format}
            theme={theme}
            label={content.rightTag}
            variant={rightTagVariant}
          />
        </div>
      )}
      <div style={{ zIndex: LAYERS.labels, marginBottom: sp(2) }}>
        <LabelChip
          format={format}
          theme={theme}
          label={content.rightLabel}
          variant="signal"
        />
      </div>
      <TextBlock
        format={format}
        theme={theme}
        text={content.rightContent}
        variant="bodyL"
        maxLines={6}
      />
    </div>
  );

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
          opacity: sceneInteriorTokens.textureOpacity,
        }}
      />

      {/* Main content */}
      <div style={{ position: "absolute", inset: 0, zIndex: LAYERS.leftPanel }}>
        <SafeArea format={format} theme={theme}>
          <div
            style={{
              display: "flex",
              flexDirection: isShorts ? "column" : "row",
              alignItems: isShorts ? "stretch" : "center",
              justifyContent: "center",
              height: "100%",
              position: "relative",
            }}
          >
            {/* Left panel — dims when right panel enters */}
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                opacity: leftFinalOpacity,
              }}
            >
              <BeatElement
                elementKey="leftPanel"
                beatState={getBeatState("leftPanel")}
                format={format}
                theme={theme}
                motionType="slide"
                slideDirection="left"
              >
                {leftPanel}
              </BeatElement>
            </div>

            {/* Center SVG divider with draw-on */}
            <div
              style={{
                zIndex: LAYERS.divider,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                position: "relative",
                padding: isShorts ? `${sp(3)}px 0` : `0 ${sp(3)}px`,
              }}
            >
              {isActivated(connectorState) && (
                <DrawOnDivider
                  orientation={isShorts ? "horizontal" : "vertical"}
                  color={theme.lineSubtle}
                  progress={dividerProgress}
                />
              )}
              {content.showConnector &&
                !isShorts &&
                isActivated(connectorState) && (
                  <div
                    style={{
                      position: "absolute",
                      fontFamily: typography.fontFamily.sans,
                      fontSize: typeScale.caption,
                      fontWeight: typography.fontWeight.bold,
                      color: theme.textMuted,
                      letterSpacing: typography.tracking.wide,
                      backgroundColor: theme.bg,
                      padding: `${sp(2)}px ${sp(3)}px`,
                      opacity: dividerProgress,
                    }}
                  >
                    VS
                  </div>
                )}
            </div>

            {/* Right panel */}
            <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
              <BeatElement
                elementKey="rightPanel"
                beatState={getBeatState("rightPanel")}
                format={format}
                theme={theme}
                motionType="slide"
                slideDirection="right"
              >
                {rightPanel}
              </BeatElement>
            </div>
          </div>
        </SafeArea>
      </div>
    </AbsoluteFill>
  );
};

export default CompareContrastScene;
