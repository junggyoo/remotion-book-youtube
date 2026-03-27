import React from "react";
import type { FormatKey, Theme } from "@/types";
import { sceneInteriorTokens } from "@/design/tokens/shadow";

interface AccentLineProps {
  format: FormatKey;
  theme: Theme;
  /** Override color (defaults to theme.signal) */
  color?: string;
}

/**
 * AccentLine — thin horizontal decorative bar using sceneInterior tokens.
 * Replaces hardcoded accent dividers across scenes.
 */
export const AccentLine: React.FC<AccentLineProps> = ({ theme, color }) => {
  return (
    <div
      style={{
        width: sceneInteriorTokens.accentLine.width,
        height: sceneInteriorTokens.accentLine.height,
        backgroundColor: color ?? theme.signal,
        borderRadius: sceneInteriorTokens.accentLine.height,
      }}
    />
  );
};

export default AccentLine;
