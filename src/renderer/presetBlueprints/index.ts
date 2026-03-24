import type { CoreSceneType, PresetBlueprintFactory } from './types'
import { createCoverBlueprint } from './core/cover'
import { createChapterDividerBlueprint } from './core/chapterDivider'
import { createKeyInsightBlueprint } from './core/keyInsight'
import { createCompareContrastBlueprint } from './core/compareContrast'
import { createQuoteBlueprint } from './core/quote'
import { createFrameworkBlueprint } from './core/framework'
import { createApplicationBlueprint } from './core/application'
import { createDataBlueprint } from './core/data'
import { createClosingBlueprint } from './core/closing'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const presetBlueprintRegistry: Record<CoreSceneType, PresetBlueprintFactory<any>> = {
  cover: createCoverBlueprint,
  chapterDivider: createChapterDividerBlueprint,
  keyInsight: createKeyInsightBlueprint,
  compareContrast: createCompareContrastBlueprint,
  quote: createQuoteBlueprint,
  framework: createFrameworkBlueprint,
  application: createApplicationBlueprint,
  data: createDataBlueprint,
  closing: createClosingBlueprint,
}

const CORE_SCENE_TYPES = new Set<string>(Object.keys(presetBlueprintRegistry))

export function hasPresetBlueprint(type: string): type is CoreSceneType {
  return CORE_SCENE_TYPES.has(type)
}
