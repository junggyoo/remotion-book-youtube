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
  FrameworkContent,
  ElementBeatState,
} from "@/types";
import { useFormat } from "@/design/themes/useFormat";
import { sp } from "@/design/tokens/spacing";
import { typography } from "@/design/tokens/typography";
import { sceneInteriorTokens } from "@/design/tokens/shadow";
import { motionPresets } from "@/design/tokens";
import motionPresetsData from "@/design/tokens/motion-presets.json";
import { SafeArea } from "@/components/layout/SafeArea";
import { BeatElement } from "@/components/motion/BeatElement";
import { TextBlock } from "@/components/primitives/TextBlock";
import { useBeatTimeline } from "@/hooks/useBeatTimeline";
import { useCaptions } from "@/hooks/useCaptions";
import { useNarrationSync } from "@/hooks/useNarrationSync";
import { useEmphasisGate } from "@/hooks/useEmphasisGate";
import { resolveBeats } from "@/pipeline/resolveBeats";
import { metaphorToDiagramSpec } from "@/planning/diagramSpec";
import { buildDiagramGeometry } from "@/planning/diagramGeometry";
import type { DiagramGeometry } from "@/planning/diagramGeometry";
import { AnimatedPath } from "@/components/primitives/structure/AnimatedPath";
import { NodeActivation } from "@/components/primitives/structure/NodeActivation";

const LAYERS = {
  background: 0,
  bgPulse: 2,
  texture: 5,
  diagramOverlay: 10,
  frameworkLabel: 20,
  accentIndicator: 25,
  items: 30,
} as const;

const DIAGRAM_OPACITY = 0.15;
const DIAGRAM_PATH_DRAW_DURATION = 36;
const DIAGRAM_PATH_STAGGER = 8;
const DIAGRAM_NODE_STAGGER = 8;

const WILDCARD_STAGGER_BASE: Record<string, ElementBeatState> = {
  frameworkLabel: {
    visibility: "entering",
    entryFrame: 0,
    emphasis: false,
    motionPreset: "punchy",
  },
};

function getWildcardStagger(key: string, index?: number): ElementBeatState {
  if (WILDCARD_STAGGER_BASE[key]) return WILDCARD_STAGGER_BASE[key];
  // Items start after label settles, staggered by 10f each
  return {
    visibility: "entering",
    entryFrame: 8 + (index ?? 0) * 10,
    emphasis: false,
    motionPreset: "smooth",
  };
}

interface FrameworkSceneProps extends BaseSceneProps {
  content: FrameworkContent;
}

/**
 * NumberCircle — accent-colored circle with number, punchy spring + glow on current.
 */
