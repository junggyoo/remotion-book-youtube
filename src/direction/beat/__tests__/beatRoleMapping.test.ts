import { describe, it, expect } from "vitest";
import { toSemanticRole, toLegacyRole } from "../beatRoleMapping";

describe("toSemanticRole", () => {
  it("maps all known legacy roles correctly", () => {
    expect(toSemanticRole("hook")).toBe("anchor");
    expect(toSemanticRole("headline")).toBe("anchor");
    expect(toSemanticRole("support")).toBe("evidence");
    expect(toSemanticRole("evidence")).toBe("evidence");
    expect(toSemanticRole("reveal")).toBe("reveal");
    expect(toSemanticRole("compare")).toBe("contrast");
    expect(toSemanticRole("transition")).toBe("bridge");
    expect(toSemanticRole("recap")).toBe("reflection");
  });

  it("passes unknown roles through unchanged", () => {
    expect(toSemanticRole("custom-role")).toBe("custom-role");
    expect(toSemanticRole("something-new")).toBe("something-new");
  });
});

describe("toLegacyRole", () => {
  it("maps all known semantic roles correctly", () => {
    expect(toLegacyRole("anchor")).toBe("headline");
    expect(toLegacyRole("evidence")).toBe("evidence");
    expect(toLegacyRole("reveal")).toBe("reveal");
    expect(toLegacyRole("contrast")).toBe("compare");
    expect(toLegacyRole("escalation")).toBe("hook");
    expect(toLegacyRole("reflection")).toBe("support");
    expect(toLegacyRole("bridge")).toBe("transition");
  });

  it("passes unknown roles through unchanged", () => {
    expect(toLegacyRole("custom-role")).toBe("custom-role");
    expect(toLegacyRole("unknown")).toBe("unknown");
  });
});

describe("round-trip mapping", () => {
  it("toLegacyRole(toSemanticRole(x)) produces a reasonable legacy role", () => {
    // reveal -> reveal -> reveal (identity)
    expect(toLegacyRole(toSemanticRole("reveal"))).toBe("reveal");
    // evidence -> evidence -> evidence (identity)
    expect(toLegacyRole(toSemanticRole("evidence"))).toBe("evidence");
    // hook -> anchor -> headline (converges to headline since hook and headline both map to anchor)
    expect(toLegacyRole(toSemanticRole("hook"))).toBe("headline");
    // headline -> anchor -> headline (identity)
    expect(toLegacyRole(toSemanticRole("headline"))).toBe("headline");
    // compare -> contrast -> compare (identity)
    expect(toLegacyRole(toSemanticRole("compare"))).toBe("compare");
    // transition -> bridge -> transition (identity)
    expect(toLegacyRole(toSemanticRole("transition"))).toBe("transition");
    // support -> evidence -> evidence (converges)
    expect(toLegacyRole(toSemanticRole("support"))).toBe("evidence");
    // recap -> reflection -> support (converges)
    expect(toLegacyRole(toSemanticRole("recap"))).toBe("support");
  });

  it("unknown roles survive round-trip", () => {
    expect(toLegacyRole(toSemanticRole("my-custom"))).toBe("my-custom");
  });
});
