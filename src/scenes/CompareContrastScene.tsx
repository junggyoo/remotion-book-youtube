import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
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
import motionPresetsData from "@/design/tokens/motion-presets.json";
import { useFormat } from "@/design/themes/useFormat";
import { SafeArea } from "@/components/layout/SafeArea";
import { BeatElement } from "@/components/motion/BeatElement";
import { TextBlock } from "@/components/primitives/TextBlock";
import { LabelChip } from "@/components/primitives/LabelChip";
import { useBeatTimeline } from "@/hooks/useBeatTimeline";
import { useCaptions } from "@/hooks/useCaptions";
import { useNarrationSync } from "@/hooks/useNarrationSync";
import { useEmphasisGate } from "@/hooks/useEmphasisGate";
import { resolveBeats } from "@/pipeline/resolveBeats";

// zIndex layers
const LAYERS = {
  background: 0,
  bgGlow: 2,
  texture: 5,
  leftPanel: 20,
  rightPanel: 20,
  divider: 30,
  labels: 35,
  emphasis: 40,
} as const;

const DIVIDER_STROKE_WIDTH = 2;

interface CompareContrastSceneProps extends BaseSceneProps {
  content: CompareContrastContent;
}

/**
 * Wildcard stagger — left-first → connector → right with enhanced timing.
 */
