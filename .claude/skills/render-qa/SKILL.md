---
name: render-qa
description: >
  최종 렌더링 + QA 검수 + 씬 승격을 처리한다.
  렌더링, QA 검수, 영상 출력, 씬 승격 시 사용.
  "렌더링", "QA", "품질 검증", "quality gate", "프로모션" 등에 자동 활성화.
disable-model-invocation: true
---

# Render QA + Scene Promotion

DSGS 파이프라인 Stage 7-9. Blueprint 검증 → Remotion 렌더 → QA 검수 → 씬 승격까지 처리한다.

> **이 skill은 사이드 이펙트(파일 생성, 렌더 실행)가 있으므로 수동 실행 전용이다.**
> `/render-qa` 명령으로만 호출한다. 자동 트리거 금지.

## 워크플로 (5단계)

```
Stage 7: BlueprintValidator    ← 자동화 pre-render 게이트 (HITL 아님)
Stage 8: BlueprintRenderer     ← Remotion 렌더 실행
         [HITL Checkpoint C]   ← Final QA 승인 (사람 검토)
Stage 9: ScenePromoter         ← 승격 후보 씬 처리
```

### Stage 7 — BlueprintValidator (자동 게이트)

렌더 전 반드시 통과해야 하는 자동화 검증이다. LLM 호출 없음, 결정론적.

```bash
# 검증 실행
npx ts-node src/validator/blueprintValidator.ts
```

- 통과 → Stage 8 진행
- 실패 → 오류 상세 출력 후 중단. Scene Designer 또는 Opening Composer로 복귀.

### Stage 8 — Remotion 렌더

```bash
npm run render:longform    # 1920×1080 렌더
npm run render:shorts      # 1080×1920 렌더
```

렌더 완료 후 `SceneQualityMetrics`를 계산하여 QUALITY_GATE 통과 여부 판정한다.

### HITL Checkpoint C — Final QA 승인

렌더 완료 후 사람이 검토한다. QA 항목:

- 영상 길이 ±5% 이내
- 자막 오버플로 없음 (28자/줄, 2줄 이하)
- 에셋 누락 → fallback 정상 작동
- 씬 간 갭 없음 (from + durationFrames 연속성)
- QUALITY_GATE 전 메트릭 리뷰

### Stage 9 — ScenePromoter

HITL Checkpoint C 통과 후 실행. 승격 조건을 만족하는 씬을 `candidate-promotable`로 표시한다.

상세 기준은 [promotion-rubric.md](promotion-rubric.md) 참조.

## QA 메트릭 참조

전체 측정 기준: [quality-gates.md](quality-gates.md)

## 참조 파일

- `src/validator/blueprintValidator.ts` — Stage 7 자동 검증
- `src/validator/openingValidator.ts` — Opening 전용 검증
- `src/validator/qualityMetrics.ts` — SceneQualityMetrics 계산
- `src/validator/fallbackResolver.ts` — fallback 해소
- `src/types/index.ts` — SceneQualityMetrics, QUALITY_GATE 타입
