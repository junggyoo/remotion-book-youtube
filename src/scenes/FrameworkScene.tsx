import React from "react";
import { AbsoluteFill } from "remotion";
import type {
  BaseSceneProps,
  FrameworkContent,
  ElementBeatState,
} from "@/types";
import { sp } from "@/design/tokens/spacing";
import { SafeArea } from "@/components/layout/SafeArea";
import { BeatElement } from "@/components/motion/BeatElement";
import { TextBlock } from "@/components/primitives/TextBlock";
import { NumberBadge } from "@/components/primitives/NumberBadge";
import { ConnectorLine } from "@/components/primitives/ConnectorLine";
import { useBeatTimeline } from "@/hooks/useBeatTimeline";
import { resolveBeats } from "@/pipeline/resolveBeats";

// zIndex layers from scene-catalog.json → framework
const LAYERS = {
  background: 0,
  texture: 5,
  frameworkLabel: 20,
  connectors: 25,
  items: 30,
  emphasis: 40,
} as const;

/**
 * Wildcard stagger states — preserve existing animation delays
 * for scenes without explicit beats.
 * frameworkLabel: delay=0 (ArchitecturalReveal)
 * items: delay=index*6 (ScaleReveal)
 */
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
  // items: delay = index * 6
  return {
    visibility: "entering",
    entryFrame: (index ?? 0) * 6,
    emphasis: false,
    motionPreset: "smooth",
  };
}

interface FrameworkSceneProps extends BaseSceneProps {
  content: FrameworkContent;
}

export const FrameworkScene: React.FC<FrameworkSceneProps> = ({
  format,
  theme,
  from,
  durationFrames,
  content,
  beats,
}) => {
  const isShorts = format === "shorts";
  const showDescriptions = !isShorts && content.showDescriptions !== false;
  const showConnectors = content.showConnectors === true;
  const columns = isShorts ? 1 : 2;

  // Beat resolution: explicit beats or implicit single beat (backward compat)
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
            {/* Framework label */}
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
                  variant="headlineS"
                  color={theme.signal}
                />
              </BeatElement>
            </div>

            {/* Items grid */}
            <div
              style={{
                zIndex: LAYERS.items,
                display: "grid",
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
                gap: sp(5),
              }}
            >
              {content.items.map((item, index) => {
                const itemKey = `item-${index}`;
                return (
                  <React.Fragment key={item.number}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: sp(3),
                      }}
                    >
                      <BeatElement
                        elementKey={itemKey}
                        beatState={getBeatState(itemKey, index)}
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
                          {/* Number badge */}
                          <div style={{ flexShrink: 0, paddingTop: 2 }}>
                            <NumberBadge
                              format={format}
                              theme={theme}
                              number={item.number}
                              variant="accent"
                            />
                          </div>

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
                              variant="bodyL"
                              weight="bold"
                            />

                            {showDescriptions && item.description && (
                              <TextBlock
                                format={format}
                                theme={theme}
                                text={item.description}
                                variant="bodyS"
                                color={theme.textMuted}
                                maxLines={3}
                              />
                            )}
                          </div>
                        </div>
                      </BeatElement>
                    </div>

                    {/* Horizontal connector between items (same row, not last in row) */}
                    {showConnectors &&
                      !isShorts &&
                      columns === 2 &&
                      index % 2 === 0 &&
                      index + 1 < content.items.length && (
                        <div
                          style={{
                            position: "absolute",
                            zIndex: LAYERS.connectors,
                            display: "none",
                          }}
                        />
                      )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Horizontal dotted connectors between grid rows */}
            {showConnectors && (
              <div
                style={{
                  zIndex: LAYERS.connectors,
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: sp(4),
                }}
              >
                {Array.from({
                  length: Math.max(0, content.items.length - 1),
                }).map((_, i) => (
                  <ConnectorLine
                    key={i}
                    format={format}
                    theme={theme}
                    orientation="horizontal"
                    length={sp(6)}
                    dotted
                  />
                ))}
              </div>
            )}
          </div>
        </SafeArea>
      </div>

      {/* SubtitleLayer removed — Root HUD global layer principle.
          Subtitles are rendered by LongformComposition's CaptionLayer/SubtitleLayerWrapper. */}
    </AbsoluteFill>
  );
};

export default FrameworkScene;
