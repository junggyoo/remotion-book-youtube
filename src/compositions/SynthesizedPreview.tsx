// ============================================================
// SynthesizedPreview — Remotion Composition for previewing
// SynthesizedBlueprint scenes in Remotion Studio.
// ============================================================

import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import type { SynthesizedBlueprint } from "@/types";
import { BlueprintRenderer } from "@/renderer/BlueprintRenderer";

export interface SynthesizedPreviewProps {
  blueprints: SynthesizedBlueprint[];
  totalDurationFrames: number;
  fps: number;
  width: number;
  height: number;
}

export const SynthesizedPreview: React.FC<SynthesizedPreviewProps> = ({
  blueprints,
  totalDurationFrames,
}) => {
  if (blueprints.length === 0) return null;

  const bg = blueprints[0].theme.bg;

  return (
    <AbsoluteFill style={{ backgroundColor: bg }}>
      {blueprints.map((bp) => (
        <Sequence
          key={bp.id}
          from={bp.from}
          durationInFrames={bp.durationFrames}
          name={`synth-${bp.id}`}
        >
          <BlueprintRenderer blueprint={bp} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

export default SynthesizedPreview;
