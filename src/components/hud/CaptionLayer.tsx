import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
  useDelayRender,
} from "remotion";
import { createTikTokStyleCaptions } from "@remotion/captions";
import type { Caption } from "@remotion/captions";
import type { FormatKey, Theme } from "@/types";
import { typography } from "@/design/tokens/typography";
import { sp } from "@/design/tokens/spacing";
import { useFormat } from "@/design/themes/useFormat";

const SWITCH_CAPTIONS_EVERY_MS = 2400;

const KOREAN_SUFFIXES =
  /(?:을|를|이|가|은|는|에|의|로|과|와|에서|까지|부터|만|도|조차|으로|이나|처럼|보다|라고|이라|한|된|하는|했던|으며|이며)$/;

function matchesKoreanStem(tokenText: string, keyword: string): boolean {
  const normalizedToken = tokenText.replace(/\s/g, "");
  const normalizedKw = keyword.replace(/\s/g, "");

  // 빈 문자열 guard
  if (normalizedToken.length === 0 || normalizedKw.length === 0) return false;

  // 1차: startsWith 우선 체크 (가장 안전)
  if (normalizedToken.startsWith(normalizedKw) && normalizedKw.length >= 2) {
    return true;
  }

  // 2차: suffix-strip 매칭
  const strippedToken = normalizedToken.replace(KOREAN_SUFFIXES, "");
  const strippedKw = normalizedKw.replace(KOREAN_SUFFIXES, "");

  // 최소 stem 길이 guard: stripped 결과가 2자 미만이면 원본 includes로 fallback
  if (strippedToken.length < 2 || strippedKw.length < 2) {
    return normalizedToken.includes(normalizedKw);
  }

  // 단방향만: token이 keyword stem을 포함하는지 (역방향 제거)
  return strippedToken.includes(strippedKw);
}

interface CaptionLayerProps {
  format: FormatKey;
  theme: Theme;
  captionsFile: string;
  sceneStartFrame: number;
  emphasisKeywords?: string[];
  emphasisTimeRangeMs?: { startMs: number; endMs: number };
}

export const CaptionLayer: React.FC<CaptionLayerProps> = ({
  format,
  theme,
  captionsFile,
  sceneStartFrame,
  emphasisKeywords,
  emphasisTimeRangeMs,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { typeScale } = useFormat(format);
  const isShorts = format === "shorts";

  const [captions, setCaptions] = useState<Caption[] | null>(null);
  const { delayRender, continueRender } = useDelayRender();
  const [handle] = useState(() => delayRender());

  const fetchCaptions = useCallback(async () => {
    try {
      const response = await fetch(staticFile(captionsFile));
      const data = await response.json();
      setCaptions(data);
      continueRender(handle);
    } catch (e) {
      // Fallback: no captions, don't block render
      console.warn(`[CaptionLayer] Failed to load ${captionsFile}`);
      setCaptions([]);
      continueRender(handle);
    }
  }, [captionsFile, continueRender, handle]);

  useEffect(() => {
    fetchCaptions();
  }, [fetchCaptions]);

  const { pages } = useMemo(() => {
    if (!captions || captions.length === 0) {
      return { pages: [] };
    }
    return createTikTokStyleCaptions({
      captions,
      combineTokensWithinMilliseconds: SWITCH_CAPTIONS_EVERY_MS,
    });
  }, [captions]);

  if (!captions || pages.length === 0) {
    return null;
  }

  // Current time in ms (local frame within this scene)
  const currentTimeMs = (frame / fps) * 1000;

  // Find active page
  const activePage = pages.find((page, i) => {
    const nextPage = pages[i + 1];
    const pageEnd = nextPage
      ? nextPage.startMs
      : page.startMs + SWITCH_CAPTIONS_EVERY_MS;
    return currentTimeMs >= page.startMs && currentTimeMs < pageEnd;
  });

  if (!activePage) return null;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: isShorts ? sp(10) : sp(8),
      }}
    >
      <div
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.65)",
          borderRadius: sp(2),
          paddingLeft: sp(4),
          paddingRight: sp(4),
          paddingTop: sp(2),
          paddingBottom: sp(2),
          maxWidth: isShorts ? "85%" : "70%",
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontFamily: typography.fontFamily.sans,
            fontSize: isShorts ? typeScale.bodyM : typeScale.bodyL,
            fontWeight: typography.fontWeight.medium,
            lineHeight: typography.lineHeight.normal,
            letterSpacing: typography.tracking.normal,
            whiteSpace: "pre",
          }}
        >
          {activePage.tokens.map((token, ti) => {
            const isEmphasized =
              (emphasisKeywords?.some((kw) =>
                matchesKoreanStem(token.text, kw),
              ) ??
                false) &&
              (!emphasisTimeRangeMs ||
                (token.fromMs >= emphasisTimeRangeMs.startMs &&
                  token.fromMs < emphasisTimeRangeMs.endMs));

            return (
              <span
                key={`${token.fromMs}-${ti}`}
                style={{
                  color: theme.textStrong,
                  fontWeight: isEmphasized
                    ? typography.fontWeight.bold
                    : typography.fontWeight.medium,
                  display: isEmphasized ? "inline-block" : undefined,
                  transform: isEmphasized ? "scale(1.02)" : undefined,
                }}
              >
                {token.text}
              </span>
            );
          })}
        </span>
      </div>
    </AbsoluteFill>
  );
};

export default CaptionLayer;
