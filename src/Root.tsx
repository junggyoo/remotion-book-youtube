import React from "react";
import { Composition } from "remotion";
import { LongformComposition } from "@/compositions/LongformComposition";
import { SynthesizedPreview } from "@/compositions/SynthesizedPreview";
import type { SynthesizedPreviewProps } from "@/compositions/SynthesizedPreview";
import { buildCompositionProps } from "@/pipeline/buildProps";
import type { CompositionProps } from "@/pipeline/buildProps";
import testBook from "../content/books/test-book.json";
import miracleMorningBook from "../content/books/miracle-morning.json";
import atomicHabitsBook from "../content/books/atomic-habits.json";
import type { BookContent } from "@/types";
import { loadProjectFonts } from "@/design/fonts/loadFonts";
import { useTheme } from "@/design/themes/useTheme";
import { synthesizeGaps } from "@/planner/sceneSynthesizer";
import type { SynthesizerContext } from "@/planner/sceneSynthesizer";
import {
  miracleMorningGaps,
  miracleMorningFingerprint,
} from "@/planner/__tests__/miracleMorning.fixture";

loadProjectFonts();

const book = testBook as unknown as BookContent;
const mmBook = miracleMorningBook as unknown as BookContent;

// Build default props for preview (no TTS in preview mode)
const longformProps: CompositionProps = buildCompositionProps(book, "longform");
const shortsProps: CompositionProps = buildCompositionProps(book, "shorts");

// Miracle Morning — TTS audio + captions loaded at render time via manifest
const mmLongformProps: CompositionProps = buildCompositionProps(
  mmBook,
  "longform",
);

// Atomic Habits — 5min longform
const ahBook = atomicHabitsBook as unknown as BookContent;
const ahLongformProps: CompositionProps = buildCompositionProps(
  ahBook,
  "longform",
);

// Build synthesized scene preview props
const synthTheme = useTheme("dark", "selfHelp");
const synthCtx: SynthesizerContext = {
  format: "longform",
  theme: synthTheme,
  from: 0,
  durationFrames: 180,
  narrationText: "",
  emotionalTones: miracleMorningFingerprint.emotionalTone,
};
const synthBlueprints = synthesizeGaps(miracleMorningGaps, synthCtx);
// Assign sequential `from` values
let synthFrom = 0;
for (const bp of synthBlueprints) {
  (bp as { from: number }).from = synthFrom;
  synthFrom += bp.durationFrames;
}
const synthProps: SynthesizedPreviewProps = {
  blueprints: synthBlueprints,
  totalDurationFrames: synthFrom,
  fps: 30,
  width: 1920,
  height: 1080,
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="LongformComposition"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={LongformComposition as any}
        durationInFrames={longformProps.totalDurationFrames}
        fps={longformProps.fps}
        width={longformProps.width}
        height={longformProps.height}
        defaultProps={longformProps as any}
      />
      <Composition
        id="ShortsPreview"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={LongformComposition as any}
        durationInFrames={shortsProps.totalDurationFrames}
        fps={shortsProps.fps}
        width={shortsProps.width}
        height={shortsProps.height}
        defaultProps={shortsProps as any}
      />
      <Composition
        id="MiracleMorning"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={LongformComposition as any}
        durationInFrames={mmLongformProps.totalDurationFrames}
        fps={mmLongformProps.fps}
        width={mmLongformProps.width}
        height={mmLongformProps.height}
        defaultProps={mmLongformProps as any}
      />
      <Composition
        id="AtomicHabits"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={LongformComposition as any}
        durationInFrames={ahLongformProps.totalDurationFrames}
        fps={ahLongformProps.fps}
        width={ahLongformProps.width}
        height={ahLongformProps.height}
        defaultProps={ahLongformProps as any}
      />
      <Composition
        id="SynthesizedPreview"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={SynthesizedPreview as any}
        durationInFrames={synthProps.totalDurationFrames}
        fps={synthProps.fps}
        width={synthProps.width}
        height={synthProps.height}
        defaultProps={synthProps as any}
      />
    </>
  );
};
