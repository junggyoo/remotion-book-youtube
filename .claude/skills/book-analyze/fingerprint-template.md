# BookFingerprint 분석 템플릿

이 템플릿을 사용하여 책의 BookFingerprint를 체계적으로 작성한다.

---

## Step 1: 5가지 질문에 답하기

### Q1. 구조 (Structure)
> 이 책은 어떤 구조로 이루어져 있는가?

- **framework**: 명확한 프레임워크/단계가 있다 (예: 7가지 습관, SAVERS)
- **narrative**: 이야기 흐름으로 전달한다 (예: 자전적 경험, 사례 중심)
- **argument**: 주장-근거 구조다 (예: 논증, 반박, 증거 제시)
- **collection**: 독립적 챕터/에세이 모음이다 (예: 에세이집, 인사이트 모음)

답변: ___
→ `structure` 필드에 매핑
→ framework이면 `coreFramework`에 이름 기록 (예: "SAVERS 6단계")

### Q2. 관계 (Relationship)
> 핵심 개념들 사이의 관계는?

- **병렬**: 각 개념이 동등한 위치 → `narrativeArcType: 'instruction'`
- **순차**: 시간순/인과관계 → `narrativeArcType: 'transformation'`
- **대립**: 두 관점의 충돌 → `narrativeArcType: 'warning'`
- **포함**: 큰 개념 안의 세부 → `narrativeArcType: 'discovery'`

답변: ___

### Q3. 핵심 숫자 (Numbers)
> 이 책의 핵심 숫자는?

- 프레임워크 단계 수: ___
- 핵심 개념 수: ___
- 인용된 데이터/통계: ___

→ `keyConceptCount` 필드에 매핑

### Q4. 감정 톤 (Emotional Tone)
> 이 책을 읽을 때 느끼는 감정은?

선택 (복수 가능): uplifting, disciplined, reflective, urgent, hopeful, provocative, calm, intense

답변: ___
→ `emotionalTone[]` 필드에 매핑

긴박감 수준: low / medium / high
→ `urgencyLevel` 필드에 매핑

### Q5. 시각적 이미지 (Mental Image)
> 이 책의 핵심을 하나의 이미지로 표현한다면?

시각적 모티프 (영어): ___
→ `visualMotifs[]` 필드에 매핑 (예: ["sunrise", "wheel", "loop"])

공간적 메타포 (한국어): ___
→ `spatialMetaphors[]` 필드에 매핑 (예: ["순환", "층위", "분기"])

---

## Step 2: 추가 분석

### Hook Strategy
7가지 중 이 책에 가장 적합한 전략: ___
→ `hookStrategy` 필드에 매핑

### Entry Angle
이 영상의 핵심 관점을 한 문장으로: ___
→ `entryAngle` 필드에 매핑

### Unique Elements
기존 프리셋 씬으로 표현 불가능한 독특한 요소: ___
→ `uniqueElements[]` 필드에 매핑

### Content Mode
- **actionable**: 실행 가능한 조언 중심
- **conceptual**: 개념/이론 중심
- **narrative**: 이야기/사례 중심
- **mixed**: 혼합

답변: ___
→ `contentMode` 필드에 매핑

---

## Step 3: JSON 출력

```json
{
  "genre": "",
  "subGenre": "",
  "structure": "",
  "coreFramework": "",
  "keyConceptCount": 0,
  "emotionalTone": [],
  "narrativeArcType": "",
  "urgencyLevel": "",
  "visualMotifs": [],
  "spatialMetaphors": [],
  "hookStrategy": "",
  "entryAngle": "",
  "uniqueElements": [],
  "contentMode": ""
}
```

작성 완료 후 반드시 `validateBookFingerprint()` 로 검증한다.
