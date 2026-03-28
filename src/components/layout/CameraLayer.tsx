import React, { useMemo, useRef } from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import type {
  CameraMode,
  SceneElementLayoutMeta,
  SceneType,
  FormatKey,
  Beat,
} from "@/types";

// ---------------------------------------------------------------------------
// Scene type → default camera mode mapping
// ---------------------------------------------------------------------------

export const SCENE_CAMERA_DEFAULTS: Record<SceneType, CameraMode> = {
  cover: "static",
  chapterDivider: "static",
  keyInsight: "slow-zoom",
  compareContrast: "static",
  quote: "slow-zoom",
  framework: "static",
  application: "static",
  data: "static",
  closing: "static",
  timeline: "static",
  highlight: "guided",
  transition: "static",
  listReveal: "static",
  splitQuote: "static",
  custom: "static",
};

// ---------------------------------------------------------------------------
// Text density heuristic → travel limit
// ---------------------------------------------------------------------------

interface TravelLimit {
  x: number;
  y: number;
}

const TRAVEL_LIMIT_TEXT_DENSE: TravelLimit = { x: 8, y: 4 };
const TRAVEL_LIMIT_DEFAULT: TravelLimit = { x: 16, y: 12 };

const TEXT_DENSE_SCENE_TYPES: Set<SceneType> = new Set([
  "framework",
  "application",
  "listReveal",
  "data",
  "compareContrast",
]);

// ---------------------------------------------------------------------------
// Camera spring config (spec: very slow and smooth)
// ---------------------------------------------------------------------------

const CAMERA_SPRING_CONFIG = {
  stiffness: 40,
  damping: 28,
  mass: 1,
};

// ---------------------------------------------------------------------------
// CameraLayer Props
// ---------------------------------------------------------------------------

interface CameraLayerProps {
  mode: CameraMode;
  /** Intensity 0~1, controls zoom/move magnitude. Default 0.3 */
  intensity?: number;
  /** Element layout metadata for guided mode */
  layoutMeta?: SceneElementLayoutMeta[];
  /** Primary focus element ID from storyboard */
  primaryFocusId?: string;
  /** Current format — shorts forces static */
  format?: FormatKey;
  /** Scene type — for text density heuristic */
  sceneType?: SceneType;
  /** Current active beat — for guided mode camera targeting */
  activeBeat?: Beat | null;
  /** Scene duration in frames */
  durationFrames?: number;
  /** P2-4: emphasis gate — when false, guided mode holds position (no new targeting) */
  emphasisGateActive?: boolean;
  /** P2-4: recovery window active — camera freezes at current position */
  isRecovering?: boolean;
  children: React.ReactNode;
}

/**
 * CameraLayer — Scene-level camera work (P2-2).
 *
 * Applies subtle camera transforms to the scene content:
 * - static: no transform (passthrough)
 * - slow-zoom: gentle scale-up over scene duration
 * - guided: follows important beats toward focus elements
 *
 * Applies 2D transforms only (no perspective/3D). willChange creates a stacking context
 * but this is intentional — CameraLayer wraps all scene content uniformly.
 * Shorts format forces static mode for readability.
 */
