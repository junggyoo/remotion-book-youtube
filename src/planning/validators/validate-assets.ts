import type { PlanValidationCheck, AssetInventory } from "../types";

export function validateAssets(
  inventory: AssetInventory,
): PlanValidationCheck[] {
  const checks: PlanValidationCheck[] = [];
  const needed = inventory.required.filter((a) => a.status === "needed");
  const placeholder = inventory.required.filter(
    (a) => a.status === "placeholder",
  );
  const ready = inventory.required.filter((a) => a.status === "ready");

  if (needed.length > 0) {
    checks.push({
      id: "assets-needed",
      level: "WARN",
      passed: false,
      message: `${needed.length} needed: ${needed.map((a) => a.id).join(", ")}`,
    });
  }
  checks.push({
    id: "assets-summary",
    level: "INFO",
    passed: true,
    message: `${ready.length} ready, ${placeholder.length} placeholder, ${needed.length} needed`,
  });
  return checks;
}
