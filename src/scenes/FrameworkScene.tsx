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
import { SafeArea } from "@/components/layout/SafeArea";
import { BeatElement } from "@/components/motion/BeatElement";
import { TextBlock } from "@/components/primitives/TextBlock";
import { useBeatTimeline } from "@/hooks/useBeatTimeline";
import { resolveBeats } from "@/pipeline/resolveBeats";

const LAYERS = {
  background: 0,
  texture: 5,
  frameworkLabel: 20,
  items: 30,
} as const;

const WILDCARD_STAGGER_BASE: Record<string, ElementBeatState> = {
  frameworkLabel: {
    visibility: "entering",
    entryFrame: 0,
    emphasis: false,
    motionPreset: "smooth",
  },
};

function getWildcardStagger(key: string, index?: number): ElementBeatState {
  if (WILDCARD_STAGGER_BASE[key]) return WILDCARD_STAGGER_BASE[key];
  return {
    visibility: "entering",
    entryFrame: (index ?? 0) * 9,
    emphasis: false,
    motionPreset: "smooth",
  };
}

interface FrameworkSceneProps extends BaseSceneProps {
  content: FrameworkContent;
}

/**
 * NumberCircle — accent-colored circle with number, scale 0→1 spring.
 */
const NumberCircle: React.FC<{
  number: number;
  accentColor: string;
  bgColor: string;
  size: number;
  startFrame: number;
  fontSize: number;
}> = ({ number, accentColor, bgColor, size, startFrame, fontSize }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = Math.max(0, frame - startFrame);
  const scale = spring({
    frame: localFrame,
    fps,
    config: motionPresets.presets.smooth.config,
    durationInFrames: 24,
  });

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: accentColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        transform: `scale(${scale})`,
        willChange: "transform",
      }}
    >
      <span
        style={{
          fontFamily: typography.fontFamily.mono,
          fontSize,
          fontWeight: typography.fontWeight.bold,
          color: bgColor,
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
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const isShorts = format === "shorts";
  const showDescriptions = !isShorts && content.showDescriptions !== false;
  const { typeScale } = useFormat(format);

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
  const { elementStates } = useBeatTimeline(resolvedBeats, durationFrames);
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

    // Find the highest-index visible item
    let highestVisible = -1;
    for (let i = 0; i < content.items.length; i++) {
      const s = getBeatState(`item-${i}`, i);
      if (s && s.visibility !== "hidden") {
        highestVisible = i;
      }
    }

    return index === highestVisible ? "current" : "past";
  };

  // Circle size
  const circleSize = isShorts ? 36 : 44;

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      {/* Background */}
      <AbsoluteFill
        style={{ zIndex: LAYERS.background, backgroundColor: theme.bg }}
      />

      {/* Texture */}
      <AbsoluteFill
        style={{
          zIndex: LAYERS.texture,
          backgroundColor: theme.surfaceMuted,
          opacity: sceneInteriorTokens.textureOpacity,
        }}
      />

      {/* Main content */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: LAYERS.frameworkLabel,
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
            {/* Framework label — headlineM, accent color */}
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

            {/* Vertical list — 1 column, top to bottom */}
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

                // Dim logic: past items dim to dimOpacity
                const dimTarget =
                  visibility === "past" ? sceneInteriorTokens.dimOpacity : 1;

                // Smooth dim transition
                let itemOpacity = 1;
                if (
                  visibility === "past" &&
                  itemState &&
                  itemState.visibility !== "hidden"
                ) {
                  // Find the entry frame of the next item to calculate dim timing
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
                    itemOpacity = interpolate(
                      dimProgress,
                      [0, 1],
                      [1, dimTarget],
                      {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                      },
                    );
                  }
                }

                return (
                  <div
                    key={item.number}
                    style={{
                      opacity: itemOpacity,
                      willChange: visibility === "past" ? "opacity" : undefined,
                    }}
                  >
                    <BeatElement
                      elementKey={itemKey}
                      beatState={itemState}
                      format={format}
                      theme={theme}
                      motionType="scale"
                      scaleFrom={0.95}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "row",
                          alignItems: "flex-start",
                          gap: sp(4),
                        }}
                      >
                        {/* Number circle — accent, scale spring */}
                        <NumberCircle
                          number={item.number}
                          accentColor={
                            visibility === "current"
                              ? theme.accent
                              : theme.surface
                          }
                          bgColor={
                            visibility === "current"
                              ? theme.bg
                              : theme.textStrong
                          }
                          size={circleSize}
                          startFrame={itemState?.entryFrame ?? 0}
                          fontSize={typeScale.label}
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
                          />

                          {showDescriptions && item.description && (
                            <TextBlock
                              format={format}
                              theme={theme}
                              text={item.description}
                              variant="bodyM"
                              color={theme.textMuted}
                              maxLines={3}
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
