// ============================================================
// VCL Primitive Registry
// Maps VCLElementType strings to React adapter components.
// Each adapter wraps an existing primitive with:
//   1. A positioned div for absolute layout-engine placement
//   2. Props mapping from VCL el.props to the primitive's interface
// ============================================================

import React from "react";
import type { FormatKey, Theme } from "@/types";
import { TextBlock } from "@/components/primitives/TextBlock";
import { LabelChip } from "@/components/primitives/LabelChip";
import { NumberBadge } from "@/components/primitives/NumberBadge";
import { QuoteBlock } from "@/components/primitives/QuoteBlock";
import { DividerLine } from "@/components/primitives/DividerLine";
import { IconWrapper } from "@/components/primitives/IconWrapper";

// --- Adapter type ---

export type PrimitiveAdapterProps = {
  style: React.CSSProperties;
  format: FormatKey;
  theme: Theme;
} & Record<string, unknown>;

export type PrimitiveAdapter = React.FC<PrimitiveAdapterProps>;

// --- Helper: wrap child in positioned div ---

function positioned(
  style: React.CSSProperties,
  child: React.ReactElement,
): React.ReactElement {
  return React.createElement(
    "div",
    { style: { position: "absolute" as const, ...style } },
    child,
  );
}

// --- Text adapters ---

const headlineAdapter: PrimitiveAdapter = ({
  style,
  format,
  theme,
  ...props
}) =>
  positioned(
    style,
    React.createElement(TextBlock, {
      format,
      theme,
      text: (props.text as string) ?? "",
      variant: "headlineL",
      weight:
        (props.weight as "regular" | "bold" | "semibold" | "medium") ?? "bold",
      color: props.color === "textMuted" ? theme.textMuted : undefined,
      align: (props.align as "left" | "center" | "right") ?? "center",
    }),
  );

const bodyTextAdapter: PrimitiveAdapter = ({
  style,
  format,
  theme,
  ...props
}) => {
  const tokenRef = props.tokenRef as string | undefined;
  let variant: "bodyL" | "bodyM" | "bodyS" = "bodyM";
  if (tokenRef?.includes("bodyL")) variant = "bodyL";
  else if (tokenRef?.includes("bodyS")) variant = "bodyS";

  return positioned(
    style,
    React.createElement(TextBlock, {
      format,
      theme,
      text: (props.text as string) ?? "",
      variant,
      weight:
        (props.weight as "regular" | "bold" | "semibold" | "medium") ??
        "regular",
      color: props.color === "textMuted" ? theme.textMuted : undefined,
      align: (props.align as "left" | "center" | "right") ?? "left",
    }),
  );
};

const labelAdapter: PrimitiveAdapter = ({ style, format, theme, ...props }) =>
  positioned(
    style,
    React.createElement(LabelChip, {
      format,
      theme,
      label: (props.text as string) ?? (props.label as string) ?? "",
      variant: (props.variant as "default" | "accent" | "signal") ?? "default",
    }),
  );

const captionAdapter: PrimitiveAdapter = ({ style, format, theme, ...props }) =>
  positioned(
    style,
    React.createElement(TextBlock, {
      format,
      theme,
      text: (props.text as string) ?? "",
      variant: "caption",
      color: props.color === "textMuted" ? theme.textMuted : theme.textMuted,
      align: (props.align as "left" | "center" | "right") ?? "left",
    }),
  );

const numberDisplayAdapter: PrimitiveAdapter = ({
  style,
  format,
  theme,
  ...props
}) =>
  positioned(
    style,
    React.createElement(NumberBadge, {
      format,
      theme,
      number: (props.value as number) ?? 0,
      variant: (props.variant as "default" | "accent" | "signal") ?? "default",
    }),
  );

const quoteTextAdapter: PrimitiveAdapter = ({
  style,
  format,
  theme,
  ...props
}) =>
  positioned(
    style,
    React.createElement(QuoteBlock, {
      format,
      theme,
      quoteText: (props.text as string) ?? "",
      attribution: props.attribution as string | undefined,
      useSerif: (props.useSerif as boolean) ?? false,
    }),
  );

// --- Visual adapters ---

const iconAdapter: PrimitiveAdapter = ({ style, format, theme, ...props }) =>
  positioned(
    style,
    React.createElement(IconWrapper, {
      format,
      theme,
      src: (props.iconId as string) ?? (props.src as string) ?? "",
      size: (props.size as number) ?? 24,
    }),
  );

const dividerAdapter: PrimitiveAdapter = ({ style, format, theme, ...props }) =>
  positioned(
    style,
    React.createElement(DividerLine, {
      format,
      theme,
      orientation:
        (props.orientation as "horizontal" | "vertical") ?? "horizontal",
    }),
  );

const textureOverlayAdapter: PrimitiveAdapter = ({ style, theme }) =>
  React.createElement("div", {
    style: {
      position: "absolute" as const,
      ...style,
      backgroundColor: theme.surfaceMuted,
      opacity: 0.05,
      pointerEvents: "none" as const,
    },
  });

