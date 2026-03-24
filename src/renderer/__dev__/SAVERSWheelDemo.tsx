// ============================================================
// SAVERS Wheel Demo — Dev-only composition for visual verification
// Usage: import and register in Root.tsx for Remotion Studio preview
// ============================================================

import React from "react";
import { Composition } from "remotion";
import { BlueprintRenderer } from "@/renderer/BlueprintRenderer";
import { saversWheelBlueprint } from "@/renderer/__tests__/saversWheel.fixture";

export const SAVERSWheelComposition: React.FC = () => {
  return <BlueprintRenderer blueprint={saversWheelBlueprint} />;
};

/**
 * Register this composition in Root.tsx for dev preview:
 *
 * ```tsx
 * import { SAVERSWheelRegistration } from '@/renderer/__dev__/SAVERSWheelDemo'
 * // Inside Root component:
 * <SAVERSWheelRegistration />
 * ```
 */
export const SAVERSWheelRegistration: React.FC = () => {
  return (
    <Composition
      id="savers-wheel-demo"
      component={SAVERSWheelComposition}
      durationInFrames={saversWheelBlueprint.durationFrames}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};

export default SAVERSWheelComposition;
