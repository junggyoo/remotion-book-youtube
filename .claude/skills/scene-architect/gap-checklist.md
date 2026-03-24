# Gap Detection 체크리스트

## 5가지 Gap 탐지 질문 (DSGS Spec 6-2)

### Q1: 프레임워크 표현 가능성 [priority: must]

- [ ] `fingerprint.structure === 'framework'`?
- [ ] `fingerprint.coreFramework` 존재?
- [ ] `fingerprint.spatialMetaphors`에 '순환', '방사', '층위' 포함?
- [ ] best match(`framework` preset) confidence < threshold?

**탐지 시 requiredCapabilities:**
- `순환` → `cyclic-flow`
- `방사` → `radial-layout`
- `층위` → `layered-stack`

---

### Q2: 메타포 시각화 가능성 [priority: must]

- [ ] `fingerprint.visualMotifs`에 매핑 불가 모티프 존재? (wheel, spiral, orbit, web, rhizome)
- [ ] best match confidence < threshold?

**탐지 시 requiredCapabilities:** `motif-{모티프명}`

---

### Q3: 시간적 흐름 표현 가능성 [priority: nice]

- [ ] `fingerprint.uniqueElements`에 시간 키워드 포함? (타임라인, 순서, 과정, 흐름, 단계별)
- [ ] best match가 `application`이 아닌가?
- [ ] best match confidence < threshold?

**탐지 시 requiredCapabilities:** `timeline-h`, `timeline-v`

---

### Q4: 변화 전/후 비교 표현 가능성 [priority: nice]

- [ ] `fingerprint.narrativeArcType === 'transformation'`?
- [ ] `fingerprint.uniqueElements`에 비교 키워드 포함? (비교, 전후, before/after, 전/후)
- [ ] best match가 `compareContrast`가 아닌가?
- [ ] best match confidence < threshold?

**탐지 시 requiredCapabilities:** `before-after-pair`, `split-reveal`

---

### Q5: 감정적 클라이맥스 표현 가능성 [priority: nice]

- [ ] `segment.role === 'climax'`?
- [ ] best match confidence < threshold?
- [ ] `fingerprint.emotionalTone`에 고강도 톤 포함? (intense, urgent, provocative)

**탐지 시 requiredCapabilities:** `emphasis-composition`, `dramatic-choreography`

---

## Priority 규칙

| 질문 | Priority | 근거 |
|------|----------|------|
| Q1 | must | 핵심 프레임워크 시각화는 영상 정체성 |
| Q2 | must | 메타포 시각화는 차별화 요소 |
| Q3 | nice | 타임라인은 강화 요소 |
| Q4 | nice | 전후 비교는 보조 표현 |
| Q5 | nice | 감정 클라이맥스는 기존 씬으로도 부분 표현 가능 |

---

## 미라클 모닝 Gap 분석 예시

**BookFingerprint:**
- structure: `framework`
- coreFramework: `SAVERS (Silence, Affirmations, Visualization, Exercise, Reading, Scribing)`
- spatialMetaphors: `['순환', '상승', '층위']`
- uniqueElements: `['SAVERS 6단계 순환 바퀴 시각화', '30일 챌린지 3구간 타임라인', '사고 전후 극적 비교']`
- emotionalTone: `['uplifting', 'disciplined']`

**Gap 1: SAVERS 순환 구조** (Q1 → must)
- `structure === 'framework'` ✓
- `coreFramework` 존재 ✓
- `spatialMetaphors` 포함 '순환' ✓
- grid-expand로 순환 구조 표현 불가 → gap
- requiredCapabilities: `['cyclic-flow']`

**Gap 2: 30일 챌린지 3구간 타임라인** (Q3 → nice)
- uniqueElements에 '타임라인' 키워드 ✓
- 기존 data/application 프리셋으로 부족 → gap
- requiredCapabilities: `['timeline-h', 'timeline-v']`

**Q5 미적용:** emotionalTone이 `uplifting`/`disciplined` (고강도 아님) → 미발동
