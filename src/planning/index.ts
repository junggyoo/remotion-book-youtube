export type {
  EditorialOutline,
  BookArtDirection,
  StoryboardPlan,
  StoryboardScene,
  AssetInventory,
  PlanningAssetRequirement,
  MotionPlan,
  SceneMotionPlan,
  BookThemeOverrides,
  BookPlan,
  ResolvedScene,
  PlanBridgeResult,
  VisualFunction,
  ValidationPhase,
  PlanValidationResult,
  PlanValidationCheck,
} from "./types";

export { resolvePlanBridge } from "./plan-bridge";
export { resolveBookTheme } from "./theme-resolver";
export type { ResolvedArtInfluence } from "./theme-resolver";
export { resolveBlueprint, listBlueprints } from "./blueprint-resolver";
export { loadBookPlan } from "./loaders/load-book-plan";
export {
  savePlanArtifact,
  saveBlueprintArtifact,
  saveValidationResult,
} from "./loaders/save-book-plan";
export { metaphorToDiagramSpec, extractDiagramSpecs } from "./diagramSpec";
export type { DiagramSpecMatch } from "./diagramSpec";
export { buildDiagramGeometry } from "./diagramGeometry";
export type {
  DiagramGeometry,
  DiagramNode,
  DiagramConnection,
} from "./diagramGeometry";
