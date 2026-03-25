# 씬 타입별 Beat 패턴 레퍼런스

## keyInsight

### 3-beat (기본)
적용 조건: 8초+, supportText 있음, evidenceCard 가능

| Beat | Role | 비율 | Activates | Deactivates | EmphasisTargets |
|------|------|------|-----------|-------------|-----------------|
| 1 | headline | 25~40% | signalBar, headline | — | 핵심 키워드 1~2개 |
| 2 | support | 25~35% | supportText | — | 부연 키워드 1~2개 |
| 3 | evidence | 25~35% | evidenceCard | supportText | 수치/출처 키워드 |

### 2-beat (evidence 불필요)
적용 조건: evidence-rubric.md C등급이거나 씬 15초 미만

| Beat | Role | 비율 | Activates | Deactivates | EmphasisTargets |
|------|------|------|-----------|-------------|-----------------|
| 1 | headline | 40~55% | signalBar, headline | — | 핵심 키워드 |
| 2 | support | 45~60% | supportText | — | 부연 키워드 |

### 판단 기준: 3-beat vs 2-beat
- evidence-rubric.md A등급 → 3-beat
- evidence-rubric.md B등급 → 3-beat 권장, 2-beat 허용
- evidence-rubric.md C등급 → 2-beat
- 씬 duration 15초 미만 → 2-beat
- 씬 duration 30초+ → 3-beat 권장

---

## framework

### N+1 beat (순차 reveal)

| Beat | Role | 비율 | Activates | Deactivates | EmphasisTargets |
|------|------|------|-----------|-------------|-----------------|
| 1 | headline | 15~25% | frameworkLabel | — | 프레임워크 이름 |
| 2 | reveal | 균등 | items[0] | — | 해당 항목 키워드 |
| 3 | reveal | 균등 | items[1] | — | 해당 항목 키워드 |
| ... | ... | ... | ... | — | ... |

---

## compareContrast

### 3-beat (기본)

| Beat | Role | 비율 | Activates | Deactivates | EmphasisTargets |
|------|------|------|-----------|-------------|-----------------|
| 1 | hook | 30~40% | leftLabel, leftContent | — | 오해 키워드 |
| 2 | compare | 30~40% | rightLabel, rightContent | — | 주장 키워드 |
| 3 | recap | 20~30% | connector | leftContent | 결론 키워드 |

---

## quote

### 2-beat (기본)

| Beat | Role | 비율 | Activates | Deactivates | EmphasisTargets |
|------|------|------|-----------|-------------|-----------------|
| 1 | headline | 65~75% | quoteText | — | 인용문 핵심 구절 |
| 2 | support | 25~35% | attribution | — | 저자명 |

---

## highlight / cover / chapterDivider / closing / transition

| Duration | 기본 | 예외 |
|----------|------|------|
| 3초 미만 | 단일 beat | 없음 |
| 3~5초 | 단일 beat | hook/CTA면 2-beat |
| 5~8초 | 1~2 beat | 자유 판단 |
| 8초+ | 2-beat 권장 | — |
