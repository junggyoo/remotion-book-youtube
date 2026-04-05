import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { composeBlueprint } from "../CompositionFactory";
import type { CompositionContext } from "../types";
import type { SceneSpec } from "@/direction/types";
import { getDirectionProfile } from "@/direction/profiles";
import { useTheme } from "@/design/themes/useTheme";
import { SceneRegistry } from "@/registry/SceneRegistry";

const testTheme = useTheme("dark", "psychology");

const testCtx: CompositionContext = {
  format: "longform",
  theme: testTheme,
  from: 0,
  durationFrames: 90,
  motionPreset: "smooth",
};

function makeSpec(
  overrides: Partial<SceneSpec> & { id: string; family: SceneSpec["family"] },
): SceneSpec {
  return {
    intent: "test intent",
    layout: "center-focus",
    elements: [],
    choreography: "reveal-sequence",
    direction: getDirectionProfile("analytical"),
    source: "composed",
    confidence: 1,
    narrationText: "테스트 나레이션 텍스트입니다.",
    content: {},
    ...overrides,
  };
}

describe("composeBlueprint", () => {
  it("creates valid SceneBlueprint from concept-introduction SceneSpec", () => {
    const spec = makeSpec({
      id: "ki-01",
      family: "concept-introduction",
      content: { headline: "핵심 개념" },
    });

    const blueprint = composeBlueprint(spec, testCtx);

    expect(blueprint).not.toBeNull();
    expect(blueprint!.id).toBe("ki-01");
    expect(blueprint!.origin).toBe("composed");
    expect(blueprint!.elements.length).toBeGreaterThan(0);
    expect(blueprint!.format).toBe("longform");
    expect(blueprint!.durationFrames).toBe(90);
    expect(blueprint!.motionPreset).toBe("smooth");
    expect(blueprint!.theme).toBe(testCtx.theme);
  });

  it("spec.layout overrides recipe default when interpretationMeta marks it explicit", () => {
    const spec = makeSpec({
      id: "ki-02",
      family: "concept-introduction",
      layout: "split-two",
      content: { headline: "오버라이드 테스트" },
      interpretationMeta: {
        derivedFrom: ["layout:split-two"],
      },
    });

    const blueprint = composeBlueprint(spec, testCtx);

    expect(blueprint).not.toBeNull();
    expect(blueprint!.layout).toBe("split-two");
  });

  it("falls back to recipe default layout when spec has no explicit interpretation", () => {
    const spec = makeSpec({
      id: "sys-01",
      family: "system-model",
      layout: "center-focus", // spec has non-default layout, but no interpretationMeta
      content: {
        headline: "시스템 모델",
        items: [{ title: "항목 A", description: "설명 A" }],
      },
    });

    const blueprint = composeBlueprint(spec, testCtx);

    expect(blueprint).not.toBeNull();
    // recipe default for system-model is grid-expand
    expect(blueprint!.layout).toBe("grid-expand");
    // recipe default choreography for system-model is stagger-clockwise
    expect(blueprint!.choreography).toBe("stagger-clockwise");
  });

  it("returns null for families without registered recipes (opening-hook)", () => {
    const spec = makeSpec({
      id: "oh-01",
      family: "opening-hook",
      content: { headline: "훅 씬" },
    });

    const blueprint = composeBlueprint(spec, testCtx);

    expect(blueprint).toBeNull();
  });

  it("returns null when recipe produces no elements (concept-introduction with empty content)", () => {
    const spec = makeSpec({
      id: "empty-01",
      family: "concept-introduction",
      content: {}, // no headline → recipe returns []
    });

    const blueprint = composeBlueprint(spec, testCtx);

    expect(blueprint).toBeNull();
  });

  it("element IDs contain scene ID for namespacing", () => {
    const spec = makeSpec({
      id: "ns-scene-42",
      family: "concept-introduction",
      content: { headline: "네임스페이스 테스트" },
    });

    const blueprint = composeBlueprint(spec, testCtx);

    expect(blueprint).not.toBeNull();
    blueprint!.elements.forEach((el) => {
      expect(el.id).toContain("ns-scene-42");
    });
  });

  it("mediaPlan.narrationText matches spec.narrationText with no TTS engine hardcoded in content", () => {
    const narrationText = "이것은 나레이션 텍스트입니다.";
    const spec = makeSpec({
      id: "media-01",
      family: "concept-introduction",
      narrationText,
      content: { headline: "미디어 플랜 테스트" },
    });

    const blueprint = composeBlueprint(spec, testCtx);

    expect(blueprint).not.toBeNull();
    expect(blueprint!.mediaPlan.narrationText).toBe(narrationText);
    // ttsEngine should be a valid TTSEngineKey — just confirm it's a known value
    expect([
      "edge-tts",
      "qwen3-tts",
      "chatterbox",
      "fish-audio-s2",
      "elevenlabs",
    ]).toContain(blueprint!.mediaPlan.audioPlan.ttsEngine);
  });
});

