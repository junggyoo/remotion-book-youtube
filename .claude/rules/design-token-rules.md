---
paths:
  - src/design/**
---

# 디자인 토큰 규칙

## 필수 사용
- 색상: `theme.textStrong`, `theme.bg`, `theme.lineSubtle` 등 테마 토큰 사용
- 타이포: `typeScale.headlineL`, `tokens.typography.fontFamily.sans` 등 토큰 참조
- 간격: `tokens.spacing[N]` 사용
- 모션: `motionPresets.presets.heavy.config` 등 preset에서 참조

## 금지
- 색상 hex 하드코딩 (예: `#F8F7F2`)
- px 수치 하드코딩 (spacing, fontSize)
- `spring()` config 임의 작성 — preset 필수
- scale emphasis 1.06 초과
- Y 오프셋 24px 초과
- 세리프 폰트를 body/headline에 사용 (quote/chapter accent 전용)
- 씬당 accent 2개 초과
