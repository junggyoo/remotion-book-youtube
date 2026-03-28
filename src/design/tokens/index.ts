export { colors } from "./colors";
export { typography } from "./typography";
export { spacing, sp } from "./spacing";
export { radius } from "./radius";
export { shadow } from "./shadow";
export { layout } from "./layout";
export {
  motionPresets,
  resolvePreset,
  applyPreset,
  shortsPresetDuration,
} from "./motion";
export type { MotionPresetKey, ResolvedMotionConfig } from "./motion";
export { zIndex } from "./zIndex";
export {
  CHANNEL_PRIORITY,
  RECOVERY_WINDOW_FRAMES,
  HOLD_COMPLETION_FRAMES,
  BASE_POLICY,
  getEffectivePolicy,
  getActiveChannelCap,
  shouldChannelActivate,
} from "./emphasisPolicy";

import { colors } from "./colors";
import { typography } from "./typography";
import { spacing } from "./spacing";
import { radius } from "./radius";
import { shadow } from "./shadow";
import { layout } from "./layout";
import { zIndex } from "./zIndex";

/** Combined token object for convenient access. */
export const tokens = {
  colors,
  typography,
  spacing,
  radius,
  shadow,
  layout,
  zIndex,
} as const;
