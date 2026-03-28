import type { BookFingerprint, HookStrategy } from "@/types";
import type { ThumbnailConfig } from "./types";

// --- HookStrategy → Expression mapping ---

const EXPRESSION_MAP: Record<HookStrategy, string> = {
  pain: "깊은 고민에 빠진 표정, 미간을 찌푸림",
  contrarian: "자신감 넘치는 표정, 한쪽 눈썹을 올림",
  transformation: "확신에 찬 표정으로 정면 응시",
  identity: "진지하고 단호한 표정",
  question: "의아한 표정, 고개를 살짝 갸웃",
  system: "분석적인 표정, 날카로운 눈빛",
  urgency: "긴박한 표정, 눈을 크게 뜸",
};

// --- HookStrategy → Gesture mapping ---

const GESTURE_MAP: Record<HookStrategy, string> = {
  pain: "양손으로 머리를 감싸는 제스처",
  contrarian: "양손을 앞으로 교차하며 X자 제스처",
  transformation: "검지 손가락을 세움",
  identity: "가슴에 손을 얹는 제스처",
  question: "턱에 손을 대고 생각하는 포즈",
  system: "양손으로 구조를 설명하는 손짓",
  urgency: "양손으로 얼굴을 받치며 놀란 제스처",
};

// --- Urgency → Mood mapping ---

function resolveMood(
  urgencyLevel: BookFingerprint["urgencyLevel"],
): ThumbnailConfig["mood"] {
  switch (urgencyLevel) {
    case "high":
      return "urgent";
    case "medium":
      return "dramatic";
    case "low":
      return "confident";
  }
}

// --- Background style from genre ---

function resolveBackground(fingerprint: BookFingerprint): string {
  const genreBackgrounds: Record<string, string> = {
    selfHelp: "dark gradient with warm golden accents",
    psychology: "dark moody gradient with deep purple tones",
    business: "dark gradient with subtle gold tones",
    philosophy: "dark atmospheric gradient with indigo tones",
    science: "dark gradient with cool blue-cyan accents",
    ai: "dark gradient with electric pink-magenta accents",
  };
  return genreBackgrounds[fingerprint.genre] ?? "dark cinematic gradient";
}

// --- HookText from entryAngle ---

function resolveHookText(entryAngle: string): string {
  if (entryAngle.length <= 30) {
    return entryAngle;
  }
  const truncated = entryAngle.slice(0, 30);
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > 15) {
    return truncated.slice(0, lastSpace);
  }
  return truncated;
}

// --- AccentWord from coreFramework or uniqueElements ---

function resolveAccentWord(fingerprint: BookFingerprint): string | undefined {
  if (fingerprint.coreFramework) {
    return fingerprint.coreFramework;
  }
  if (fingerprint.uniqueElements.length > 0) {
    return fingerprint.uniqueElements[0];
  }
  return undefined;
}

// --- Main function ---

export function generateThumbnailConfig(
  fingerprint: BookFingerprint,
): ThumbnailConfig {
  return {
    hookText: resolveHookText(fingerprint.entryAngle),
    accentWord: resolveAccentWord(fingerprint),
    expression: EXPRESSION_MAP[fingerprint.hookStrategy],
    gesture: GESTURE_MAP[fingerprint.hookStrategy],
    mood: resolveMood(fingerprint.urgencyLevel),
    backgroundStyle: resolveBackground(fingerprint),
  };
}
