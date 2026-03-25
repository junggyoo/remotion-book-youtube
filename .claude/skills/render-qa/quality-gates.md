# Quality Gates — SceneQualityMetrics 기준

`src/types/index.ts`의 `SceneQualityMetrics` + `QUALITY_GATE` 기준 문서.

## 메트릭 일람표

| 메트릭 | 임계값 | 측정 방법 |
|--------|--------|----------|
| `readabilityScore` | >= 0.8 | 한국어 텍스트 기준 5-7자/초 (기본 6자/초). `min(1, displayTime / readTime)` |
| `brandConsistencyScore` | >= 0.85 | BLOCKED 위반 -0.15, WARNING 위반 -0.05, floor 0 |
| `visualComplexityScore` | (정보용) | `1 - max(0, (elements/max) - 0.8) * 5` |
| `renderStability` | >= 0.95 | 현재 1.0 placeholder (렌더 실패율 기반) |
| `shortsAdaptability` | (정보용) | elements <= 3, 가로전용 레이아웃 불가 여부 |
| `openingGenericness` | <= 0.35 | 장르 키워드 오버랩 + 전략 페널티 합산 |

임계값이 없는 항목은 정보 제공용이며 QUALITY_GATE 판정에 포함되지 않는다.

---

## readabilityScore

한국어 독해 속도 기준으로 자막/캡션의 표시 시간이 충분한지 측정한다.

```
readTime   = textLength / 6   (초, 6자/초 기본)
readability = min(1, displayTime / readTime)
```

- `textLength`: 해당 씬의 자막 총 글자 수
- `displayTime`: 씬 지속 시간 (초)
- 5자/초 ~ 7자/초 범위를 정상으로 본다

**합격 조건:** >= 0.8

---

## brandConsistencyScore

디자인 토큰 위반 여부를 페널티로 환산한다.

### 페널티 표

| 위반 유형 | 페널티 |
|----------|--------|
| BLOCKED 위반 (하드코딩 색상, spring config 임의 작성 등) | -0.15 |
| WARNING 위반 (accent 색상 2개 초과, scale 1.06 초과 등) | -0.05 |

```
brandConsistencyScore = max(0, 1.0 - Σ(페널티))
```

**합격 조건:** >= 0.85 (BLOCKED 위반 1건 시 0.85, 2건 시 0.70으로 불합격)

### BLOCKED 위반 항목

- 색상 hex 하드코딩 (`#rrggbb`)
- `spring()` config 임의 작성 (preset 미참조)
- `staticFile()` 없이 에셋 경로 직접 사용
- `format` prop 누락 씬

### WARNING 위반 항목

- accent 색상 씬당 2개 초과
- scale emphasis 1.06 초과
- Y 오프셋 24px 초과
- 세리프 폰트를 body/headline에 사용

---

## visualComplexityScore

씬 내 VCL elements 수 기반 복잡도 지표. 정보 제공용으로 QUALITY_GATE 판정에 포함되지 않는다.

```
ratio  = elements / maxElements
score  = 1 - max(0, (ratio - 0.8) * 5)
```

- `maxElements`: 레이아웃별 최대 elements 수 (scene-catalog.json 참조)
- ratio <= 0.8 → score = 1.0
- ratio > 1.0 → score <= 0.0

---

## renderStability

렌더 실패율 기반 안정성 지표. 현재는 1.0 placeholder.

향후 구현 계획:
- 렌더 실패 시 자동 재시도 3회
- 실패율 = 실패 횟수 / 전체 시도 횟수
- `renderStability = 1 - failureRate`

**합격 조건:** >= 0.95

---

## shortsAdaptability

Shorts(1080×1920) 포맷 적응 가능성 지표. 정보 제공용.

적응 불가 판정 조건:
- elements 수 > 3
- 가로전용 레이아웃 사용 (split-compare 등)
- `format === 'shorts'` 분기 없는 씬

---

## openingGenericness

Opening이 특정 책에 국한되지 않고 지나치게 일반적인지 측정한다.

```
genericness = genreKeywordOverlap + strategyPenalty
```

- `genreKeywordOverlap`: 장르 공통 키워드 비율 (0~0.25)
- `strategyPenalty`: 전략별 추가 페널티

| 전략 | 페널티 |
|------|--------|
| `question` | +0.05 (가장 일반적) |
| `pain` | +0.05 |
| `contrarian` | +0.02 |
| `transformation`, `identity`, `system`, `urgency` | +0.00 |

**합격 조건:** <= 0.35 (이 값을 초과하면 Opening 재작성 권고)