export const CameraLayer: React.FC<CameraLayerProps> = ({
  mode,
  intensity = 0.3,
  layoutMeta,
  primaryFocusId,
  format,
  sceneType,
  activeBeat,
  durationFrames = 300,
  emphasisGateActive = true,
  isRecovering = false,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Shorts → always static (spec: vertical screen camera movement hurts readability)
  const effectiveMode: CameraMode = format === "shorts" ? "static" : mode;

  // --- Static: passthrough ---
  if (effectiveMode === "static") {
    return <>{children}</>;
  }

  // --- Slow-zoom mode ---
  if (effectiveMode === "slow-zoom") {
    return (
      <SlowZoomWrapper
        frame={frame}
        intensity={intensity}
        durationFrames={durationFrames}
      >
        {children}
      </SlowZoomWrapper>
    );
  }

  // --- Guided mode ---
  return (
    <GuidedWrapper
      frame={frame}
      fps={fps}
      intensity={intensity}
      layoutMeta={layoutMeta}
      primaryFocusId={primaryFocusId}
      sceneType={sceneType}
      activeBeat={activeBeat}
      durationFrames={durationFrames}
      emphasisGateActive={emphasisGateActive}
      isRecovering={isRecovering}
    >
      {children}
    </GuidedWrapper>
  );
};

// ---------------------------------------------------------------------------
// SlowZoomWrapper — subtle scale over scene duration
// ---------------------------------------------------------------------------

interface SlowZoomWrapperProps {
  frame: number;
  intensity: number;
  durationFrames: number;
  children: React.ReactNode;
}

const SlowZoomWrapper: React.FC<SlowZoomWrapperProps> = ({
  frame,
  intensity,
  durationFrames,
  children,
}) => {
  // Max scale: intensity * 0.06 (so at intensity=1.0, max zoom = 1.06 = CLAUDE.md limit)
  // At default intensity 0.3, max zoom = 1.018
  const maxZoom = intensity * 0.06;

  // Linear progress over scene duration for smooth continuous zoom
  const progress = Math.min(1, frame / Math.max(1, durationFrames));

  // Ease-out for natural deceleration
  const easedProgress = 1 - Math.pow(1 - progress, 2);
  const scale = 1 + maxZoom * easedProgress;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        transform: `scale(${scale})`,
        transformOrigin: "center center",
        willChange: "transform",
      }}
    >
      {children}
    </div>
  );
};

// ---------------------------------------------------------------------------
// GuidedWrapper — beat-driven camera with spring smoothing
// ---------------------------------------------------------------------------

interface GuidedWrapperProps {
  frame: number;
  fps: number;
  intensity: number;
  layoutMeta?: SceneElementLayoutMeta[];
  primaryFocusId?: string;
  sceneType?: SceneType;
  activeBeat?: Beat | null;
  durationFrames: number;
  /** P2-4: emphasis gate — when false, do not respond to new emphasis beats */
  emphasisGateActive?: boolean;
  /** P2-4: recovery window — freeze camera at current position */
  isRecovering?: boolean;
  children: React.ReactNode;
}

