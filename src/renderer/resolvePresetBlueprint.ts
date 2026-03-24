import type { SceneBlueprint, TypedScene } from '@/types'
import type { ResolveContext } from './presetBlueprints/types'
import { presetBlueprintRegistry, hasPresetBlueprint } from './presetBlueprints'

/**
 * Resolves a TypedScene into a SceneBlueprint using the preset blueprint registry.
 * Returns null if the scene type has no preset blueprint (e.g., newer types without catalog entries).
 * Throws if format is 'both' — caller must resolve to 'longform' or 'shorts' first.
 */
export function resolvePresetBlueprint(
  scene: TypedScene,
  ctx: Omit<ResolveContext, 'narrationText'> & { narrationText?: string }
): SceneBlueprint | null {
  // 1. Reject format 'both' — caller must resolve
  if ((ctx.format as string) === 'both') {
    throw new Error(
      'format "both" is not allowed in ResolveContext; resolve to longform or shorts before calling'
    )
  }

  // 2. Check if scene.type has a preset blueprint
  if (!hasPresetBlueprint(scene.type)) return null

  // 3. Build full context (narrationText from ctx or scene or empty string)
  const fullCtx: ResolveContext = {
    ...ctx,
    narrationText: ctx.narrationText ?? scene.narrationText ?? '',
  }

  // 4. Look up factory and call with scene.content
  const factory = presetBlueprintRegistry[scene.type]
  // TypedScene is a discriminated union; content type matches factory via registry
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blueprint = factory((scene as any).content, fullCtx)

  // 5. Apply scene-level overrides
  if (scene.layoutArchetypeOverride) {
    blueprint.layout = scene.layoutArchetypeOverride
  }
  if (scene.motionPresetOverride) {
    blueprint.motionPreset = scene.motionPresetOverride
  }
  if (scene.durationFrames) {
    blueprint.durationFrames = scene.durationFrames
  }

  return blueprint
}
