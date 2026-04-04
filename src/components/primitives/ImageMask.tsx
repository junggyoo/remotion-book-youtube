import React, { useState } from "react";
import { staticFile } from "remotion";
import type { FormatKey, Theme } from "@/types";

interface ImageMaskProps {
  format: FormatKey;
  theme: Theme;
  src: string;
  alt?: string;
  width: number | string;
  height: number | string;
  borderRadius?: number;
}

export const ImageMask: React.FC<ImageMaskProps> = ({
  theme,
  src,
  alt = "",
  width,
  height,
  borderRadius = 0,
}) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        style={{
          width,
          height,
          borderRadius,
          background: `linear-gradient(135deg, ${theme.surfaceMuted}, ${theme.bg})`,
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <img
      src={staticFile(src)}
      alt={alt}
      onError={() => setHasError(true)}
      style={{
        width,
        height,
        borderRadius,
        objectFit: "cover",
        display: "block",
        flexShrink: 0,
      }}
    />
  );
};

export default ImageMask;
