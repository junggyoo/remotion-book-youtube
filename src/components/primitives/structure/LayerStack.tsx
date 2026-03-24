import React from "react";
import type { FormatKey, Theme } from "@/types";

interface LayerStackProps {
  format: FormatKey;
  theme: Theme;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

const BASE_Z_INDEX = 20;

export const LayerStack: React.FC<LayerStackProps> = ({ children, style }) => {
  const childArray = React.Children.toArray(children);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        ...style,
      }}
    >
      {childArray.map((child, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: BASE_Z_INDEX + index,
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
};

export default LayerStack;
