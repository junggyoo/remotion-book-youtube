---
paths:
  - src/validator/**
  - src/pipeline/validate*
---

# 검증 규칙

## 렌더 전 필수
- `npm run validate` 통과 필수
- BlueprintValidator 실행 후 통과 필수

## Quality Gate 기준
- `readabilityScore` >= 0.8
- `brandConsistencyScore` >= 0.85
- `openingGenericness` < 0.35

## 검증 항목
- 하드코딩 색상/폰트/spring config 없는지
- accent 씬당 2개 이내
- 모든 합성 씬에 fallbackPreset 있는지
- mediaPlan 완전한지 (narration + caption + audio + asset)
- scenes[0].type === 'cover', scenes[last].type === 'closing'
- scenes.length >= 3
- 모든 headline <= 60자
- framework items <= 5개
- application steps <= 4개

## 실패 시
- 구체적 수정 지시를 반환한다
- 렌더 진행을 차단한다
