import React from "react";
import { AbsoluteFill } from "remotion";
import type { BaseSceneProps, CoverContent, ElementBeatState } from "@/types";
import { useFormat } from "@/design/themes/useFormat";
import { sp } from "@/design/tokens/spacing";
import { radius } from "@/design/tokens/radius";
import { sceneInteriorTokens } from "@/design/tokens/shadow";
import { typography } from "@/design/tokens/typography";
import { SafeArea } from "@/components/layout/SafeArea";
import { BeatElement } from "@/components/motion/BeatElement";
import { TextBlock } from "@/components/primitives/TextBlock";
import { ImageMask } from "@/components/primitives/ImageMask";
import { AccentUnderline } from "@/components/primitives/AccentUnderline";
import { AccentLine } from "@/components/primitives/AccentLine";
import { useBeatTimeline } from "@/hooks/useBeatTimeline";
import { resolveBeats } from "@/pipeline/resolveBeats";

// zIndex layers
const LAYERS = {
  background: 0,
  texture: 5,
  baseContent: 20,
  coverImage: 25,
  title: 30,
  brandBar: 40,
} as const;

/**
 * Wildcard stagger — cinematic cover reveal sequence.
 * coverImage → title → underline → subtitle → author → brandBar
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
    // underline is frame-driven, not beat-driven
    subtitle: {
      visibility: "entering",
      entryFrame: isShorts ? 12 : 21, // 0.5s after title (6 + 15)
      emphasis: false,
      motionPreset: "heavy",
    },
    author: {
      visibility: "entering",
      entryFrame: isShorts ? 18 : 30, // 0.3s (9f) after subtitle
      emphasis: false,
      motionPreset: "heavy",
    },
    brandBar: {
      visibility: "entering",
      entryFrame: isShorts ? 24 : 36,
      emphasis: false,
      motionPreset: "smooth",
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
  const { typeScale, safeArea } = useFormat(format);
  const isShorts = format === "shorts";

  const bgOpacity = content.backgroundVariant === "light" ? 0.6 : 0.85;
  const imageSize = isShorts
    ? { width: 200, height: 280 }
    : { width: 260, height: 370 };

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

  // AccentUnderline starts after title enters
  const titleState = getBeatState("title");
  const underlineStartFrame = (titleState?.entryFrame ?? 6) + 18;
  const underlineWidth = Math.round(safeArea.contentColumnWidth * 0.6);

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
              gap: sp(5),
            }}
          >
            {/* Cover image */}
            <div style={{ zIndex: LAYERS.coverImage }}>
              <BeatElement
                elementKey="coverImage"
                beatState={getBeatState("coverImage")}
                format={format}
                theme={theme}
                motionType="scale"
                scaleFrom={0.92}
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

            {/* Title block — NO card background */}
            <div
              style={{
                zIndex: LAYERS.title,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: sp(3),
                maxWidth: "100%",
              }}
            >
              {/* Title — headlineXL (80px) */}
              <BeatElement
                elementKey="title"
                beatState={getBeatState("title")}
                format={format}
                theme={theme}
              >
                <span
                  style={{
                    fontFamily: typography.fontFamily.sans,
                    fontSize: typeScale.headlineXL,
                    fontWeight: typography.fontWeight.bold,
                    lineHeight: typography.lineHeight.tight,
                    letterSpacing: typography.tracking.tight,
                    color: theme.textStrong,
                    textAlign: "center",
                    display: "block",
                    textShadow: "0 2px 16px rgba(0,0,0,0.4)",
                  }}
                >
                  {content.title}
                </span>
              </BeatElement>

              {/* AccentUnderline draw-on below title */}
              <AccentUnderline
                width={underlineWidth}
                color={theme.accent}
                startFrame={underlineStartFrame}
                strokeWidth={3}
              />

              {/* Subtitle — headlineM, gray, 0.5s delay */}
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
                    variant="headlineM"
                    color={theme.textMuted}
                    align="center"
                    maxLines={2}
                  />
                </BeatElement>
              )}

              {/* Author — bodyM, lighter gray, 0.3s delay */}
              <BeatElement
                elementKey="author"
                beatState={getBeatState("author")}
                format={format}
                theme={theme}
              >
                <span
                  style={{
                    fontFamily: typography.fontFamily.sans,
                    fontSize: typeScale.bodyM,
                    fontWeight: typography.fontWeight.regular,
                    letterSpacing: typography.tracking.wide,
                    color: theme.textMuted,
                    opacity: 0.7,
                    textAlign: "center",
                    display: "block",
                  }}
                >
                  {content.author}
                </span>
              </BeatElement>
            </div>

            {/* Bottom brand bar — accent colored horizontal line */}
            <div
              style={{
                zIndex: LAYERS.brandBar,
                position: "absolute",
                bottom: sp(6),
                left: "50%",
                transform: "translateX(-50%)",
              }}
            >
              <BeatElement
                elementKey="brandBar"
                beatState={getBeatState("brandBar")}
                format={format}
                theme={theme}
              >
                <AccentLine
                  format={format}
                  theme={theme}
                  color={theme.accent}
                />
              </BeatElement>
            </div>
          </div>
        </SafeArea>
      </div>
    </AbsoluteFill>
  );
};

export default CoverScene;