function buildWildcardStagger(
  revealOrder: "simultaneous" | "left-first" | "right-first",
): Record<string, ElementBeatState> {
  const leftDelay = revealOrder === "right-first" ? 20 : 0;
  const rightDelay =
    revealOrder === "left-first" ? 20 : revealOrder === "simultaneous" ? 20 : 0;
  const connectorDelay = Math.max(leftDelay, rightDelay) + 12;

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
 * SVG Divider with draw-on animation + accent glow.
 */
const DrawOnDivider: React.FC<{
  orientation: "vertical" | "horizontal";
  color: string;
  glowColor: string;
  progress: number;
  length: number;
}> = ({ orientation, color, glowColor, progress, length }) => {
  const dashOffset = interpolate(progress, [0, 1], [length, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const glowOpacity = interpolate(progress, [0.3, 0.7, 1], [0, 0.4, 0.15], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (orientation === "vertical") {
    return (
      <svg
        width={DIVIDER_STROKE_WIDTH + 8}
        height={length}
        viewBox={`-4 0 ${DIVIDER_STROKE_WIDTH + 8} ${length}`}
        style={{ overflow: "visible" }}
      >
        {/* Glow line */}
        <line
          x1={DIVIDER_STROKE_WIDTH / 2}
          y1={0}
          x2={DIVIDER_STROKE_WIDTH / 2}
          y2={length}
          stroke={glowColor}
          strokeWidth={6}
          strokeDasharray={length}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          opacity={glowOpacity}
        />
        {/* Main line */}
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
      height={DIVIDER_STROKE_WIDTH + 8}
      viewBox={`0 -4 ${length} ${DIVIDER_STROKE_WIDTH + 8}`}
      style={{ overflow: "visible" }}
    >
      {/* Glow line */}
      <line
        x1={0}
        y1={DIVIDER_STROKE_WIDTH / 2}
        x2={length}
        y2={DIVIDER_STROKE_WIDTH / 2}
        stroke={glowColor}
        strokeWidth={6}
        strokeDasharray={length}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        opacity={glowOpacity}
      />
      {/* Main line */}
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
  captionsFile,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const isShorts = format === "shorts";
  const { typeScale, safeArea } = useFormat(format);
  const revealOrder = content.revealOrder ?? "simultaneous";

  // Responsive divider length based on safe area
  const dividerLength = Math.min(
    400,
    Math.round(safeArea.contentColumnWidth * 0.6),
  );

  // P2-3: Load captions for narration sync
  const captions = useCaptions(captionsFile);

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
  const { elementStates, activeBeat, activeChannels, isInRecoveryWindow } =
    useBeatTimeline(resolvedBeats, durationFrames, "heavy", {
      sceneType: "compareContrast",
      format,
    });
  const isWildcard =
    resolvedBeats.length === 1 && resolvedBeats[0].activates.includes("*");

  const wildcardStagger = buildWildcardStagger(revealOrder);

  // P2-3: Narration sync — emphasis words drive label tint
  const narrationSync = useNarrationSync({
    captions,
    emphasisTargets: activeBeat?.emphasisTargets ?? [],
    sceneType: "compareContrast",
    format,
  });

  // P2-4: Gate sceneText channel
  const { isChannelActive: sceneTextActive } = useEmphasisGate({
    channelKey: "sceneText",
    sceneType: "compareContrast",
    format,
    beatTimeline: { activeChannels, isInRecoveryWindow },
  });
  const gatedEmphasisProgress = sceneTextActive
    ? narrationSync.emphasisProgress
    : 0;

  // P2-4: Gate background channel
  const { isChannelActive: bgActive } = useEmphasisGate({
    channelKey: "background",
    sceneType: "compareContrast",
    format,
    beatTimeline: { activeChannels, isInRecoveryWindow },
  });

  const getBeatState = (key: string): ElementBeatState | undefined => {
    if (isWildcard) return wildcardStagger[key];
    return elementStates.get(key);
  };

  // --- Dim / emphasis logic ---
  const leftState = getBeatState("leftPanel");
  const rightState = getBeatState("rightPanel");
  const connectorState = getBeatState("connector");
  const rightIsActive = isActivated(rightState);
  const leftIsActive = isActivated(leftState);

  // Determine target opacity for left panel
  const isRecapBeat = activeBeat?.transition === "emphasis";
  const leftTargetOpacity = rightIsActive
    ? isRecapBeat
      ? 0.7
      : sceneInteriorTokens.dimOpacity
    : 1;

  // Smooth dim with blur for left panel
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
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const leftDimBlur = interpolate(dimProgress, [0, 1], [0, 2]);

  // --- Left panel entrance blur ---
  const leftEntry = leftState?.entryFrame ?? 0;
  const leftEntranceProgress = spring({
    frame: Math.max(0, frame - leftEntry),
    fps,
    config: motionPresetsData.presets.smooth.config,
  });
  const leftEntranceBlur = interpolate(leftEntranceProgress, [0, 1], [6, 0]);

  // --- Right panel entrance blur ---
  const rightEntranceProgress = spring({
    frame: Math.max(0, frame - rightEntry),
    fps,
    config: motionPresetsData.presets.smooth.config,
  });
  const rightEntranceBlur = interpolate(rightEntranceProgress, [0, 1], [6, 0]);

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

  // --- VS badge: punchy scale + glow ---
  const vsBadgeProgress = spring({
    frame: Math.max(0, frame - connectorEntry - 6),
    fps,
    config: motionPresetsData.presets.punchy.config,
  });

  // --- Slow-zoom: 1.0→1.02 cinematic ---
  const slowZoom = interpolate(frame, [0, durationFrames], [1.0, 1.02], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Right panel accent glow on entrance ---
  const rightGlowProgressRaw = rightIsActive
    ? interpolate(
        frame,
        [rightEntry, rightEntry + 12, rightEntry + 40],
        [0, 0.12, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      )
    : 0;
  // P2-4: Gate background glow and add narration-driven micro glow
  const narrationBgGlow = bgActive ? gatedEmphasisProgress * 0.04 : 0;
  const rightGlowProgress = bgActive
    ? rightGlowProgressRaw + narrationBgGlow
    : 0;

  // P2-3: Divider accent glow driven by emphasis (micro glow on divider)
  const dividerEmphasisGlow = bgActive ? gatedEmphasisProgress * 0.3 : 0;

  // hex → rgb for glow
  const ar = parseInt(theme.accent.slice(1, 3), 16);
  const ag = parseInt(theme.accent.slice(3, 5), 16);
  const ab = parseInt(theme.accent.slice(5, 7), 16);

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

  // P2-3: Active side label emphasis — signal color tint on emphasis
  const leftIsEmphasisTarget = leftIsActive && !rightIsActive;
  const rightIsEmphasisTarget = rightIsActive;
  const leftLabelScale = leftIsEmphasisTarget
    ? 1.0 + gatedEmphasisProgress * 0.03
    : 1.0;
  const rightLabelScale = rightIsEmphasisTarget
    ? 1.0 + gatedEmphasisProgress * 0.03
    : 1.0;

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
      <div
        style={{
          zIndex: LAYERS.labels,
          marginBottom: sp(2),
          transform: `scale(${leftLabelScale})`,
          transformOrigin: "left center",
          willChange:
            leftIsEmphasisTarget && gatedEmphasisProgress > 0
              ? "transform"
              : undefined,
        }}
      >
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
        emphasisWords={narrationSync.activeEmphasisTargets}
        emphasisProgress={leftIsEmphasisTarget ? gatedEmphasisProgress : 0}
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
      <div
        style={{
          zIndex: LAYERS.labels,
          marginBottom: sp(2),
          transform: `scale(${rightLabelScale})`,
          transformOrigin: "left center",
          willChange:
            rightIsEmphasisTarget && gatedEmphasisProgress > 0
              ? "transform"
              : undefined,
        }}
      >
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
        emphasisWords={narrationSync.activeEmphasisTargets}
        emphasisProgress={rightIsEmphasisTarget ? gatedEmphasisProgress : 0}
      />
    </div>
  );

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      {/* Background layer */}
      <AbsoluteFill
        style={{ zIndex: LAYERS.background, backgroundColor: theme.bg }}
      />

      {/* Right panel accent glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: LAYERS.bgGlow,
          background: isShorts
            ? `radial-gradient(ellipse 80% 40% at 50% 70%, rgba(${ar},${ag},${ab},${rightGlowProgress}) 0%, transparent 70%)`
            : `radial-gradient(ellipse 40% 60% at 75% 50%, rgba(${ar},${ag},${ab},${rightGlowProgress}) 0%, transparent 70%)`,
          pointerEvents: "none",
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

      {/* Main content — wrapped in slow-zoom */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: LAYERS.leftPanel,
          transform: `scale(${slowZoom})`,
          transformOrigin: "50% 50%",
          willChange: "transform",
        }}
      >
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
            {/* Left panel — dims + blurs when right panel enters */}
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                opacity: leftIsActive ? leftFinalOpacity : 0,
                filter:
                  leftDimBlur > 0
                    ? `blur(${leftDimBlur}px)`
                    : leftEntranceBlur > 0
                      ? `blur(${leftEntranceBlur}px)`
                      : undefined,
                willChange: "opacity, filter",
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

            {/* Center SVG divider with draw-on + glow */}
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
                  glowColor={`rgba(${ar},${ag},${ab},${1 + dividerEmphasisGlow})`}
                  progress={dividerProgress}
                  length={dividerLength}
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
                      transform: `scale(${vsBadgeProgress})`,
                      opacity: interpolate(vsBadgeProgress, [0, 1], [0, 1]),
                      boxShadow: `0 0 ${sp(2)}px rgba(${ar},${ag},${ab},${interpolate(vsBadgeProgress, [0.5, 1], [0.3, 0.08], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})`,
                      borderRadius: sp(1),
                    }}
                  >
                    VS
                  </div>
                )}
            </div>

            {/* Right panel — entrance blur */}
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                filter:
                  rightEntranceBlur > 0.1
                    ? `blur(${rightEntranceBlur}px)`
                    : undefined,
                willChange: "filter",
              }}
            >
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
