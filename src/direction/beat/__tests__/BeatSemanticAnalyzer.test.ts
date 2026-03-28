import { describe, it, expect } from "vitest";
import {
  analyzeNarrationSemantics,
  type SemanticPlan,
} from "../BeatSemanticAnalyzer";

describe("BeatSemanticAnalyzer", () => {
  describe("basic splitting", () => {
    it("splits Korean text with strong boundaries into multiple units", () => {
      const text =
        "습관은 정체성의 투표입니다. 하지만 대부분의 사람들은 이것을 모릅니다. 결국 변화는 내면에서 시작됩니다.";
      const plan = analyzeNarrationSemantics(text);

      // "하지만" and "결국" are strong markers → should create 3 units
      expect(plan.units.length).toBeGreaterThanOrEqual(2);
      expect(plan.units[0].boundaryBefore).toBeNull();
    });

    it("keeps sentences together when no strong boundaries exist", () => {
      const text =
        "작은 습관이 모여 큰 변화를 만듭니다. 매일 조금씩 나아가면 됩니다. 꾸준함이 핵심입니다.";
      const plan = analyzeNarrationSemantics(text);

      // No strong markers → everything in one unit
      expect(plan.units.length).toBe(1);
      expect(plan.units[0].sentences.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("role inference", () => {
    it('infers "evidence" role for text with 연구에 따르면', () => {
      const text =
        "습관의 힘은 대단합니다. 연구에 따르면 66일이면 습관이 형성됩니다.";
      const plan = analyzeNarrationSemantics(text);

      const evidenceUnit = plan.units.find(
        (u) => u.inferredRole === "evidence",
      );
      expect(evidenceUnit).toBeDefined();
    });

    it('infers "contrast" role for text with 하지만', () => {
      const text =
        "목표를 세우는 것은 쉽습니다. 하지만 실행하는 것은 완전히 다른 문제입니다.";
      const plan = analyzeNarrationSemantics(text);

      const contrastUnit = plan.units.find(
        (u) => u.inferredRole === "contrast",
      );
      expect(contrastUnit).toBeDefined();
    });

    it('infers "escalation" role for text with 무려', () => {
      const text = "작은 변화가 쌓입니다. 무려 37배의 차이가 납니다!";
      const plan = analyzeNarrationSemantics(text);

      const hasEscalation = plan.units.some(
        (u) => u.inferredRole === "escalation",
      );
      // "무려" might be in the same unit as first sentence if no strong boundary
      // but the unit containing it should detect escalation
      const unitWithMuryeo = plan.units.find((u) => u.text.includes("무려"));
      expect(unitWithMuryeo).toBeDefined();
      expect(unitWithMuryeo!.inferredRole).toBe("escalation");
    });

    it('infers "reflection" role for text with 결국', () => {
      const text =
        "여러 실험을 거쳤습니다. 결국 가장 중요한 것은 정체성의 변화입니다.";
      const plan = analyzeNarrationSemantics(text);

      const reflectionUnit = plan.units.find(
        (u) => u.inferredRole === "reflection",
      );
      expect(reflectionUnit).toBeDefined();
    });

    it('defaults first unit to "anchor" when no markers present', () => {
      const text = "습관은 우리 삶의 근본입니다.";
      const plan = analyzeNarrationSemantics(text);

      expect(plan.units[0].inferredRole).toBe("anchor");
    });
  });

  describe("pattern detection", () => {
    it("detects question-answer when first unit has ?", () => {
      const text =
        "목표를 세우지 말라고요? 이게 무슨 말일까요? 실제로 연구에 따르면 목표보다 시스템이 중요합니다.";
      const plan = analyzeNarrationSemantics(text);

      expect(plan.dominantPattern).toBe("question-answer");
    });

    it("detects contrast-resolve when contrast role present", () => {
      const text =
        "성공한 사람들은 매일 운동합니다. 하지만 실패한 사람들은 변명만 합니다. 결국 차이는 습관에 있습니다.";
      const plan = analyzeNarrationSemantics(text);

      expect(plan.dominantPattern).toBe("contrast-resolve");
    });

    it("detects statement-evidence pattern", () => {
      const text =
        "습관이 정체성을 바꿉니다! 데이터를 보면 습관 형성에 평균 66일이 걸립니다.";
      const plan = analyzeNarrationSemantics(text);

      expect(plan.dominantPattern).toBe("statement-evidence");
    });

    it('returns "uniform" for plain text with no markers', () => {
      const text =
        "오늘 이야기할 내용을 소개합니다. 세 가지 포인트가 있습니다.";
      const plan = analyzeNarrationSemantics(text);

      expect(plan.dominantPattern).toBe("uniform");
    });
  });

  describe("weight sum", () => {
    it("all semanticWeights sum to 1.0 within tolerance", () => {
      const text =
        "습관의 힘은 놀랍습니다. 연구에 따르면 작은 변화가 큰 결과를 만듭니다. 하지만 대부분 사람들은 이걸 무시합니다. 결국 핵심은 매일의 1% 개선입니다.";
      const plan = analyzeNarrationSemantics(text);

      const weightSum = plan.units.reduce((s, u) => s + u.semanticWeight, 0);
      expect(weightSum).toBeCloseTo(1.0, 5);
    });

    it("single unit has weight 1.0", () => {
      const text = "습관은 우리 삶의 근본적인 토대입니다.";
      const plan = analyzeNarrationSemantics(text);

      expect(plan.units.length).toBe(1);
      expect(plan.units[0].semanticWeight).toBeCloseTo(1.0, 5);
    });
  });

  describe("emotional intensity", () => {
    it("text with ! has higher intensity than plain text", () => {
      const plainText = "습관은 중요합니다. 매일 반복하면 됩니다.";
      const excitedText = "습관은 정말 중요합니다! 매일 반복하세요!";

      const plainPlan = analyzeNarrationSemantics(plainText);
      const excitedPlan = analyzeNarrationSemantics(excitedText);

      expect(excitedPlan.overallIntensity).toBeGreaterThan(
        plainPlan.overallIntensity,
      );
    });

    it("text with ? contributes to intensity", () => {
      const text = "이게 가능할까요? 정말 놀랍지 않나요?";
      const plan = analyzeNarrationSemantics(text);

      expect(plan.overallIntensity).toBeGreaterThan(0);
    });

    it("intensity is capped at 1.0", () => {
      const text = "정말!!! 놀랍게도!!! 무려!!! 바로!!!";
      const plan = analyzeNarrationSemantics(text);

      for (const unit of plan.units) {
        expect(unit.emotionalIntensity).toBeLessThanOrEqual(1.0);
      }
    });
  });

  describe("edge cases", () => {
    it("short text returns single anchor unit with uniform pattern", () => {
      const text = "짧은 글";
      const plan = analyzeNarrationSemantics(text);

      expect(plan.units.length).toBe(1);
      expect(plan.units[0].inferredRole).toBe("anchor");
      expect(plan.units[0].semanticWeight).toBe(1.0);
      expect(plan.units[0].emotionalIntensity).toBe(0.3);
      expect(plan.dominantPattern).toBe("uniform");
      expect(plan.overallIntensity).toBe(0.3);
    });

    it("empty string returns single anchor unit", () => {
      const plan = analyzeNarrationSemantics("");

      expect(plan.units.length).toBe(1);
      expect(plan.units[0].inferredRole).toBe("anchor");
      expect(plan.dominantPattern).toBe("uniform");
    });

    it("single sentence checks markers for role", () => {
      const text = "연구에 따르면 습관 형성에는 66일이 필요합니다.";
      const plan = analyzeNarrationSemantics(text);

      expect(plan.units.length).toBe(1);
      expect(plan.units[0].inferredRole).toBe("evidence");
    });
  });
});
