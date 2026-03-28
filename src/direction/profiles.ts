import type { DirectionProfile, DirectionProfileName } from "./types";

export const DIRECTION_PROFILES: Record<
  DirectionProfileName,
  DirectionProfile
> = {
  analytical: {
    name: "analytical",
    base: {
      pacing: 0.3,
      energy: 0.2,
      emphasisDensity: 0.4,
      holdRatio: 0.3,
      revealPattern: "sequential",
      transitionTension: 0.2,
      subtitleCadence: "steady",
    },
  },
  systematic: {
    name: "systematic",
    base: {
      pacing: 0.4,
      energy: 0.3,
      emphasisDensity: 0.5,
      holdRatio: 0.25,
      revealPattern: "parallel",
      transitionTension: 0.3,
      subtitleCadence: "steady",
    },
  },
  contemplative: {
    name: "contemplative",
    base: {
      pacing: 0.2,
      energy: 0.15,
      emphasisDensity: 0.2,
      holdRatio: 0.5,
      revealPattern: "layered",
      transitionTension: 0.15,
      subtitleCadence: "dramatic-pause",
    },
  },
  persuasive: {
    name: "persuasive",
    base: {
      pacing: 0.7,
      energy: 0.7,
      emphasisDensity: 0.7,
      holdRatio: 0.15,
      revealPattern: "sequential",
      transitionTension: 0.6,
      subtitleCadence: "syncopated",
    },
  },
  urgent: {
    name: "urgent",
    base: {
      pacing: 0.85,
      energy: 0.85,
      emphasisDensity: 0.8,
      holdRatio: 0.1,
      revealPattern: "sequential",
      transitionTension: 0.8,
      subtitleCadence: "syncopated",
    },
  },
  inspirational: {
    name: "inspirational",
    base: {
      pacing: 0.4,
      energy: 0.5,
      emphasisDensity: 0.4,
      holdRatio: 0.35,
      revealPattern: "layered",
      transitionTension: 0.3,
      subtitleCadence: "steady",
    },
  },
  investigative: {
    name: "investigative",
    base: {
      pacing: 0.35,
      energy: 0.4,
      emphasisDensity: 0.5,
      holdRatio: 0.3,
      revealPattern: "suspense",
      transitionTension: 0.5,
      subtitleCadence: "dramatic-pause",
    },
  },
};

export function getDirectionProfile(
  name: DirectionProfileName,
): DirectionProfile {
  return DIRECTION_PROFILES[name];
}
