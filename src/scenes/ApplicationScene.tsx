import React from "react";
import { AbsoluteFill } from "remotion";
import type {
  BaseSceneProps,
  ApplicationContent,
  ElementBeatState,
} from "@/types";
import { sp } from "@/design/tokens/spacing";
import { SafeArea } from "@/components/layout/SafeArea";
import { BeatElement } from "@/components/motion/BeatElement";
import { TextBlock } from "@/components/primitives/TextBlock";
import { ProgressDot } from "@/components/primitives/ProgressDot";
import { ConnectorLine } from "@/components/primitives/ConnectorLine";
import { useBeatTimeline } from "@/hooks/useBeatTimeline";
import { resolveBeats } from "@/pipeline/resolveBeats";

// zIndex layers from scene-catalog.json → application
const LAYERS = {
  background: 0,
  texture: 5,
  anchorStatement: 20,
  paths: 25,
  steps: 30,
  emphasis: 40,
} as const;

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
  // steps: delay = index * 9
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
}) => {
  const isShorts = format === "shorts";
  const showDetail = !isShorts;
  const showPaths = content.showPaths === true;

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

            {/* Vertical step flow */}
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
                return (
                  <React.Fragment key={index}>
                    <BeatElement
                      elementKey={stepKey}
                      beatState={getBeatState(stepKey, index)}
                      format={format}
                      theme={theme}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "row",
                          alignItems: "flex-start",
                          gap: sp(4),
                        }}
                      >
                        {/* ProgressDot + optional path connector column */}
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            flexShrink: 0,
                            gap: 0,
                          }}
                        >
                          <ProgressDot
                            format={format}
                            theme={theme}
                            active
                            size={12}
                          />
                          {showPaths && index < content.steps.length - 1 && (
                            <div
                              style={{
                                zIndex: LAYERS.paths,
                                marginTop: sp(2),
                              }}
                            >
                              <ConnectorLine
                                format={format}
                                theme={theme}
                                orientation="vertical"
                                length={sp(6)}
                              />
                            </div>
                          )}
                        </div>

                        {/* Step text */}
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
                            text={step.title}
                            variant="bodyL"
                            weight="bold"
                          />

                          {showDetail && step.detail && (
                            <TextBlock
                              format={format}
                              theme={theme}
                              text={step.detail}
                              variant="bodyS"
                              color={theme.textMuted}
                              maxLines={3}
                            />
                          )}
                        </div>
                      </div>
                    </BeatElement>
                  </React.Fragment>
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

export default ApplicationScene;