const colorBlockAdapter: PrimitiveAdapter = ({ style, theme, ...props }) => {
  const colorKey = props.colorKey as string | undefined;
  const bg =
    colorKey && colorKey in theme
      ? (theme as unknown as Record<string, string>)[colorKey]
      : theme.surface;
  return React.createElement("div", {
    style: { position: "absolute" as const, ...style, backgroundColor: bg },
  });
};

const shapeAdapter: PrimitiveAdapter = ({ style, theme, ...props }) => {
  const shape = (props.shape as string) ?? "circle";
  return React.createElement("div", {
    style: {
      position: "absolute" as const,
      ...style,
      backgroundColor: theme.lineSubtle,
      borderRadius: shape === "circle" ? "50%" : 0,
    },
  });
};

// --- Registry ---

const registry: Record<string, PrimitiveAdapter> = {
  // Text primitives
  headline: headlineAdapter,
  "body-text": bodyTextAdapter,
  label: labelAdapter,
  caption: captionAdapter,
  "number-display": numberDisplayAdapter,
  "quote-text": quoteTextAdapter,
  // Visual primitives
  icon: iconAdapter,
  divider: dividerAdapter,
  "texture-overlay": textureOverlayAdapter,
  "color-block": colorBlockAdapter,
  shape: shapeAdapter,
  // Image — simple positioned img
  image: ({ style, ...props }) =>
    React.createElement(
      "div",
      {
        style: { position: "absolute" as const, ...style },
      },
      React.createElement("img", {
        src: props.src as string,
        style: { width: "100%", height: "100%", objectFit: "contain" as const },
      }),
    ),
  // Structural primitives — registered later via registerPrimitive()
  // (timeline-node, cycle-connector, flow-step, card-stack, layer-stack)
};

/**
 * Register a new primitive adapter at runtime.
 * Used by structural primitives to add themselves to the registry.
 */
export function registerPrimitive(
  type: string,
  adapter: PrimitiveAdapter,
): void {
  registry[type] = adapter;
}

/**
 * Look up a primitive adapter by VCLElementType string.
 * Returns undefined for unknown types (caller should warn and skip).
 */
export function getPrimitive(type: string): PrimitiveAdapter | undefined {
  return registry[type];
}

/** The full primitive registry (read-only access). */
export const primitiveRegistry = registry;

// --- Structural primitive registration ---
import { TimelineNode } from "@/components/primitives/structure/TimelineNode";
import { CycleConnector } from "@/components/primitives/structure/CycleConnector";
import { FlowStep } from "@/components/primitives/structure/FlowStep";
import { CardStack } from "@/components/primitives/structure/CardStack";
import { LayerStack } from "@/components/primitives/structure/LayerStack";

registerPrimitive("timeline-node", ({ style, format, theme, ...props }) =>
  positioned(
    style,
    React.createElement(TimelineNode, {
      format,
      theme,
      label: (props.label as string) ?? "",
      description: props.description as string | undefined,
      highlighted: (props.highlighted as boolean) ?? false,
      index: (props.index as number) ?? 0,
    }),
  ),
);

registerPrimitive("cycle-connector", ({ style, format, theme, ...props }) =>
  React.createElement(CycleConnector, {
    format,
    theme,
    fromPos: (props.fromPos as {
      left: number;
      top: number;
      width: number;
      height: number;
    }) ?? { left: 0, top: 0, width: 0, height: 0 },
    toPos: (props.toPos as {
      left: number;
      top: number;
      width: number;
      height: number;
    }) ?? { left: 0, top: 0, width: 0, height: 0 },
    centerX: (props.centerX as number) ?? 960,
    centerY: (props.centerY as number) ?? 540,
    radius: (props.radius as number) ?? 200,
    dotted: (props.dotted as boolean) ?? false,
    style: {
      position: "absolute" as const,
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
    },
  }),
);

registerPrimitive("flow-step", ({ style, format, theme, ...props }) =>
  positioned(
    style,
    React.createElement(FlowStep, {
      format,
      theme,
      stepNumber: (props.stepNumber as number) ?? 1,
      title: (props.title as string) ?? "",
      detail: props.detail as string | undefined,
    }),
  ),
);

registerPrimitive("card-stack", ({ style, format, theme, ...props }) =>
  positioned(
    style,
    React.createElement(
      CardStack,
      {
        format,
        theme,
        offsetPx: props.offsetPx as number | undefined,
        direction: (props.direction as "down" | "right" | undefined) ?? "down",
      },
      (props.children as React.ReactNode) ?? null,
    ),
  ),
);

registerPrimitive("layer-stack", ({ style, format, theme, ...props }) =>
  positioned(
    style,
    React.createElement(
      LayerStack,
      { format, theme },
      (props.children as React.ReactNode) ?? null,
    ),
  ),
);
