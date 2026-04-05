import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import type {
  BaseSceneProps,
  ListRevealContent,
  ElementBeatState,
} from "@/types";
import { sp } from "@/design/tokens/spacing";
import { SafeArea } from "@/components/layout/SafeArea";
import { BeatElement } from "@/components/motion/BeatElement";
import { TextBlock } from "@/components/primitives/TextBlock";
import { LabelChip } from "@/components/primitives/LabelChip";
import { NumberBadge } from "@/components/primitives/NumberBadge";
import { useBeatTimeline } from "@/hooks/useBeatTimeline";
import { useCaptions } from "@/hooks/useCaptions";
import { useNarrationSync } from "@/hooks/useNarrationSync";
import { useEmphasisGate } from "@/hooks/useEmphasisGate";
import { resolveBeats } from "@/pipeline/resolveBeats";

// zIndex layers
const LAYERS = {
  background: 0,
  texture: 5,
  listLabel: 20,
  items: 30,
  emphasis: 40,
} as const;

const MAX_ITEMS_LONGFORM = 7;
const MAX_ITEMS_SHORTS = 5;

const WILDCARD_STAGGER_BASE: Record<string, ElementBeatState> = {
  listLabel: {
    visibility: "entering",
    entryFrame: 0,
    emphasis: false,
    motionPreset: "smooth",
  },
};

function getWildcardStagger(
  key: string,
  index: number,
  staggerDelay: number,
): ElementBeatState {
  if (WILDCARD_STAGGER_BASE[key]) return WILDCARD_STAGGER_BASE[key];
  return {
    visibility: "entering",
    entryFrame: index * staggerDelay,
    emphasis: false,
    motionPreset: "smooth",
  };
}

interface ListRevealSceneProps extends BaseSceneProps {
  content: ListRevealContent;
}

export const ListRevealScene: React.FC<ListRevealSceneProps> = ({
  format,
  theme,
  from,
  durationFrames,
  content,
  beats,
  captionsFile,
}) => {
  const frame = useCurrentFrame();
  const isShorts = format === "shorts";
  const revealStyle = content.revealStyle ?? "stagger";
  const showNumbers = content.showNumbers ?? false;

  const maxItems = isShorts ? MAX_ITEMS_SHORTS : MAX_ITEMS_LONGFORM;
  const visibleItems = content.items.slice(0, maxItems);

  const staggerDelay = revealStyle === "cascade" ? 4 : 6;

  // Beat resolution
  const resolvedBeats = resolveBeats(
    { id: `listReveal-${from}`, type: "listReveal", beats, narrationText: "" },
    format,
  );
  const { elementStates, activeBeat, activeChannels, isInRecoveryWindow } =
    useBeatTimeline(resolvedBeats, durationFrames, "smooth", {
      sceneType: "listReveal",
      format,
    });
  const isWildcard =
    resolvedBeats.length === 1 && resolvedBeats[0].activates.includes("*");

  // P2-3: Narration sync — emphasis words glow in scene text
  const captions = useCaptions(captionsFile);
  const narrationSync = useNarrationSync({
    captions,
    emphasisTargets: activeBeat?.emphasisTargets ?? [],
    sceneType: "listReveal",
    format,
  });

  // P2-4: Gate sceneText channel
  const { isChannelActive: sceneTextActive } = useEmphasisGate({
    channelKey: "sceneText",
    sceneType: "listReveal",
    format,
    beatTimeline: { activeChannels, isInRecoveryWindow },
  });
  const gatedEmphasisProgress = sceneTextActive
    ? narrationSync.emphasisProgress
    : 0;

  const getBeatState = (
    key: string,
    index: number,
  ): ElementBeatState | undefined => {
    if (isWildcard) return getWildcardStagger(key, index, staggerDelay);
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
      <div style={{ position: "absolute", inset: 0, zIndex: LAYERS.listLabel }}>
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
            {/* List label */}
            <div style={{ zIndex: LAYERS.listLabel }}>
              <BeatElement
                elementKey="listLabel"
                beatState={getBeatState("listLabel", 0)}
                format={format}
                theme={theme}
              >
                <LabelChip
                  format={format}
                  theme={theme}
                  label={content.listLabel}
                  variant="signal"
                />
              </BeatElement>
            </div>

            {/* Items list */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: sp(4),
                zIndex: LAYERS.items,
              }}
            >
              {visibleItems.map((item, index) => {
                // Cascade: items before current focus get reduced opacity
                const itemOpacity = (() => {
                  if (revealStyle !== "cascade") return 1;
                  const focusProgress = interpolate(
                    frame,
                    [0, durationFrames],
                    [0, visibleItems.length - 1],
                    {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    },
                  );
                  const distanceFromFocus = index - focusProgress;
                  if (distanceFromFocus < -0.5) return 0.5;
                  return 1;
                })();

                const itemKey = `item-${index}`;
                return (
                  <div
                    key={item.title + index}
                    style={{ opacity: itemOpacity }}
                  >
                    <BeatElement
                      elementKey={itemKey}
                      beatState={getBeatState(itemKey, index)}
                      format={format}
                      theme={theme}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "row",
                          alignItems: "center",
                          gap: sp(3),
                        }}
                      >
                        {showNumbers && (
                          <NumberBadge
                            format={format}
                            theme={theme}
                            number={index + 1}
                            variant="signal"
                          />
                        )}

                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: sp(1),
                            flex: 1,
                          }}
                        >
                          <TextBlock
                            format={format}
                            theme={theme}
                            text={item.title}
                            variant="bodyL"
                            weight="bold"
                            emphasisWords={narrationSync.activeEmphasisTargets}
                            emphasisProgress={gatedEmphasisProgress}
                          />

                          {!isShorts && item.subtitle && (
                            <TextBlock
                              format={format}
                              theme={theme}
                              text={item.subtitle}
                              variant="bodyS"
                              color={theme.textMuted}
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

      {/* SubtitleLayer removed — Root HUD global layer principle. */}
    </AbsoluteFill>
  );
};

export default ListRevealScene;