const GuidedWrapper: React.FC<GuidedWrapperProps> = ({
  frame,
  fps,
  intensity,
  layoutMeta,
  primaryFocusId,
  sceneType,
  activeBeat,
  durationFrames,
  emphasisGateActive = true,
  isRecovering = false,
  children,
}) => {
  // Determine travel limits based on text density
  const travelLimit = useMemo((): TravelLimit => {
    if (sceneType && TEXT_DENSE_SCENE_TYPES.has(sceneType)) {
      return TRAVEL_LIMIT_TEXT_DENSE;
    }
    return TRAVEL_LIMIT_DEFAULT;
  }, [sceneType]);

  // Determine if current beat should trigger camera movement
  // P2-4: gate suppresses emphasis-driven movement; recovery freezes position
  const shouldRespondToBeat = useMemo((): boolean => {
    if (!activeBeat) return false;

    // P2-4: recovery window → camera holds current position
    if (isRecovering) return false;

    // Respond to emphasis beats (only if channel gate allows)
    if (activeBeat.transition === "emphasis") {
      return emphasisGateActive;
    }

    // Respond if beat activates the primaryFocus element
    if (primaryFocusId && activeBeat.activates.includes(primaryFocusId)) {
      return true;
    }

    // Normal reveal beats → camera stays still
    return false;
  }, [activeBeat, primaryFocusId, emphasisGateActive, isRecovering]);

  // Compute camera target from layoutMeta
  const target = useMemo((): { x: number; y: number } => {
    if (!shouldRespondToBeat || !activeBeat || !layoutMeta?.length) {
      return { x: 0, y: 0 };
    }

    // Find the target element position from layoutMeta
    // Priority: primaryFocusId > first activated element
    let targetMeta: SceneElementLayoutMeta | undefined;

    if (primaryFocusId) {
      targetMeta = layoutMeta.find((m) => m.elementId === primaryFocusId);
    }

    if (!targetMeta) {
      // Find first activated element in layoutMeta
      for (const key of activeBeat.activates) {
        const found = layoutMeta.find((m) => m.elementId === key);
        if (found) {
          targetMeta = found;
          break;
        }
      }
    }

    if (!targetMeta) {
      return { x: 0, y: 0 };
    }

    // Convert normalized anchor (0~1) to offset from center (0.5)
    // anchorX=0.5 → offset 0, anchorX=0.7 → offset toward right
    const rawX = (targetMeta.anchorX - 0.5) * -2; // invert: camera moves opposite to target
    const rawY = (targetMeta.anchorY - 0.5) * -2;

    // Apply travel limit and intensity
    const clampedX = Math.max(
      -travelLimit.x,
      Math.min(travelLimit.x, rawX * travelLimit.x * intensity),
    );
    const clampedY = Math.max(
      -travelLimit.y,
      Math.min(travelLimit.y, rawY * travelLimit.y * intensity),
    );

    return { x: clampedX, y: clampedY };
  }, [
    shouldRespondToBeat,
    activeBeat,
    layoutMeta,
    primaryFocusId,
    travelLimit,
    intensity,
  ]);

  // Track beat entry frame for beat-relative spring timing
  const beatEntryFrameRef = useRef<number>(0);
  const prevBeatIdRef = useRef<string | null>(null);

  // Update beat entry frame when active beat changes
  const currentBeatId = activeBeat?.id ?? null;
  if (currentBeatId !== prevBeatIdRef.current) {
    prevBeatIdRef.current = currentBeatId;
    if (shouldRespondToBeat) {
      beatEntryFrameRef.current = frame;
    }
  }

  // Spring-based smoothing — beat-relative frame timing
  const beatRelativeFrame = Math.max(0, frame - beatEntryFrameRef.current);
  const springProgress = spring({
    frame: beatRelativeFrame,
    fps,
    config: CAMERA_SPRING_CONFIG,
    durationInFrames: 90, // ~3 seconds for smooth camera settle
  });

  // Apply spring to target offset
  const translateX = interpolate(springProgress, [0, 1], [0, target.x], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const translateY = interpolate(springProgress, [0, 1], [0, target.y], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // No movement needed → passthrough
  if (target.x === 0 && target.y === 0) {
    return <>{children}</>;
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        transform: `translate(${translateX}px, ${translateY}px)`,
        transformOrigin: "center center",
        willChange: "transform",
      }}
    >
      {children}
    </div>
  );
};

// ---------------------------------------------------------------------------
// layersToLayoutMeta — convert static pixel positions to normalized anchors
// ---------------------------------------------------------------------------

/**
 * Convert static LAYERS-style position constants to SceneElementLayoutMeta[].
 * Normalizes pixel positions to 0~1 anchors based on canvas size.
 * Used by preset scenes (e.g. HighlightScene) whose element positions are
 * defined as static pixel/percentage values rather than a dynamic positionById Map.
 */
export function layersToLayoutMeta(
  layers: Record<
    string,
    { top?: number; left?: number; width?: number; height?: number }
  >,
  canvasWidth: number,
  canvasHeight: number,
): SceneElementLayoutMeta[] {
  return Object.entries(layers).map(([id, pos]) => ({
    elementId: id,
    anchorX: ((pos.left ?? 0) + (pos.width ?? 0) / 2) / canvasWidth,
    anchorY: ((pos.top ?? 0) + (pos.height ?? 0) / 2) / canvasHeight,
    widthRatio: (pos.width ?? 0) / canvasWidth,
    heightRatio: (pos.height ?? 0) / canvasHeight,
  }));
}

export default CameraLayer;
