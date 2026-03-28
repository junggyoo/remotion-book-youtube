import type { DirectionParamsDelta, InterpretationContext } from "./types";

interface TunerInput {
  segment?: InterpretationContext["segment"];
  artDirection?: InterpretationContext["artDirection"];
}

interface TuneResult {
  overrides: DirectionParamsDelta;
  appliedDeltas: string[]; // trace: which rules fired
}

function addDelta(
  target: DirectionParamsDelta,
  source: DirectionParamsDelta,
): void {
  for (const key of Object.keys(source) as Array<keyof DirectionParamsDelta>) {
    const val = source[key];
    if (val !== undefined) {
      target[key] = (target[key] ?? 0) + val;
    }
  }
}

function clampDeltas(deltas: DirectionParamsDelta): void {
  for (const key of Object.keys(deltas) as Array<keyof DirectionParamsDelta>) {
    const val = deltas[key];
    if (val !== undefined) {
      deltas[key] = Math.max(0, Math.min(1, val));
    }
  }
}

export function tuneDirection(input: TunerInput): TuneResult {
  const deltas: DirectionParamsDelta = {};
  const applied: string[] = [];

  // Segment role deltas
  if (input.segment) {
    const role = input.segment.role;
    if (role === "setup") {
      addDelta(deltas, { pacing: 0.1, energy: 0.05 });
      applied.push("segment:setup → pacing+0.1, energy+0.05");
    } else if (role === "climax") {
      addDelta(deltas, {
        energy: 0.2,
        emphasisDensity: 0.15,
        transitionTension: 0.1,
      });
      applied.push(
        "segment:climax → energy+0.2, emphasisDensity+0.15, transitionTension+0.1",
      );
    } else if (role === "resolution") {
      addDelta(deltas, { holdRatio: 0.1, pacing: -0.1 });
      applied.push("segment:resolution → holdRatio+0.1, pacing-0.1");
    } else if (role === "closing") {
      addDelta(deltas, { holdRatio: 0.15, energy: -0.1 });
      applied.push("segment:closing → holdRatio+0.15, energy-0.1");
    }
  }

  // ArtDirection deltas
  if (input.artDirection) {
    const { motionCharacter, revealDensity, emphasisStyle } =
      input.artDirection;
    if (motionCharacter === "snappy") {
      addDelta(deltas, { pacing: 0.15 });
      applied.push("artDirection:snappy → pacing+0.15");
    } else if (motionCharacter === "fluid") {
      addDelta(deltas, { transitionTension: -0.1 });
      applied.push("artDirection:fluid → transitionTension-0.1");
    }
    if (revealDensity === "dense") {
      addDelta(deltas, { emphasisDensity: 0.1 });
      applied.push("artDirection:dense-reveal → emphasisDensity+0.1");
    }
    if (emphasisStyle === "text-first") {
      addDelta(deltas, { emphasisDensity: 0.05 });
      applied.push("artDirection:text-first → emphasisDensity+0.05");
    }
  }

  // Clamp all values to [0, 1]
  clampDeltas(deltas);

  return { overrides: deltas, appliedDeltas: applied };
}
