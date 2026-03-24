---
paths:
  - src/analyzer/openingComposer*
  - src/validator/openingValidator*
  - src/renderer/presetBlueprints/fallback/**
---

# Opening 규칙

- Opening(Hook + Intro)은 반드시 동적 생성. 프리셋 사용 금지 (일반 경로)
- 동적 생성 실패 시에만 fallback/ 프리셋 사용 가능
- fallback 사용 시 `openingPresetUsedReason` 필드 필수 기록
- 7가지 Hook Strategy 중 반드시 하나 명시 선택
- `openingGenericness` score 0.35 이하 필수
- Hook과 Intro는 하나의 설계 단위(OpeningPackage)로 다룬다
- 역할은 고정(Hook = 붙잡기, Intro = 맥락 설정), 구현은 동적
