import React from "react";
import type { FormatKey, Theme } from "@/types";
import { spacing } from "@/design/tokens/spacing";

interface CardStackProps {
  format: FormatKey;
  theme: Theme;
  children?: React.ReactNode;
  offsetPx?: number;
  direction?: "down" | "right";
  style?: React.CSSProperties;
}

export const CardStack: React.FC<CardStackProps> = ({
  theme,
  children,
  offsetPx,
  direction = "down",
  style,
}) => {
  const offset = offsetPx ?? spacing.scale[2];
  const childArray = React.Children.toArray(children);
  const count = childArray.length;

  const containerWidth = style?.width ?? "100%";
  const containerHeight = style?.height ?? "100%";

  return (
    <div
      style={{
        position: "relative",
        width: containerWidth as string | number,
        height: containerHeight as string | number,
        ...style,
      }}
    >
      {childArray.map((child, index) => {
        const dx = direction === "right" ? index * offset : 0;
        const dy = direction === "down" ? index * offset : 0;
        const isBackground = index < count - 1;

        return (
          <div
            key={index}
            style={{
              position: "absolute",
              top: dy,
              left: dx,
              right: direction === "right" ? undefined : -dx,
              bottom: direction === "down" ? undefined : -dy,
              width: direction === "right" ? undefined : "100%",
              height: direction === "down" ? undefined : "100%",
              backgroundColor: isBackground ? theme.surface : undefined,
              border: isBackground
                ? `1px solid ${theme.lineSubtle}`
                : undefined,
              borderRadius: isBackground ? 8 : undefined,
            }}
          >
            {child}
          </div>
        );
      })}
    </div>
  );
};

export default CardStack;
