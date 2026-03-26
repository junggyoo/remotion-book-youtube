import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
  useDelayRender,
} from "remotion";
import type { Caption } from "@remotion/captions";
import type { FormatKey, Theme } from "@/types";
import { typography } from "@/design/tokens/typography";
import { sp } from "@/design/tokens/spacing";
import { useFormat } from "@/design/themes/useFormat";

/** 한 페이지(= 화면에 동시에 표시되는 자막 단위) */
interface SentencePage {
  startMs: number;
  endMs: number;
  text: string;
  tokens: Array<{ text: string; fromMs: number; toMs: number }>;
}

/**
 * 문장 경계 기반 페이지 분리.
 * createTikTokStyleCaptions 대체 — 문장부호(.?!) 기준으로 페이지를 나눈다.
 * 한 문장이 너무 길면(28자 초과) 쉼표/연결어미에서 추가 분리.
 */
const MAX_PAGE_CHARS = 56; // 28자 × 2줄

function buildSentencePages(captions: Caption[]): SentencePage[] {
  if (captions.length === 0) return [];

  const pages: SentencePage[] = [];
  let currentTokens: SentencePage["tokens"] = [];
  let currentText = "";
  let pageStartMs = captions[0].startMs;

  const flushPage = (endMs: number) => {
    if (currentTokens.length === 0) return;
    pages.push({
      startMs: pageStartMs,
      endMs,
      text: currentText.trim(),
      tokens: [...currentTokens],
    });
    currentTokens = [];
    currentText = "";
  };

  for (let i = 0; i < captions.length; i++) {
    const cap = captions[i];
    const tokenText = cap.text;
    const trimmedToken = tokenText.trimEnd();

    currentTokens.push({
      text: tokenText,
      fromMs: cap.startMs,
      toMs: cap.endMs,
    });
    currentText += tokenText;

    const isSentenceEnd = /[.?!]$/.test(trimmedToken);
    const nextText = currentText + (captions[i + 1]?.text ?? "");
    const wouldOverflow =
      currentText.replace(/\s/g, "").length > MAX_PAGE_CHARS;

    if (isSentenceEnd || wouldOverflow) {
      flushPage(cap.endMs);
      if (i + 1 < captions.length) {
        pageStartMs = captions[i + 1].startMs;
      }
    }
  }

  // 남은 토큰 flush
  if (currentTokens.length > 0) {
    flushPage(currentTokens[currentTokens.length - 1].toMs);
  }

  return pages;
}

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
      const data: Caption[] = await response.json();
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

  const pages = useMemo(() => {
    if (!captions || captions.length === 0) return [];
    return buildSentencePages(captions);
  }, [captions]);

  if (!captions || pages.length === 0) {
    return null;
  }

  // Current time in ms (local frame within this scene)
  const currentTimeMs = (frame / fps) * 1000;

  // Find active page
  const activePage = pages.find((page, i) => {
    const nextPage = pages[i + 1];
    const pageEnd = nextPage ? nextPage.startMs : page.endMs;
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
