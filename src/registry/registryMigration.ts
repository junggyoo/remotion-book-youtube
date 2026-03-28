/**
 * D4: Migration은 sample-based extraction (임시 전략).
 * 장기적으로는 family recipe가 explicit template metadata를 제공해야 한다.
 * TODO: FamilyRecipe에 describeTemplate() 메서드 추가 후 이 방식 교체
 */

import { recipeRegistry } from "@/composition/familyRecipes";
import type { SceneFamily } from "@/direction/types";
import type { RegistryEntry, ElementTemplate } from "./types";
import type { SceneRegistry } from "./SceneRegistry";
import type { VCLElement } from "@/types";

// Only these 3 original families are migrated (Task 1+2 scope)
const MIGRATION_FAMILIES: SceneFamily[] = [
  "concept-introduction",
  "system-model",
  "progression-journey",
];

/**
 * Convert VCLElements (from sample resolve) to ElementTemplates.
 * Strip sample content values, keep structural metadata only.
 */
function toElementTemplates(elements: VCLElement[]): ElementTemplate[] {
  return elements.map((el) => ({
    id: el.id,
    type: el.type,
    props: {}, // stripped — sample values are not structural
    layer: (el.props.layer as number) ?? 20,
    beatActivationKey: (el.props.role as string) ?? el.id,
  }));
}

/**
 * Migrate built-in family recipes into the SceneRegistry as active/migration entries.
 *
 * For each recipe in MIGRATION_FAMILIES:
 * 1. Skip if registry already has entries for that family
 * 2. Call recipe.resolve() with sample content to extract element structure
 * 3. Convert VCLElements to ElementTemplate[] (strip sample values)
 * 4. Register as RegistryEntry with lifecycleStatus: "active", origin: "migration"
 *
 * @returns count of newly migrated entries
 */
export function migrateBuiltinRecipes(registry: SceneRegistry): number {
  let count = 0;
  const now = new Date().toISOString();

  for (const family of MIGRATION_FAMILIES) {
    // Skip if already migrated
    const existing = registry.getByFamily(family);
    if (existing.length > 0) continue;

    const recipe = recipeRegistry[family];
    if (!recipe) continue;

    // Sample-based extraction: resolve with minimal sample content
    const sampleContent: Record<string, unknown> = {
      headline: "sample",
      supportText: "sample",
      evidence: "sample",
      items: [
        { title: "sample", description: "sample" },
        { title: "sample2", description: "sample2" },
      ],
      steps: [
        { title: "sample", detail: "sample" },
        { title: "sample2", detail: "sample2" },
      ],
    };

    const sampleElements = recipe.resolve(sampleContent, {
      sceneId: `migration-${family}`,
    });

    if (sampleElements.length === 0) continue;

    const entry: RegistryEntry = {
      id: `migration-${family}`,
      family,
      lifecycleStatus: "active",
      origin: "migration",
      recipe: {
        defaultLayout: recipe.defaultLayout,
        defaultChoreography: recipe.defaultChoreography,
        elementTemplate: toElementTemplates(sampleElements),
      },
      observations: [],
      version: 1,
      createdAt: now,
      updatedAt: now,
      statusReason:
        "Migrated from static recipeRegistry (sample-based extraction)",
    };

    registry.register(entry);
    count++;
  }

  return count;
}