const NumberCircle: React.FC<{
  number: number;
  accentColor: string;
  bgColor: string;
  size: number;
  startFrame: number;
  fontSize: number;
  isCurrent: boolean;
}> = ({
  number,
  accentColor,
  bgColor,
  size,
  startFrame,
  fontSize,
  isCurrent,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = Math.max(0, frame - startFrame);
  const scale = spring({
    frame: localFrame,
    fps,
    config: motionPresetsData.presets.punchy.config,
  });

  // hex → rgb for glow
  const ar = parseInt(accentColor.slice(1, 3), 16);
  const ag = parseInt(accentColor.slice(3, 5), 16);
  const ab = parseInt(accentColor.slice(5, 7), 16);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: isCurrent ? accentColor : bgColor,
        border: isCurrent ? "none" : `2px solid ${accentColor}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        transform: `scale(${scale})`,
        boxShadow: isCurrent
          ? `0 0 ${sp(3)}px rgba(${ar},${ag},${ab},0.4)`
          : "none",
        willChange: "transform",
      }}
    >
      <span
        style={{
          fontFamily: typography.fontFamily.mono,
          fontSize,
          fontWeight: typography.fontWeight.bold,
          color: isCurrent ? bgColor : accentColor,
          lineHeight: 1,
        }}
      >
        {number}
      </span>
    </div>
  );
};

export const FrameworkScene: React.FC<FrameworkSceneProps> = ({
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
  const showDescriptions = !isShorts && content.showDescriptions !== false;
  const { typeScale } = useFormat(format);

  // P2-3: Load captions for narration sync
  const captions = useCaptions(captionsFile);

  // Beat resolution
  const resolvedBeats = resolveBeats(
    {
      id: `framework-${from}`,
      type: "framework",
      beats,
      narrationText: "",
    },
    format,
  );
  const { elementStates, activeBeat, activeChannels, isInRecoveryWindow } =
    useBeatTimeline(resolvedBeats, durationFrames, "heavy", {
      sceneType: "framework",
      format,
    });

  // P2-3: Narration sync — emphasis words glow in scene text
  const narrationSync = useNarrationSync({
    captions,
    emphasisTargets: activeBeat?.emphasisTargets ?? [],
    sceneType: "framework",
    format,
  });

  // P2-4: Gate sceneText channel
  const { isChannelActive: sceneTextActive } = useEmphasisGate({
    channelKey: "sceneText",
    sceneType: "framework",
    format,
    beatTimeline: { activeChannels, isInRecoveryWindow },
  });
  const gatedEmphasisProgress = sceneTextActive
    ? narrationSync.emphasisProgress
    : 0;

  // P2-4: Gate background channel
  const { isChannelActive: bgActive } = useEmphasisGate({
    channelKey: "background",
    sceneType: "framework",
    format,
    beatTimeline: { activeChannels, isInRecoveryWindow },
  });

  const isWildcard =
    resolvedBeats.length === 1 && resolvedBeats[0].activates.includes("*");

  const getBeatState = (
    key: string,
    index?: number,
  ): ElementBeatState | undefined => {
    if (isWildcard) return getWildcardStagger(key, index);
    return elementStates.get(key);
  };

  // Determine which item is "current" (latest entering/visible)
  const getItemVisibility = (index: number): "hidden" | "current" | "past" => {
    const state = getBeatState(`item-${index}`, index);
    if (!state) return "hidden";
    if (state.visibility === "hidden") return "hidden";

    let highestVisible = -1;
    for (let i = 0; i < content.items.length; i++) {
      const s = getBeatState(`item-${i}`, i);
      if (s && s.visibility !== "hidden") {
        highestVisible = i;
      }
    }

    return index === highestVisible ? "current" : "past";
  };

  // Check if all items are visible (completion state)
  const allVisible = content.items.every((_, i) => {
    const s = getBeatState(`item-${i}`, i);
    return s && s.visibility !== "hidden";
  });

  // Find the entry frame of the last item for completion pulse timing
  const lastItemState = getBeatState(
    `item-${content.items.length - 1}`,
    content.items.length - 1,
  );
  const completionFrame = (lastItemState?.entryFrame ?? 0) + 20;

  // --- Slow-zoom: 1.0→1.02 cinematic ---
  const slowZoom = interpolate(frame, [0, durationFrames], [1.0, 1.02], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Completion pulse: subtle radial glow when all items revealed ---
  const completionPulseRaw = allVisible
    ? interpolate(
        frame,
        [completionFrame, completionFrame + 12, completionFrame + 40],
        [0, 0.1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      )
    : 0;
  // P2-4: suppress background pulse when background channel is gated
  const completionPulse = bgActive ? completionPulseRaw : 0;

  // --- P2-1f: Diagram geometry (computed once, memoized) ---
  const diagramGeometry = React.useMemo<DiagramGeometry | null>(() => {
    if (!content.diagramHint) return null;
    const baseSpec = metaphorToDiagramSpec(content.diagramHint);
    if (!baseSpec) return null;
    const spec = {
      ...baseSpec,
      nodeCount: content.items.length,
      nodeLabels: content.items.map((item) => item.title),
    };
    const canvasW = isShorts ? 1080 : 1920;
    const canvasH = isShorts ? 1920 : 1080;
    try {
      return buildDiagramGeometry(spec, canvasW, canvasH);
    } catch {
      return null;
    }
  }, [content.diagramHint, content.items, isShorts]);

  // hex → rgb for accent
  const ar = parseInt(theme.accent.slice(1, 3), 16);
  const ag = parseInt(theme.accent.slice(3, 5), 16);
  const ab = parseInt(theme.accent.slice(5, 7), 16);

  // Circle size
  const circleSize = isShorts ? 36 : 44;

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      {/* Background */}
      <AbsoluteFill
        style={{ zIndex: LAYERS.background, backgroundColor: theme.bg }}
      />

      {/* Completion pulse — radial glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: LAYERS.bgPulse,
          background: `radial-gradient(ellipse 50% 60% at 50% 50%, rgba(${ar},${ag},${ab},${completionPulse}) 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* Texture */}
      <AbsoluteFill
        style={{
          zIndex: LAYERS.texture,
          backgroundColor: theme.surfaceMuted,
          opacity: sceneInteriorTokens.textureOpacity,
        }}
      />

      {/* P2-1f: Diagram background overlay */}
      {diagramGeometry && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: LAYERS.diagramOverlay,
            opacity: DIAGRAM_OPACITY,
            pointerEvents: "none",
          }}
        >
          {/* Animated paths (connections) */}
          {diagramGeometry.connections.map((conn, i) => (
            <AnimatedPath
              key={`diagram-path-${i}`}
              pathData={conn.pathData}
              startFrame={i * DIAGRAM_PATH_STAGGER}
              drawDuration={DIAGRAM_PATH_DRAW_DURATION}
              strokeColor={theme.accent}
              strokeWidth={2}
              arrowHead
              arrowColor={theme.accent}
              easing="easeOut"
              width={isShorts ? 1080 : 1920}
              height={isShorts ? 1920 : 1080}
            />
          ))}

          {/* Node activation */}
          <NodeActivation
            nodes={diagramGeometry.nodes.map((n) => ({
              label: n.label,
              x: n.cx,
              y: n.cy,
            }))}
            activationOrder={diagramGeometry.nodes.map((_, i) => i)}
            staggerDelay={DIAGRAM_NODE_STAGGER}
            startFrame={0}
            mutedColor={theme.lineSubtle}
            activeColor={theme.accent}
            activationEffects={{
              fillTransition: true,
              scalePulse: true,
              glowRing: false,
            }}
            format={format}
            theme={theme}
            nodeSize={isShorts ? 32 : 40}
            width={isShorts ? 1080 : 1920}
            height={isShorts ? 1920 : 1080}
          />
        </div>
      )}

      {/* Main content — wrapped in slow-zoom */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: LAYERS.frameworkLabel,
          transform: `scale(${slowZoom})`,
          transformOrigin: "50% 45%",
          willChange: "transform",
        }}
      >
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
            {/* Framework label — punchy entrance */}
            <div style={{ zIndex: LAYERS.frameworkLabel }}>
              <BeatElement
                elementKey="frameworkLabel"
                beatState={getBeatState("frameworkLabel")}
                format={format}
                theme={theme}
              >
                <TextBlock
                  format={format}
                  theme={theme}
                  text={content.frameworkLabel}
                  variant="headlineM"
                  color={theme.accent}
                />
              </BeatElement>
            </div>

            {/* Vertical list — slide-in items with dim logic */}
            <div
              style={{
                zIndex: LAYERS.items,
                display: "flex",
                flexDirection: "column",
                gap: sp(5),
              }}
            >
              {content.items.map((item, index) => {
                const itemKey = `item-${index}`;
                const visibility = getItemVisibility(index);
                const itemState = getBeatState(itemKey, index);

                // --- Slide-in: translateX(-30→0) for entering items ---
                const entryFrame = itemState?.entryFrame ?? 0;
                const slideProgress = spring({
                  frame: Math.max(0, frame - entryFrame),
                  fps,
                  config: motionPresetsData.presets.smooth.config,
                });
                const slideX = interpolate(slideProgress, [0, 1], [-30, 0]);
                const slideOpacity = interpolate(slideProgress, [0, 1], [0, 1]);

                // --- Dim logic: past items fade + shift right + slight blur ---
                let dimOpacity = 1;
                let dimShiftX = 0;
                let dimBlur = 0;

                if (
                  visibility === "past" &&
                  itemState &&
                  itemState.visibility !== "hidden"
                ) {
                  const nextState = getBeatState(
                    `item-${index + 1}`,
                    index + 1,
                  );
                  if (nextState && nextState.entryFrame > 0) {
                    const dimProgress = spring({
                      frame: Math.max(0, frame - nextState.entryFrame),
                      fps,
                      config: motionPresets.presets.smooth.config,
                      durationInFrames: 18,
                    });
                    dimOpacity = interpolate(
                      dimProgress,
                      [0, 1],
                      [1, sceneInteriorTokens.dimOpacity],
                    );
                    dimShiftX = interpolate(dimProgress, [0, 1], [0, 4]);
                    dimBlur = interpolate(dimProgress, [0, 1], [0, 1.5]);
                  }
                }

                // --- Accent indicator bar for current item ---
                const showAccentBar = visibility === "current";
                const accentBarProgress = showAccentBar
                  ? spring({
                      frame: Math.max(0, frame - entryFrame - 4),
                      fps,
                      config: motionPresetsData.presets.snappy.config,
                    })
                  : 0;

                return (
                  <div
                    key={item.number}
                    style={{
                      opacity:
                        visibility === "hidden" ? 0 : dimOpacity * slideOpacity,
                      transform: `translateX(${slideX + dimShiftX}px)`,
                      filter: dimBlur > 0 ? `blur(${dimBlur}px)` : undefined,
                      willChange: "opacity, transform",
                      position: "relative",
                    }}
                  >
                    {/* Accent indicator — vertical bar left of current item */}
                    {showAccentBar && (
                      <div
                        style={{
                          position: "absolute",
                          left: -sp(3),
                          top: "10%",
                          width: 3,
                          height: "80%",
                          backgroundColor: theme.accent,
                          borderRadius: 2,
                          transform: `scaleY(${accentBarProgress})`,
                          transformOrigin: "center top",
                          boxShadow: `0 0 ${sp(2)}px rgba(${ar},${ag},${ab},0.3)`,
                        }}
                      />
                    )}

                    <BeatElement
                      elementKey={itemKey}
                      beatState={itemState}
                      format={format}
                      theme={theme}
                      motionType="none"
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "row",
                          alignItems: "flex-start",
                          gap: sp(4),
                        }}
                      >
                        {/* Number circle — punchy spring + glow on current */}
                        <NumberCircle
                          number={item.number}
                          accentColor={theme.accent}
                          bgColor={theme.bg}
                          size={circleSize}
                          startFrame={entryFrame}
                          fontSize={typeScale.label}
                          isCurrent={visibility === "current"}
                        />

                        {/* Title + description */}
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: sp(2),
                            flex: 1,
                          }}
                        >
                          <TextBlock
                            format={format}
                            theme={theme}
                            text={item.title}
                            variant="headlineM"
                            weight="bold"
                            emphasisWords={narrationSync.activeEmphasisTargets}
                            emphasisProgress={gatedEmphasisProgress}
                          />

                          {showDescriptions && item.description && (
                            <TextBlock
                              format={format}
                              theme={theme}
                              text={item.description}
                              variant="bodyM"
                              color={theme.textMuted}
                              maxLines={3}
                              emphasisWords={
                                narrationSync.activeEmphasisTargets
                              }
                              emphasisProgress={gatedEmphasisProgress}
                            />
                          )}
                        </div>
                      </div>
                    </BeatElement>
                  </div>
                );
              })}
            </div>
          </div>
        </SafeArea>
      </div>
    </AbsoluteFill>
  );
};

export default FrameworkScene;
