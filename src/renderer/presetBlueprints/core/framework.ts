// ============================================================
// framework preset blueprint factory
// Layout: grid-expand | Choreography: stagger-clockwise
// ============================================================

import type { FrameworkContent, SceneBlueprint, VCLElement } from "@/types";
import type { ResolveContext } from "../types";
import { buildDefaultMediaPlan } from "../types";
import sceneCatalog from "@/schema/scene-catalog.json";
import { metaphorToDiagramSpec } from "@/planning/diagramSpec";
import { buildDiagramGeometry } from "@/planning/diagramGeometry";
import { buildDiagramElements } from "@/planner/elementBuilders";

const CATALOG = sceneCatalog.scenes.framework;

// --- P2-1f: Diagram pipeline integration ---

const DIAGRAM_LAYER = 15; // between texture(5) and frameworkLabel(20)
const DIAGRAM_OPACITY = 0.2;

/**
 * Attempts to build diagram VCL elements for a framework scene.
 * Only activates when content.diagramHint is explicitly set.
 * Returns null on any failure (graceful fallback to non-diagram layout).
 */
function tryBuildDiagramForFramework(
  content: FrameworkContent,
  ctx: ResolveContext,
): VCLElement[] | null {
  // Only explicit diagramHint — no auto-detect (deferred to P3)
  const metaphor = content.diagramHint;
  if (!metaphor) return null;

  // Spread copy to avoid mutating cached spec objects
  const baseSpec = metaphorToDiagramSpec(metaphor);
  if (!baseSpec) return null;
  const spec = {
    ...baseSpec,
    nodeCount: content.items.length,
    nodeLabels: content.items.map((item) => item.title),
  };

  const [canvasW, canvasH] =
    ctx.format === "shorts" ? [1080, 1920] : [1920, 1080];

  try {
    const geometry = buildDiagramGeometry(spec, canvasW, canvasH);
    const elements = buildDiagramElements(spec, geometry);

    // Diagram as background auxiliary layer (Option B)
    return elements.map((el) => ({
      ...el,
      props: {
        ...el.props,
        opacity: DIAGRAM_OPACITY,
        layer: DIAGRAM_LAYER,
      },
    }));
  } catch {
    return null;
  }
}

export function createFrameworkBlueprint(
  content: FrameworkContent,
  ctx: ResolveContext,
): SceneBlueprint {
  // Dynamic elements: each item generates number-display + body-text(title) + optional body-text(desc)
  const itemElements: VCLElement[] = content.items.flatMap((item, index) => {
    const els: VCLElement[] = [
      {
        id: `framework-items-${index}-number`,
        type: "number-display",
        props: {
          value: item.number,
          layer: CATALOG.layers.items,
          tokenRef: "typeScale.headlineS",
          variant: "accent",
          index,
        },
      },
      {
        id: `framework-items-${index}-title`,
        type: "body-text",
        props: {
          text: item.title,
          layer: CATALOG.layers.items,
          tokenRef: "typeScale.bodyL",
          weight: "bold",
          index,
        },
      },
    ];

    if (item.description) {
      els.push({
        id: `framework-items-${index}-description`,
        type: "body-text",
        props: {
          text: item.description,
          layer: CATALOG.layers.items,
          tokenRef: "typeScale.bodyS",
          color: "textMuted",
          index,
        },
      });
    }

    if (item.iconId) {
      els.push({
        id: `framework-items-${index}-icon`,
        type: "icon",
        props: {
          iconId: item.iconId,
          layer: CATALOG.layers.items,
          index,
        },
      });
    }

    return els;
  });

  // P2-1f: Try to build diagram elements from diagramHint
  const diagramElements = tryBuildDiagramForFramework(content, ctx);
  const hasDiagram = diagramElements != null && diagramElements.length > 0;

  const elements: VCLElement[] = [
    {
      id: "framework-texture",
      type: "texture-overlay",
      props: { layer: CATALOG.layers.texture },
    },
    // P2-1f: Diagram elements as background auxiliary (when present)
    ...(hasDiagram ? diagramElements : []),
    {
      id: "framework-frameworkLabel",
      type: "label",
      props: {
        text: content.frameworkLabel,
        layer: CATALOG.layers.frameworkLabel,
        tokenRef: "typeScale.headlineS",
        color: "signal",
      },
    },
    ...itemElements,
    // Old divider connectors: suppressed when diagram is present (prevents visual duplication)
    ...(content.showConnectors && !hasDiagram
      ? [
          {
            id: "framework-connectors",
            type: "divider" as const,
            props: {
              layer: CATALOG.layers.connectors,
              role: "item-connector",
              dotted: true,
            },
          },
        ]
      : []),
  ];

  return {
    id: `preset-framework-${ctx.from}`,
    intent: `Framework grid with ${content.items.length} item(s) in stagger-clockwise reveal`,
    origin: "preset",
    layout: CATALOG.layoutArchetype as "grid-expand",
    elements,
    choreography: "stagger-clockwise",
    motionPreset: CATALOG.motionPreset as "smooth",
    format: ctx.format,
    theme: ctx.theme,
    from: ctx.from,
    durationFrames: ctx.durationFrames ?? CATALOG.durationFramesDefault,
    mediaPlan: buildDefaultMediaPlan(ctx.narrationText, ctx),
  };
}
