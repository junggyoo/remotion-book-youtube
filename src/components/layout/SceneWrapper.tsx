import React from "react";
import type { Theme, FormatKey } from "@/types";
import { sceneWrapperTokens } from "@/design/tokens/shadow";

interface SceneWrapperProps {
  theme: Theme;
  format: FormatKey;
  textureMood?: "grain" | "clean" | "paper" | "noise" | "none";
  children: React.ReactNode;
}

/**
 * SceneWrapper — adds subtle visual depth to all scenes via gradient tint
 * and inset shadow. Sits at z:15 (between scene texture:5 and baseContent:20).
 *
 * When textureMood is undefined (no art direction), renders children only (no-op).
 */
export const SceneWrapper: React.FC<SceneWrapperProps> = ({
  theme,
  textureMood,
  children,
}) => {
  // No art direction → complete no-op, zero DOM overhead
  if (!textureMood || textureMood === "none") {
    return <>{children}</>;
  }

  const modeKey = theme.mode === "dark" ? "dark" : "light";
  const gradientOpacity = sceneWrapperTokens.gradientOpacity[modeKey];
  const depthShadow = sceneWrapperTokens.depthShadow[modeKey];
  const angle = sceneWrapperTokens.gradientAngle;

  return (
    <>
      {children}

      {/* GradientTint: subtle 2-color tint from theme.accent → theme.signal */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 15,
          pointerEvents: "none",
          background: `linear-gradient(${angle}deg, ${theme.accent}, ${theme.signal})`,
          opacity: gradientOpacity,
        }}
      />

      {/* DepthShadow: inset box-shadow for ambient depth */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 15,
          pointerEvents: "none",
          boxShadow: depthShadow,
        }}
      />
    </>
  );
};

export default SceneWrapper;
