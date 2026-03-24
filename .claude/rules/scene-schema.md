---
paths:
  - src/schema/**
---

# Schema 파일 규칙

- schema 파일은 **읽기 전용**이다. Claude Code는 수정할 수 없다
  - `src/schema/scene-catalog.json`
  - `src/schema/content-schema.json`
  - `src/schema/asset-manifest.json`
- 에셋 추가는 사람이 직접 `asset-manifest.json`에 `status: "draft"` 항목을 수동 추가한 후 테스트 → `"ready"` 승격 절차를 따른다
- scene-catalog.json의 씬 타입과 layers 정의를 참조하여 씬을 조립한다
- content-schema.json에 맞지 않는 content JSON은 validate에서 반드시 실패해야 한다
