# Scene Promotion Rubric — Stage 9 ScenePromoter

DSGS Stage 9 씬 승격 기준. `QUALITY_GATE`의 promotion 임계값을 기반으로 한다.

## 승격 판정 기준표

| 기준 | 임계값 | 설명 |
|------|--------|------|
| `promotionMinReusability` | >= 0.6 | 장르 독립성, 콘텐츠 추상화 수준 |
| `promotionMinAbstractability` | >= 0.7 | 다른 콘텐츠에 적용 가능한 구조인가 |
| `promotionMinQuality` | >= 0.8 | readability + brandConsistency + visualComplexity 평균 |
| `promotionMinStability` | >= 0.95 | 렌더 안정성 (`renderStability`) |

4개 기준을 모두 만족해야 승격 후보(`candidate-promotable`)로 표시된다.

---

## 씬 라이프사이클

```
ephemeral → candidate-promotable → (수동 검토) → preset 승격
```

| 단계 | 의미 | 전환 조건 |
|------|------|----------|
| `ephemeral` | 단일 프로젝트용 임시 씬 | 기본값 |
| `candidate-promotable` | 승격 후보 | 4개 기준 모두 충족 |
| preset 승격 | 재사용 가능 preset으로 등록 | **사람이 수동 검토 후 결정** |

> preset 승격은 자동화하지 않는다. Stage 9는 후보를 표시할 뿐, 실제 승격은 사람이 판단한다.

---

## reusability 측정

씬이 특정 책/장르에 종속되지 않는지 측정한다.

감점 요인:
- 특정 책 제목/저자명이 VCL elements에 하드코딩됨 (-0.2)
- 특정 장르에만 적용 가능한 레이아웃 (-0.1)
- 콘텐츠가 template 변수 없이 고정됨 (-0.1)

---

## abstractability 측정

다른 콘텐츠에 slot만 교체해서 사용할 수 있는지 측정한다.

가점 요인:
- 모든 텍스트가 template slot (`{{headline}}`, `{{body}}` 등)으로 처리됨 (+0.3)
- layout archetype이 범용적 (center-focus, left-anchor 등) (+0.2)
- choreography가 콘텐츠 독립적 (+0.2)

---

## quality 평균 계산

```
promotionQuality = (readabilityScore + brandConsistencyScore + visualComplexityScore) / 3
```

세 메트릭의 산술 평균. 각 메트릭 기준은 [quality-gates.md](quality-gates.md) 참조.

---

## Stage 9 실행 절차

1. HITL Checkpoint C 통과 확인 (사람 승인 필수)
2. 각 synthesized scene에 대해 4개 기준 계산
3. 기준 충족 씬을 `candidate-promotable`로 표시
4. 승격 후보 목록을 사람에게 보고

```
[승격 후보 보고 형식]
씬 ID | reusability | abstractability | quality | stability | 판정
-----|-------------|-----------------|---------|-----------|-----
scene-003 | 0.72 | 0.81 | 0.88 | 1.00 | candidate-promotable
scene-007 | 0.45 | 0.62 | 0.83 | 1.00 | ephemeral (reusability 미달)
```

5. 사람이 검토 후 수동으로 preset 등록 여부 결정

---

## Opening preset 특별 규칙

Opening preset은 일반 씬 승격 경로와 다르다.

- Opening preset은 `fallback-only` 경로에서만 사용 가능
- Stage 9 자동 승격 대상에서 제외
- Opening 재사용은 별도 Opening 라이브러리로 관리
