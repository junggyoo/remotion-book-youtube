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
  ApplicationContent,
  ElementBeatState,
} from "@/types";
import { sp } from "@/design/tokens/spacing";
import { sceneInteriorTokens } from "@/design/tokens/shadow";
import { motionPresets } from "@/design/tokens";
import { SafeArea } from "@/components/layout/SafeArea";
import { BeatElement } from "@/components/motion/BeatElement";
import { TextBlock } from "@/components/primitives/TextBlock";
import { useBeatTimeline } from "@/hooks/useBeatTimeline";
import { useCaptions } from "@/hooks/useCaptions";
import { useNarrationSync } from "@/hooks/useNarrationSync";
import { useEmphasisGate } from "@/hooks/useEmphasisGate";
import { resolveBeats } from "@/pipeline/resolveBeats";

const LAYERS = {
  background: 0,
  texture: 5,
  anchorStatement: 20,
  steps: 30,
} as const;

/** Accent bullet size */
const BULLET_SIZE = 12;

const WILDCARD_STAGGER_BASE: Record<string, ElementBeatState> = {
  anchorStatement: {
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

interface ApplicationSceneProps extends BaseSceneProps {
  content: ApplicationContent;
}

export const ApplicationScene: React.FC<ApplicationSceneProps> = ({
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
  const showDetail = !isShorts;

  // P2-3: Load captions for narration sync
  const captions = useCaptions(captionsFile);

  // Beat resolution
  const resolvedBeats = resolveBeats(
    {
      id: `application-${from}`,
      type: "application",
      beats,
      narrationText: "",
    },
    format,
  );
  const { elementStates, activeBeat, activeChannels, isInRecoveryWindow } =
    useBeatTimeline(resolvedBeats, durationFrames, "heavy", {
      sceneType: "application",
      format,
    });

  // P2-3: Narration sync — emphasis words highlight active step
  const narrationSync = useNarrationSync({
    captions,
    emphasisTargets: activeBeat?.emphasisTargets ?? [],
    sceneType: "application",
    format,
  });

  // P2-4: Gate sceneText channel
  const { isChannelActive: sceneTextActive } = useEmphasisGate({
    channelKey: "sceneText",
    sceneType: "application",
    format,
    beatTimeline: { activeChannels, isInRecoveryWindow },
  });
  const gatedEmphasisProgress = sceneTextActive
    ? narrationSync.emphasisProgress
    : 0;

  const isWildcard =
    resolvedBeats.length === 1 && resolvedBeats[0].activates.includes("*");

  const getBeatState = (
    key: string,
    index?: number,
  ): ElementBeatState | undefined => {
    if (isWildcard) return getWildcardStagger(key, index);
    return elementStates.get(key);
  };

  // Determine which step is "current" (latest entering/visible)
  const getStepVisibility = (index: number): "hidden" | "current" | "past" => {
    const state = getBeatState(`step-${index}`, index);
    if (!state || state.visibility === "hidden") return "hidden";

    let highestVisible = -1;
    for (let i = 0; i < content.steps.length; i++) {
      const s = getBeatState(`step-${i}`, i);
      if (s && s.visibility !== "hidden") {
        highestVisible = i;
      }
    }

    return index === highestVisible ? "current" : "past";
  };

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
          zIndex: LAYERS.anchorStatement,
        }}
      >
        <SafeArea format={format} theme={theme}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              height: "100%",
              gap: sp(6),
            }}
          >
            {/* Anchor statement */}
            <div style={{ zIndex: LAYERS.anchorStatement }}>
              <BeatElement
                elementKey="anchorStatement"
                beatState={getBeatState("anchorStatement")}
                format={format}
                theme={theme}
              >
                <TextBlock
                  format={format}
                  theme={theme}
                  text={content.anchorStatement}
                  variant="headlineM"
                  weight="bold"
                  maxLines={3}
                />
              </BeatElement>
            </div>

            {/* Vertical step list — sequential reveal with dim */}
            <div
              style={{
                zIndex: LAYERS.steps,
                display: "flex",
                flexDirection: "column",
                gap: sp(5),
              }}
            >
              {content.steps.map((step, index) => {
                const stepKey = `step-${index}`;
                const visibility = getStepVisibility(index);
                const stepState = getBeatState(stepKey, index);
                const isCurrent = visibility === "current";

                // P2-3: Emphasis-driven scale for current step title
                const stepTitleScale = isCurrent
                  ? 1.0 + gatedEmphasisProgress * 0.03
                  : 1.0;
                // P2-3: Emphasis-driven bullet opacity (0.5→1.0)
                const bulletOpacity = isCurrent
                  ? 0.5 + gatedEmphasisProgress * 0.5
                  : visibility === "past"
                    ? 0.5
                    : 1.0;

                // Dim logic: past steps dim
                let stepOpacity = 1;
                if (
                  visibility === "past" &&
                  stepState &&
                  stepState.visibility !== "hidden"
                ) {
                  const nextState = getBeatState(
                    `step-${index + 1}`,
                    index + 1,
                  );
                  if (nextState && nextState.entryFrame > 0) {
                    const dimProgress = spring({
                      frame: Math.max(0, frame - nextState.entryFrame),
                      fps,
                      config: motionPresets.presets.smooth.config,
                      durationInFrames: 18,
                    });
                    stepOpacity = interpolate(
                      dimProgress,
                      [0, 1],
                      [1, sceneInteriorTokens.dimOpacity],
                      {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                      },
                    );
                  }
                }

                return (
                  <div
                    key={index}
                    style={{
                      opacity: stepOpacity,
                      willChange: visibility === "past" ? "opacity" : undefined,
                    }}
                  >
                    <BeatElement
                      elementKey={stepKey}
                      beatState={stepState}
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
                        {/* Accent bullet circle — P2-3: opacity driven by emphasis */}
                        <div
                          style={{
                            width: BULLET_SIZE,
                            height: BULLET_SIZE,
                            borderRadius: BULLET_SIZE / 2,
                            backgroundColor: isCurrent
                              ? theme.accent
                              : theme.lineSubtle,
                            flexShrink: 0,
                            marginTop: sp(2),
                            opacity: bulletOpacity,
                            willChange:
                              isCurrent && gatedEmphasisProgress > 0
                                ? "opacity"
                                : undefined,
                          }}
                        />

                        {/* Step text — P2-3: title scale driven by emphasis */}
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: sp(2),
                            flex: 1,
                            transform: `scale(${stepTitleScale})`,
                            transformOrigin: "left center",
                            willChange:
                              isCurrent && gatedEmphasisProgress > 0
                                ? "transform"
                                : undefined,
                          }}
                        >
                          <TextBlock
                            format={format}
                            theme={theme}
                            text={step.title}
                            variant="bodyL"
                            weight="bold"
                            emphasisWords={narrationSync.activeEmphasisTargets}
                            emphasisProgress={
                              isCurrent ? gatedEmphasisProgress : 0
                            }
                          />

                          {showDetail && step.detail && (
                            <TextBlock
                              format={format}
                              theme={theme}
                              text={step.detail}
                              variant="bodyS"
                              color={theme.textMuted}
                              maxLines={3}
                              emphasisWords={
                                narrationSync.activeEmphasisTargets
                              }
                              emphasisProgress={
                                isCurrent ? gatedEmphasisProgress : 0
                              }
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

export default ApplicationScene;
