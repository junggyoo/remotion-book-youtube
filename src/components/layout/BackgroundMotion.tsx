import React from "react";
import { useCurrentFrame } from "remotion";
import type { FormatKey } from "@/types";

// --- Public types ---

export type NoiseMode = "grain" | "subtle-drift" | "none";
export type BlendMode = "overlay" | "soft-light" | "normal";

export interface BackgroundMotionProps {
  mode?: NoiseMode;
  format?: FormatKey;
  blendMode?: BlendMode;
  children: React.ReactNode;
}

// --- SVG noise data URI (feTurbulence grain, no external assets) ---

const NOISE_SVG = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/></filter><rect width="256" height="256" filter="url(#n)" opacity="1"/></svg>`,
)}`;

// --- Exported helper for testing ---

const BASE_OPACITY = 0.03;
const DRIFT_AMPLITUDE = 1.5;
const DRIFT_SPEED = 0.008;

export function getNoiseStyle(
  mode: NoiseMode,
  frame: number,
): { opacity: number; transform?: string } {
  if (mode === "none") {
    return { opacity: 0 };
  }
  if (mode === "subtle-drift") {
    const sinX = Math.sin(frame * DRIFT_SPEED) * DRIFT_AMPLITUDE;
    const cosY = Math.cos(frame * DRIFT_SPEED * 0.7) * DRIFT_AMPLITUDE;
    return {
      opacity: BASE_OPACITY,
      transform: `translate(${sinX.toFixed(2)}px, ${cosY.toFixed(2)}px)`,
    };
  }
  // "grain" (default)
  return { opacity: BASE_OPACITY };
}

// --- Component ---

export const BackgroundMotion: React.FC<BackgroundMotionProps> = ({
  mode = "grain",
  format,
  blendMode = "overlay",
  children,
}) => {
  const frame = useCurrentFrame();
  const noiseStyle = getNoiseStyle(mode, frame);

  const effectiveOpacity =
    format === "shorts" ? noiseStyle.opacity * 0.5 : noiseStyle.opacity;

  return (
    <>
      {children}
      {mode !== "none" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 5,
            pointerEvents: "none",
            opacity: effectiveOpacity,
            backgroundImage: `url("${NOISE_SVG}")`,
            backgroundSize: "256px 256px",
            mixBlendMode: blendMode,
            ...(noiseStyle.transform
              ? { transform: noiseStyle.transform }
              : {}),
          }}
        />
      )}
    </>
  );
};

export default BackgroundMotion;
