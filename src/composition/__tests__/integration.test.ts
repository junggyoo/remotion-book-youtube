import { describe, it, expect } from "vitest";
import { adaptPresetToSceneSpec } from "@/direction/presetAdapter";
import { tryComposeScene } from "../compositionPathRouter";
import type { CompositionContext } from "../types";
import type { SceneFamily } from "@/direction/types";
import { getDirectionProfile } from "@/direction/profiles";
import { useTheme } from "@/design/themes/useTheme";

const COMPOSED_FAMILIES: SceneFamily[] = [
  "concept-introduction",
  "system-model",
  "progression-journey",
];

const analyticalDirection = getDirectionProfile("analytical");
const testTheme = useTheme("dark", "selfHelp");

const baseCtx: CompositionContext = {
  format: "longform",
  theme: testTheme,
  from: 0,
  durationFrames: 150,
  motionPreset: "heavy",
};

// ─── Test 1: concept-introduction (keyInsight) flows through composed path ───
describe("concept-introduction (keyInsight) composed path", () => {
  it("produces a valid blueprint with origin:composed, 3 elements, layout:center-focus", () => {
    const spec = adaptPresetToSceneSpec(
      {
        id: "scene-ki-01",
        type: "keyInsight",
        narrationText: "핵심 인사이트입니다. 무려 37배입니다!",
        content: {
          headline: "습관은 정체성이다",
          supportText: "작은 변화가 복리로 쌓인다",
          evidence: "37배 성장 실증 연구",
        },
      },
      analyticalDirection,
      "framework",
      { composedFamilies: COMPOSED_FAMILIES },
    );

    expect(spec.source).toBe("composed");

    const blueprint = tryComposeScene(spec, baseCtx);

    expect(blueprint).not.toBeNull();
    expect(blueprint!.origin).toBe("composed");
    expect(blueprint!.elements).toHaveLength(3);
    expect(blueprint!.layout).toBe("center-focus");
  });
});

// ─── Test 2: system-model (framework) flows through composed path ─────────────
describe("system-model (framework) composed path", () => {
  it("produces headline + 4 items = 5 elements, layout:grid-expand, choreography:stagger-clockwise", () => {
    const spec = adaptPresetToSceneSpec(
      {
        id: "scene-fw-01",
        type: "framework",
        narrationText: "네 가지 법칙을 소개합니다.",
        content: {
          headline: "행동 변화의 4법칙",
          items: [
            { title: "분명하게", description: "단서를 명확히 한다" },
            { title: "매력적으로", description: "욕구를 자극한다" },
            { title: "쉽게", description: "저항을 줄인다" },
            { title: "만족스럽게", description: "보상을 즉각 제공한다" },
          ],
        },
      },
      analyticalDirection,
      "framework", // bookStructure=framework → system-model family
      { composedFamilies: COMPOSED_FAMILIES },
    );

    expect(spec.source).toBe("composed");
    expect(spec.family).toBe("system-model");

    const blueprint = tryComposeScene(spec, baseCtx);

    expect(blueprint).not.toBeNull();
    expect(blueprint!.elements).toHaveLength(5); // 1 headline + 4 items
    expect(blueprint!.layout).toBe("grid-expand");
    expect(blueprint!.choreography).toBe("stagger-clockwise");
  });
});

// ─── Test 3: progression-journey (application) flows through composed path ────
describe("progression-journey (application) composed path", () => {
  it("produces headline + 2 steps = 3 elements, layout:timeline-h, choreography:path-trace", () => {
    const spec = adaptPresetToSceneSpec(
      {
        id: "scene-app-01",
        type: "application",
        narrationText: "지금 당장 시작할 수 있습니다.",
        content: {
          headline: "오늘부터 실천하는 법",
          steps: [
            { title: "환경 설계", detail: "트리거를 눈에 띄게 배치한다" },
            { title: "2분 규칙", detail: "처음엔 2분만 투자한다" },
          ],
        },
      },
      analyticalDirection,
      "framework",
      { composedFamilies: COMPOSED_FAMILIES },
    );

    expect(spec.source).toBe("composed");
    expect(spec.family).toBe("progression-journey");

    const blueprint = tryComposeScene(spec, baseCtx);

    expect(blueprint).not.toBeNull();
    expect(blueprint!.elements).toHaveLength(3); // 1 headline + 2 steps
    expect(blueprint!.layout).toBe("timeline-h");
    expect(blueprint!.choreography).toBe("path-trace");
  });
});

// ─── Test 4: cover remains on preset path ────────────────────────────────────
describe("cover scene preset path", () => {
  it("returns source:preset and tryComposeScene returns null", () => {
    const spec = adaptPresetToSceneSpec(
      {
        id: "scene-cover-01",
        type: "cover",
        narrationText: "",
        content: { headline: "아토믹 해빗", author: "제임스 클리어" },
      },
      analyticalDirection,
      "framework",
      { composedFamilies: COMPOSED_FAMILIES },
    );

    expect(spec.source).toBe("preset");

    const blueprint = tryComposeScene(spec, baseCtx);
    expect(blueprint).toBeNull();
  });
});

// ─── Test 5: system-model with empty content falls back ──────────────────────
describe("system-model empty content fallback", () => {
  it("composed source but empty elements → tryComposeScene returns null", () => {
    const spec = adaptPresetToSceneSpec(
      {
        id: "scene-fw-empty",
        type: "framework",
        narrationText: "",
        content: {
          headline: "", // empty headline
          items: [], // no items
        },
      },
      analyticalDirection,
      "framework",
      { composedFamilies: COMPOSED_FAMILIES },
    );

    // source is composed (family is in COMPOSED_FAMILIES)
    expect(spec.source).toBe("composed");

    // but recipe returns [] → composeBlueprint returns null → tryComposeScene returns null
    const blueprint = tryComposeScene(spec, baseCtx);
    expect(blueprint).toBeNull();
  });
});

// ─── Test 6: progression-journey with no steps falls back ────────────────────
describe("progression-journey no steps fallback", () => {
  it("application type with no content → returns null", () => {
    const spec = adaptPresetToSceneSpec(
      {
        id: "scene-app-empty",
        type: "application",
        narrationText: "",
        content: {}, // no headline, no steps
      },
      analyticalDirection,
      "framework",
      { composedFamilies: COMPOSED_FAMILIES },
    );

    expect(spec.source).toBe("composed");

    const blueprint = tryComposeScene(spec, baseCtx);
    expect(blueprint).toBeNull();
  });
});

// ─── Test 7: low confidence scene falls back ─────────────────────────────────
describe("low confidence fallback", () => {
  it("keyInsight with confidence 0.3 → tryComposeScene returns null", () => {
    const spec = adaptPresetToSceneSpec(
      {
        id: "scene-ki-lowconf",
        type: "keyInsight",
        narrationText: "핵심 인사이트입니다.",
        content: {
          headline: "습관은 정체성이다",
          supportText: "작은 변화가 복리로 쌓인다",
        },
      },
      analyticalDirection,
      "framework",
      { composedFamilies: COMPOSED_FAMILIES },
    );

    expect(spec.source).toBe("composed");

    // Manually override confidence below threshold (0.6)
    const lowConfSpec = { ...spec, confidence: 0.3 };

    const blueprint = tryComposeScene(lowConfSpec, baseCtx);
    expect(blueprint).toBeNull();
  });
});
