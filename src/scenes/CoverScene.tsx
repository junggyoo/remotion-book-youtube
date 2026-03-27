import React from "react";
import { AbsoluteFill } from "remotion";
import type { BaseSceneProps, CoverContent, ElementBeatState } from "@/types";
import { useFormat } from "@/design/themes/useFormat";
import { sp } from "@/design/tokens/spacing";
import { radius } from "@/design/tokens/radius";
import { sceneInteriorTokens } from "@/design/tokens/shadow";
import { SafeArea } from "@/components/layout/SafeArea";
import { BeatElement } from "@/components/motion/BeatElement";
import { TextBlock } from "@/components/primitives/TextBlock";
import { LabelChip } from "@/components/primitives/LabelChip";
import { ImageMask } from "@/components/primitives/ImageMask";
import { AccentLine } from "@/components/primitives/AccentLine";
import { useBeatTimeline } from "@/hooks/useBeatTimeline";
import { resolveBeats } from "@/pipeline/resolveBeats";

// zIndex layers from scene-catalog.json → cover
const LAYERS = {
  background: 0,
  texture: 5,
  baseContent: 20,
  coverImage: 25,
  title: 30,
  brandLabel: 40,
} as const;

/**
 * Wildcard stagger — preserve existing ArchitecturalReveal delays.
 * shorts에서는 subtitle이 없으므로 author/brandLabel 딜레이가 다름.
 */
function buildWildcardStagger(
  isShorts: boolean,
): Record<string, ElementBeatState> {
  return {
    coverImage: {
      visibility: "entering",
      entryFrame: 0,
      emphasis: false,
      motionPreset: "dramatic",
    },
    title: {
      visibility: "entering",
      entryFrame: 6,
      emphasis: false,
      motionPreset: "dramatic",
    },
    subtitle: {
      visibility: "entering",
      entryFrame: 12,
      emphasis: false,
      motionPreset: "dramatic",
    },
    author: {
      visibility: "entering",
      entryFrame: isShorts ? 12 : 18,
      emphasis: false,
      motionPreset: "dramatic",
    },
    brandLabel: {
      visibility: "entering",
      entryFrame: isShorts ? 18 : 24,
      emphasis: false,
      motionPreset: "dramatic",
    },
  };
}

interface CoverSceneProps extends BaseSceneProps {
  content: CoverContent;
}

export const CoverScene: React.FC<CoverSceneProps> = ({
  format,
  theme,
  from,
  durationFrames,
  content,
  beats,
}) => {
  const { typeScale } = useFormat(format);
  const isShorts = format === "shorts";

  const bgOpacity = content.backgroundVariant === "light" ? 0.6 : 0.85;
  const modeKey = theme.mode === "dark" ? "dark" : "light";
  const containerBgOpacity = sceneInteriorTokens.containerBgOpacity[modeKey];
  const imageSize = isShorts
    ? { width: 200, height: 280 }
    : { width: 280, height: 400 };

  // Beat resolution
  const resolvedBeats = resolveBeats(
    { id: `cover-${from}`, type: "cover", beats, narrationText: "" },
    format,
  );
  const { elementStates } = useBeatTimeline(resolvedBeats, durationFrames);
  const isWildcard =
    resolvedBeats.length === 1 && resolvedBeats[0].activates.includes("*");

  const wildcardStagger = buildWildcardStagger(isShorts);

  const getBeatState = (key: string): ElementBeatState | undefined => {
    if (isWildcard) return wildcardStagger[key];
    return elementStates.get(key);
  };

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      {/* Background overlay layer */}
      <AbsoluteFill
        style={{
          zIndex: LAYERS.background,
          backgroundColor: theme.bg,
          opacity: bgOpacity,
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
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: LAYERS.baseContent,
        }}
      >
        <SafeArea format={format} theme={theme}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: sp(7),
            }}
          >
            {/* Cover image */}
            <div style={{ zIndex: LAYERS.coverImage }}>
              <BeatElement
                elementKey="coverImage"
                beatState={getBeatState("coverImage")}
                format={format}
                theme={theme}
              >
                <ImageMask
                  format={format}
                  theme={theme}
                  src={content.coverImageUrl}
                  alt={content.title}
                  width={imageSize.width}
                  height={imageSize.height}
                  borderRadius={radius.lg}
                />
              </BeatElement>
            </div>

            {/* Title block — with subtle container background */}
            <div
              style={{
                zIndex: LAYERS.title,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: sp(4),
                maxWidth: "100%",
                backgroundColor: `rgba(${theme.mode === "dark" ? "255,255,255" : "0,0,0"}, ${containerBgOpacity})`,
                borderRadius: radius.lg,
                padding: `${sp(5)}px ${sp(6)}px`,
              }}
            >
              <BeatElement
                elementKey="title"
                beatState={getBeatState("title")}
                format={format}
                theme={theme}
              >
                <TextBlock
                  format={format}
                  theme={theme}
                  text={content.title}
                  variant="headlineL"
                  weight="bold"
                  align="center"
                  maxLines={3}
                />
              </BeatElement>

              {/* Subtitle — longform only */}
              {!isShorts && content.subtitle && (
                <BeatElement
                  elementKey="subtitle"
                  beatState={getBeatState("subtitle")}
                  format={format}
                  theme={theme}
                >
                  <TextBlock
                    format={format}
                    theme={theme}
                    text={content.subtitle}
                    variant="bodyL"
                    color={theme.textMuted}
                    align="center"
                    maxLines={2}
                  />
                </BeatElement>
              )}

              {/* Author */}
              <BeatElement
                elementKey="author"
                beatState={getBeatState("author")}
                format={format}
                theme={theme}
              >
                <TextBlock
                  format={format}
                  theme={theme}
                  text={content.author}
                  variant="bodyM"
                  color={theme.textMuted}
                  align="center"
                />
              </BeatElement>
            </div>

            {/* Accent line + Brand label */}
            <div
              style={{
                zIndex: LAYERS.brandLabel,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: sp(4),
              }}
            >
              <AccentLine format={format} theme={theme} />
              <BeatElement
                elementKey="brandLabel"
                beatState={getBeatState("brandLabel")}
                format={format}
                theme={theme}
              >
                <LabelChip
                  format={format}
                  theme={theme}
                  label={content.brandLabel ?? "Editorial Signal"}
                  variant="signal"
                />
              </BeatElement>
            </div>
          </div>
        </SafeArea>
      </div>

      {/* SubtitleLayer removed — Root HUD global layer principle.
          Subtitles are rendered by LongformComposition's CaptionLayer/SubtitleLayerWrapper. */}
    </AbsoluteFill>
  );
};

export default CoverScene;