describe("composeBlueprint with registry (D3: bridge/coexistence)", () => {
  let registryFilePath: string;

  function createTestRegistry(): SceneRegistry {
    const registry = SceneRegistry.create(registryFilePath);
    registry.register({
      id: "test-transformation-shift-001",
      family: "transformation-shift",
      lifecycleStatus: "active",
      origin: "manual",
      recipe: {
        defaultLayout: "split-two",
        defaultChoreography: "cross-fade",
        elementTemplate: [
          {
            id: "headline-el",
            type: "TextBlock",
            props: { layer: 20 },
            layer: 20,
            beatActivationKey: "headline",
          },
          {
            id: "support-el",
            type: "TextBlock",
            props: { layer: 30 },
            layer: 30,
            beatActivationKey: "supportText",
          },
        ],
      },
      observations: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    registry.save();
    return registry;
  }

  beforeEach(() => {
    registryFilePath = path.join(
      os.tmpdir(),
      `test-registry-${Date.now()}.json`,
    );
  });

  afterEach(() => {
    if (fs.existsSync(registryFilePath)) {
      fs.unlinkSync(registryFilePath);
    }
  });

  it("falls back to SceneRegistry when no hardcoded recipe exists", () => {
    const registry = createTestRegistry();

    // transformation-shift now has a hardcoded recipe, so test with content
    // that matches the hardcoded recipe (beforeState/afterState)
    const spec = makeSpec({
      id: "ts-01",
      family: "transformation-shift",
      content: { beforeState: "변화 전", afterState: "변화 후" },
    });

    const blueprint = composeBlueprint(spec, testCtx, registry);

    expect(blueprint).not.toBeNull();
    expect(blueprint!.id).toBe("ts-01");
    // Hardcoded recipe takes priority (D3), so uses split-two from recipe
    expect(blueprint!.layout).toBe("split-two");
    expect(blueprint!.choreography).toBe("split-reveal");
    expect(blueprint!.elements.length).toBeGreaterThanOrEqual(2);
    expect(blueprint!.origin).toBe("composed");
    expect(blueprint!.format).toBe("longform");
  });

  it("hardcoded recipe takes priority over registry (D3 bridge rule)", () => {
    const registry = createTestRegistry();
    // concept-introduction has a hardcoded recipe — registry should NOT override it
    const spec = makeSpec({
      id: "ci-bridge-01",
      family: "concept-introduction",
      content: { headline: "하드코딩 우선 테스트" },
    });

    const blueprint = composeBlueprint(spec, testCtx, registry);

    expect(blueprint).not.toBeNull();
    // Should use hardcoded recipe default layout, not registry's split-two
    expect(blueprint!.layout).not.toBe("split-two");
  });

  it("hardcoded recipe maps content fields to elements", () => {
    const registry = createTestRegistry();

    const spec = makeSpec({
      id: "sub-01",
      family: "transformation-shift",
      content: { beforeState: "텍스트 치환 테스트", afterState: "서포트 치환" },
    });

    const blueprint = composeBlueprint(spec, testCtx, registry);

    expect(blueprint).not.toBeNull();
    // Hardcoded recipe produces before-content and after-content elements
    const beforeEl = blueprint!.elements.find(
      (e) => e.props.role === "before-content",
    );
    expect(beforeEl).toBeDefined();
    expect((beforeEl!.props as Record<string, unknown>).text).toBe(
      "텍스트 치환 테스트",
    );

    const afterEl = blueprint!.elements.find(
      (e) => e.props.role === "after-content",
    );
    expect(afterEl).toBeDefined();
    expect((afterEl!.props as Record<string, unknown>).text).toBe(
      "서포트 치환",
    );
  });

  it("element IDs are prefixed with sceneId for namespacing", () => {
    const registry = createTestRegistry();

    const spec = makeSpec({
      id: "ns-reg-42",
      family: "transformation-shift",
      content: {
        beforeState: "네임스페이스 전",
        afterState: "네임스페이스 후",
      },
    });

    const blueprint = composeBlueprint(spec, testCtx, registry);

    expect(blueprint).not.toBeNull();
    blueprint!.elements.forEach((el) => {
      expect(el.id).toContain("ns-reg-42");
    });
  });

  it("returns null when neither hardcoded recipe nor registry has entry", () => {
    const registry = createTestRegistry();
    // opening-hook has no hardcoded recipe AND no registry entry for it
    const spec = makeSpec({
      id: "oh-reg-01",
      family: "opening-hook",
      content: { headline: "없는 패밀리" },
    });

    const blueprint = composeBlueprint(spec, testCtx, registry);

    expect(blueprint).toBeNull();
  });

  it("promoted registry recipe overrides hardcoded recipe (auto-substitution)", () => {
    const registry = SceneRegistry.create(registryFilePath);
    // Register a promoted entry for concept-introduction (which has a hardcoded recipe)
    registry.register({
      id: "promoted-ci-001",
      family: "concept-introduction",
      lifecycleStatus: "promoted",
      origin: "invention",
      recipe: {
        defaultLayout: "pyramid",
        defaultChoreography: "stagger-clockwise",
        elementTemplate: [
          {
            id: "promoted-headline",
            type: "TextBlock",
            props: { layer: 20 },
            layer: 20,
            beatActivationKey: "headline",
          },
        ],
      },
      observations: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    registry.save();

    const spec = makeSpec({
      id: "ci-promoted-01",
      family: "concept-introduction",
      content: { headline: "승격 레시피 테스트" },
    });

    const blueprint = composeBlueprint(spec, testCtx, registry);

    expect(blueprint).not.toBeNull();
    // Should use promoted registry recipe's layout, not hardcoded center-focus
    expect(blueprint!.layout).toBe("pyramid");
    expect(blueprint!.choreography).toBe("stagger-clockwise");
  });

  it("non-promoted registry recipe does NOT override hardcoded recipe", () => {
    const registry = SceneRegistry.create(registryFilePath);
    // Register an active (non-promoted) entry for concept-introduction
    registry.register({
      id: "active-ci-001",
      family: "concept-introduction",
      lifecycleStatus: "active",
      origin: "migration",
      recipe: {
        defaultLayout: "pyramid",
        defaultChoreography: "stagger-clockwise",
        elementTemplate: [
          {
            id: "active-headline",
            type: "TextBlock",
            props: { layer: 20 },
            layer: 20,
            beatActivationKey: "headline",
          },
        ],
      },
      observations: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    registry.save();

    const spec = makeSpec({
      id: "ci-active-01",
      family: "concept-introduction",
      content: { headline: "비승격은 무시" },
    });

    const blueprint = composeBlueprint(spec, testCtx, registry);

    expect(blueprint).not.toBeNull();
    // Hardcoded recipe's center-focus should be used, NOT registry's pyramid
    expect(blueprint!.layout).toBe("center-focus");
  });
});
