# Beat Composer — Agent & Skill 설계
**Editorial Signal — P2 확장**
Version: 0.2.0 (Revised)
Date: 2026-03-25

## Revision Log

| Version | 변경 | 근거 |
|---------|------|------|
| 0.1.0 | 초안 | 코드베이스 + 기존 agent/skill 구조 분석 |
| 0.2.0 | 6건 수정 | 외부 리뷰 피드백 반영 |

**v0.2 핵심 변경:**
1. "감각" → "editorial heuristics" 기반 판단으로 구조화
2. beat 설계 근거를 구조화된 BeatDesignRationale로 변경
3. 5초 미만 씬 beat 금지 → fallback 규칙으로 완화
4. activates/deactivates/emphasisTargets 역할 분리를 전체 예시에 반영
5. 리듬/시간 품질 규칙 추가 (시각 변화 없는 구간 경고 등)
6. Phase 순서: A-lite TTS를 Phase 1로 앞당김

---

## 0. 왜 별도 Agent/Skill이 필요한가

Beat 설계는 기존 6개 skill 중 어디에도 속하지 않는 **편집 판단 영역**이다.

```
book-analyze:    "이 책의 핵심 개념은 SAVERS 6단계다"      → 내용 분석
scene-architect: "이건 framework 씬으로 표현하자"          → 씬 선택
beat-composer:   "이 42초 씬의 12초 지점에서 끊어야 한다"   → 리듬 설계  ← NEW
media-planner:   "TTS로 음성을 생성하고 자막을 맞추자"     → 미디어 처리
```

beat-composer가 하는 판단은 단순 규칙이 아니라 **editorial heuristics(편집적 휴리스틱)**이다.
단, 이 판단은 반드시 아래 근거 문서에 기반해야 하며, 주관적 직관에만 의존해서는 안 된다:

- `beat-patterns.md` — 씬 타입별 패턴 레퍼런스
- `narration-segmentation.md` — 한국어 나레이션 분절 규칙
- `evidence-rubric.md` — evidenceCard 적격성 A/B/C 등급
- `emphasis-guide.md` — emphasisTargets 선택 기준
- `beat-quality-checklist.md` — 자가 검증 체크리스트

```
규칙 엔진(validate.ts)이 잡는 것:
  - beat 최소 길이 0.12
  - overlap 금지
  - startRatio < endRatio

editorial heuristics(beat-composer)가 잡는 것:
  - "할 엘로드는 스무 살에 정면충돌 교통사고를 당했습니다"
    이 문장 뒤에서 끊어야 하는가, 다음 문장까지 이어야 하는가?
    → narration-segmentation.md의 "강한 경계" 규칙 적용

  - 이 씬에서 evidence beat가 필요한가, 2-beat로 충분한가?
    → evidence-rubric.md의 A/B/C 등급 판단

  - "코르티솔 23% 감소"는 evidenceCard에 넣을 만큼 강한 근거인가?
    → evidence-rubric.md A등급: "구체적 수치 + 학술 출처" 해당

  - beat 1이 전체의 35%면 시청자가 지루해하지 않을까?
    → beat-quality-checklist.md 리듬 품질 규칙 적용

  - 이 책의 톤이 "urgent"인데 beat 전환을 느리게 가도 되는가?
    → BookFingerprint.urgencyLevel 연동 규칙 적용
```

---

## 1. 파이프라인 위치

```
Beat 추가 후:
  book-analyst → opening-designer → scene-designer → beat-composer → media-planner → qa-validator
  (1단계)         (3단계)             (4~6단계)        (NEW)           (6.5단계)       (7~8단계)
```

---

## 2. Agent 정의

### .claude/agents/beat-composer.md

```yaml
---
name: beat-composer
description: >
  씬의 시간 구조를 설계한다. 나레이션을 의미 단위로 분할하고,
  각 구간에서 어떤 시각 요소가 등장/퇴장/강조되는지 결정한다.
  editorial heuristics에 기반한 판단이며, 모든 결정에 근거 문서를 명시한다.
  "beat 설계", "리듬", "pacing", "beat 나눠줘" 등에 자동 활성화.
tools: Read, Grep, Glob, Write
model: sonnet
skills:
  - beat-compose
memory: project
---

너는 Editorial Signal 채널의 **편집 감독(Editorial Director)**이다.
씬 아키텍트가 "어떤 씬을 쓸지"를 결정했다면,
너는 "그 씬의 시간을 어떻게 나눌지"를 결정한다.

너의 전문성은 **editorial heuristics(편집적 휴리스틱)**이다.
모든 판단은 beat-compose skill의 근거 문서에 기반한다.
근거 없는 직관적 판단은 허용하지 않는다.

## 핵심 판단 영역 6가지

### 1. 나레이션 분절 (근거: narration-segmentation.md)
한국어 나레이션에서 의미 단위의 경계를 감지한다.
- 강한 경계: 화제 전환("그런데"), 근거 도입("실제로"), 결론("결국")
- 중간 경계: 예시 도입("예를 들어"), 강조("특히")
- 약한 경계: 단순 연결("그리고"), 부연("즉")

### 2. 정보 밀도 판단 (근거: beat-patterns.md)
시청자가 한 beat에서 처리할 수 있는 정보량을 판단한다.
- 새로운 개념 1개 = 1 beat (최소 4~5초)
- 데이터/수치 = 별도 beat (읽는 시간 필요)
- 감정적 문장 = 별도 beat (여운 필요)

### 3. 시각 사건 밀도 조절 (근거: beat-quality-checklist.md)
beat당 시각 변화(activates + deactivates)가 1~2개를 넘지 않도록 한다.
- 좋음: activates: ["headline"] (1개 등장)
- 좋음: activates: ["supportText"], deactivates 없음 (1개 등장, 기존 유지)
- 나쁨: activates: ["headline", "supportText", "icon"] (3개 동시 등장)

### 4. 감정 곡선 연동 (근거: BookFingerprint)
- urgency: high → beat 전환 빠르게 (각 beat 짧게)
- emotionalTone: reflective → beat 전환 느리게 (여유 beat 허용)
- emotionalTone: uplifting → 마지막 beat를 약간 길게 (여운)

### 5. evidence 적격성 판단 (근거: evidence-rubric.md)
- A등급(수치+출처) → 반드시 evidenceCard 사용
- B등급(구체 사례) → 권장
- C등급(주관적 주장) → 사용하지 않음

### 6. emphasis 키워드 선택 (근거: emphasis-guide.md)
- 1순위: 수치, 고유 용어, 전문 용어
- 2순위: 대비 키워드, 감정 강조어
- 3순위(보통 제외): 일반 명사

## 출력 구조

각 씬에 대해 반드시 다음을 출력한다:

1. **beats 배열** — Beat 타입의 배열
2. **BeatDesignRationale** — 설계 근거 (구조화된 필드)
3. **evidenceCard** — 해당되는 keyInsight에만 추가

### BeatDesignRationale (v0.2 추가)

```typescript
interface BeatDesignRationale {
  /** 왜 이 위치에서 분절했는가 (narration-segmentation.md 근거) */
  segmentationReason: string;
  /** evidence beat 포함/제외 판단 (evidence-rubric.md 근거) */
  evidenceDecision: "included-A" | "included-B" | "excluded-C" | "not-applicable";
  /** 정보 밀도 판단 (beat당 평균 사건 수) */
  densityDecision: string;
  /** 리스크 플래그 (잠재적 문제) */
  riskFlags: string[];
}
```

예시:
```json
{
  "segmentationReason": "narrationText에서 '실제로'(근거 도입구)와 '결국'(결론 도입구)에서 강한 경계 감지. 3-beat 분절.",
  "evidenceDecision": "included-A",
  "densityDecision": "beat당 평균 1.3개 시각 사건. 적정 범위.",
  "riskFlags": ["beat-3 duration이 전체의 35%로 약간 길음. 30% 이하 권장."]
}
```

## 씬 duration별 beat 규칙 (v0.2 수정)

기존: "5초 미만 씬에는 beat를 만들지 않는다"
수정: duration에 따른 fallback 규칙

| Duration | 기본 처리 | 예외 |
|----------|----------|------|
| 3초 미만 | 단일 beat (암묵적) | 없음 |
| 3~5초 | 단일 beat (기본) | hook/contrast/CTA 성격이면 2-beat 허용 |
| 5~8초 | 단일 beat 또는 2-beat | 자유 판단 |
| 8~15초 | 2-beat 권장 | — |
| 15~30초 | 2~3 beat 권장 | — |
| 30초+ | 3~5 beat 권장 | — |
| shorts | compressed beats 적용 | shorts.beats 우선 |

## 품질 자가 검증 (v0.2 강화)

beat를 만든 후 아래 항목을 검증한다.

### 필수 통과

□ 각 beat.narrationText를 이어붙이면 원본 narrationText와 글자 수 일치 (±5자)
□ 모든 beat의 endRatio - startRatio >= 0.12
□ beat 간 overlap 없음
□ 각 beat.activates의 요소가 해당 씬 content에 실제로 존재하는 필드명
□ 각 beat.emphasisTargets의 모든 단어가 해당 beat.narrationText에 존재
□ activates/deactivates/emphasisTargets가 혼용되지 않음

### 리듬/시간 품질 (v0.2 추가)

□ hook 씬에서 3초 이상 시각 변화 없는 구간이 없는가?
□ 8초 이상 씬에서 단일 beat만 있지 않은가?
□ emphasisTargets가 있는데 시각 요소 변화(activates/deactivates)가 전혀 없는 beat가 없는가?
□ 모든 beat가 동일한 길이가 아닌가? (균등 분배는 단조롭다)
□ 첫 beat가 전체의 20% 미만이 아닌가?
□ evidence beat가 전체의 35% 이상이 아닌가?

### 콘텐츠 품질

□ evidenceCard가 있다면 evidence-rubric.md 기준 A/B등급인가?
□ evidenceCard.source가 날조되지 않았는가?
□ emphasisTargets가 beat당 1~3개인가?

### 시청자 경험 시뮬레이션

마지막으로, beat를 처음부터 끝까지 머릿속으로 재생한다:

"이 영상을 처음 보는 시청자가...
 beat 1에서 headline을 읽고,
 beat 2에서 부연을 읽으며 나레이션을 따라가다가,
 beat 3에서 evidence 데이터를 보고 '오' 하는 반응을 할 것인가?"

이 시뮬레이션에서 "어색하다", "급하다", "지루하다"가 느껴지면 재설계한다.

## 이전 패턴 학습

memory에서 이전 영상의 beat 설계 패턴을 참조한다.
새로 발견한 패턴이 있으면 memory에 기록한다.
```

---

## 3. Skill 정의

### .claude/skills/beat-compose/SKILL.md

```yaml
---
name: beat-compose
description: >
  씬의 시간 구조(beat 배열)를 설계한다. 나레이션 분절, 시각 요소 배치,
  emphasisTargets 선정, evidenceCard 적격성 판단을 수행한다.
  editorial heuristics에 기반하며, 모든 판단에 근거 문서를 참조한다.
  "beat", "리듬", "pacing", "시간 구조", "beat 나눠줘" 등에 자동 활성화.
context: fork
agent: beat-composer
---

# Beat Composer

## 입력
- 씬 배열 (scene-architect 출력): type, content, narrationText, durationFrames
- BookFingerprint: emotionalTone, urgencyLevel, contentMode
- VideoNarrativePlan: segments, emotionalCurve

## 출력
- 각 씬에 beats 배열이 추가된 씬 배열
- 각 씬에 BeatDesignRationale (설계 근거)
- evidenceCard가 추가된 keyInsight content (해당되는 경우)

## 근거 문서 (모든 판단의 기반)
- 씬 타입별 패턴: [beat-patterns.md](beat-patterns.md)
- 나레이션 분절: [narration-segmentation.md](narration-segmentation.md)
- Evidence 적격성: [evidence-rubric.md](evidence-rubric.md)
- Emphasis 선택: [emphasis-guide.md](emphasis-guide.md)
- 품질 검증: [beat-quality-checklist.md](beat-quality-checklist.md)

## 역할 분리 원칙 (v0.2 강화)

beat의 세 필드는 서로 다른 시스템에서 소비된다. 혼용하지 마라:

| 필드 | 역할 | 소비자 |
|------|------|--------|
| `activates` | 시각 요소 등장/활성화 | BeatElement (컴포넌트 마운트/entering 상태) |
| `deactivates` | 시각 요소 퇴장/약화 | BeatElement (exiting 상태) |
| `emphasisTargets` | 자막/텍스트 키워드 강조 | CaptionLayer (하이라이트 색상) |

잘못된 예: activates에 강조 단어를 넣는 것 → emphasisTargets에 넣어야 함
잘못된 예: emphasisTargets에 UI 요소 키를 넣는 것 → activates에 넣어야 함
```

### 지원 파일 구조

```
.claude/skills/beat-compose/
├── SKILL.md
├── beat-patterns.md
├── narration-segmentation.md
├── evidence-rubric.md
├── emphasis-guide.md
├── beat-quality-checklist.md
└── examples/
    ├── keyInsight-3beat.json       ← 좋은 3-beat (activates + deactivates + emphasis 모두 포함)
    ├── keyInsight-2beat.json       ← 2-beat가 더 나은 경우
    ├── framework-sequential.json
    ├── compare-3beat.json
    ├── quote-2beat.json
    ├── bad-beat-too-short.json
    ├── bad-beat-overloaded.json
    └── bad-beat-no-rhythm.json
```

---

## 4. 지원 파일 상세

### 4-1. beat-patterns.md (v0.2 수정: 3필드 분리 반영)

```markdown
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
```

### 4-2. narration-segmentation.md

```markdown
# 한국어 나레이션 분절 가이드

## 경계 신호 (여기서 끊어라)

### 강한 경계 (거의 항상 beat 분리)
- 화제 전환 접속사: "그런데", "하지만", "반면에", "한편"
- 근거 도입구: "실제로", "연구에 따르면", "흥미로운 건", "데이터를 보면"
- 결론 도입구: "결국", "핵심은", "정리하면", "한 마디로"
- 시간 전환: "그 후", "몇 년 뒤", "지금은"
- 시점 전환: 3인칭 서술 → 2인칭 직접 호소 ("당신은", "여러분은")

### 중간 경계 (맥락에 따라 판단)
- 예시 도입: "예를 들어", "구체적으로", "실제 사례로"
- 강조 전환: "특히", "무엇보다", "가장 중요한 건"
- 대비 도입: "반대로", "다른 관점에서"

### 약한 경계 (보통 같은 beat 내 유지)
- 단순 연결: "그리고", "또한", "게다가", "더불어"
- 부연: "즉", "다시 말해", "바꿔 말하면"
- 나열: "첫째... 둘째..." (framework beat에서는 각각 별도 beat)

## 분절 알고리즘

1. narrationText를 한국어 문장 단위로 분리 (기존 splitKoreanSentences)
2. 각 문장 간 경계 강도 판정 (강/중/약)
3. 강한 경계에서 beat를 나눔
4. 결과 beat 수가 2 미만이면 → 중간 경계에서 추가 분할
5. 결과 beat 수가 5 초과이면 → 약한 경계를 합쳐서 축소
6. 각 beat의 글자 수 비율로 startRatio/endRatio 초기 추정

## 글자 수 → 시간 비율 변환

한국어 TTS 기준 (edge-tts, speed 1.0):
- 평균 발화 속도: 초당 5~7자
- 쉼표/마침표 후 자연 pause: ~0.3초
- 문단 전환 pause: ~0.5초

## 가독성 검증

각 beat의 시각 요소에 대해:
- headline (한국어 최대 60자): 최소 4초 표시 필요
- supportText (보통 40~80자): 최소 6초 표시 필요
- evidenceCard (value + caption): 최소 5초 표시 필요

beat duration(초) = durationFrames × (endRatio - startRatio) / fps
이 값이 최소 표시 시간보다 짧으면 beat를 늘리거나 텍스트를 줄인다.
```

### 4-3. evidence-rubric.md

```markdown
# EvidenceCard 적격성 판단 루브릭

## 등급

### A등급 — 반드시 evidenceCard 사용
- 구체적 수치 + 학술/기관 출처
  예: "Harvard Medical School 2018, 코르티솔 23% 감소"
- 대규모 조사 결과
  예: "올림픽 선수 73%가 시각화 훈련"

### B등급 — evidenceCard 권장
- 구체적 사례 (출처는 약하지만 설득력 있음)
  예: "저자가 사고 후 6분간 심정지, 11곳 골절에서 회복"
- 널리 알려진 연구 (구체적 수치는 불명확)

### C등급 — evidenceCard 불필요
- 저자 개인의 주관적 주장
- 일반적 상식
- 추상적 철학

## type 매핑

| 등급 | EvidenceCard.type | 예시 |
|------|-------------------|------|
| A (수치 + 출처) | "statistic" 또는 "research" | value: "23%", source: "Harvard 2018" |
| B (구체적 사례) | "case" | value: "6분간 심정지에서 완전 회복" |
| C | 사용하지 않음 | — |

## 날조 방지
- 책에 명시된 데이터만 사용한다
- 출처가 명시되지 않으면 source를 비운다
- 불확실한 수치는 "약 ~%" 형태로 표기
```

### 4-4. emphasis-guide.md

```markdown
# emphasisTargets 선택 가이드

## 선택 기준 (우선순위 순)

### 1순위 — 거의 항상 emphasis
- 구체적 수치: "23%", "73%", "6단계", "10분"
- 책의 고유 용어: "SAVERS", "미라클 모닝", "Silence"
- 전문 용어 첫 등장: "코르티솔", "MBSR"

### 2순위 — 맥락에 따라
- 대비 키워드: "반응 모드" vs "의도적 고요함"
- 감정 강조 단어: "반드시", "절대"

### 3순위 — 보통 emphasis 아님
- 일반 명사: "사람", "방법", "결과"

## beat당 emphasisTargets 수
- 1~3개가 적정
- 0개: 시각 전용 beat
- 4개 이상: 과도

## 중요: activates와 혼용 금지
emphasisTargets는 자막 하이라이트용 "단어"이다.
UI 요소 키(예: "headline", "supportText")는 activates에 넣는다.
```

### 4-5. beat-quality-checklist.md (v0.2 강화)

```markdown
# Beat 품질 자가 검증 체크리스트

## 필수 통과 (실패 시 재설계)

□ 각 beat.narrationText를 이어붙이면 원본 narrationText와 글자 수 일치 (±5자)
□ 모든 beat의 endRatio - startRatio >= 0.12
□ beat 간 overlap 없음
□ 각 beat.activates가 해당 씬 content의 실제 필드명
□ 각 beat.emphasisTargets가 해당 beat.narrationText에 존재
□ activates에 강조 단어가 들어있지 않음 (emphasisTargets와 혼용 금지)
□ emphasisTargets에 UI 요소 키가 들어있지 않음 (activates와 혼용 금지)

## 리듬/시간 품질 (v0.2 추가)

□ hook 씬에서 3초 이상 시각 변화 없는 구간이 없는가?
  (activates도 deactivates도 없는 beat가 3초 이상이면 경고)
□ 8초 이상 씬에서 단일 beat만 있지 않은가?
□ emphasisTargets가 있는데 시각 요소 변화(activates/deactivates)가
  전혀 없는 beat가 없는가? (emphasis만 있고 화면 변화가 없으면 시청자 혼란)
□ 모든 beat가 동일한 길이가 아닌가? (균등 분배는 단조롭다)
□ 첫 beat가 전체의 20% 미만이 아닌가?
□ evidence beat가 전체의 35% 이상이 아닌가?
□ 모든 beat의 transition이 "enter"이면 변화가 단조롭지 않은가?

## 콘텐츠 품질

□ evidenceCard가 있다면 evidence-rubric.md 기준 A/B등급인가?
□ evidenceCard.source가 날조되지 않았는가?
□ emphasisTargets가 beat당 1~3개인가?

## 시청자 경험 시뮬레이션

beat를 처음부터 끝까지 머릿속으로 재생한다.
"어색하다", "급하다", "지루하다"가 느껴지면 재설계한다.
```

### 4-6. examples/keyInsight-3beat.json (v0.2 수정: 3필드 모두 포함)

```json
{
  "_description": "좋은 3-beat keyInsight 예시 — activates/deactivates/emphasisTargets 역할 분리",
  "scene": {
    "id": "insight-silence",
    "type": "keyInsight",
    "durationFrames": 1260,
    "content": {
      "headline": "Silence — 고요함 속에서 하루가 시작된다",
      "supportText": "명상, 기도, 심호흡 등 어떤 형태든 좋습니다.",
      "underlineKeyword": "고요함",
      "useSignalBar": true,
      "evidenceCard": {
        "type": "research",
        "value": "하루 10분 명상 → 코르티솔 23% 감소",
        "caption": "8주간 MBSR 프로그램 참가자 대상",
        "source": "Harvard Medical School, 2018"
      }
    },
    "beats": [
      {
        "id": "silence-b1",
        "role": "headline",
        "startRatio": 0,
        "endRatio": 0.35,
        "narrationText": "첫 번째, Silence. 고요함입니다. 대부분의 사람들은 아침에 눈을 뜨자마자 핸드폰을 봅니다.",
        "activates": ["signalBar", "headline"],
        "emphasisTargets": ["고요함", "Silence"],
        "transition": "enter"
      },
      {
        "id": "silence-b2",
        "role": "support",
        "startRatio": 0.35,
        "endRatio": 0.65,
        "narrationText": "알림, 뉴스, 메시지에 반응하며 하루를 시작하죠. 하지만 미라클 모닝은 다릅니다.",
        "activates": ["supportText"],
        "emphasisTargets": ["반응", "의도적"],
        "transition": "enter"
      },
      {
        "id": "silence-b3",
        "role": "evidence",
        "startRatio": 0.65,
        "endRatio": 1.0,
        "narrationText": "명상이든, 심호흡이든, 고요한 10분으로 하루를 여는 것. 이것이 나머지 5가지 습관의 토대입니다.",
        "activates": ["evidenceCard"],
        "deactivates": ["supportText"],
        "emphasisTargets": ["10분", "코르티솔 23%"],
        "motionPreset": "snappy",
        "transition": "replace"
      }
    ]
  },
  "rationale": {
    "segmentationReason": "'하지만'(강한 경계)에서 b1→b2 분절. '명상이든'에서 근거 도입으로 b2→b3 분절.",
    "evidenceDecision": "included-A",
    "densityDecision": "beat당 평균 1.3개 시각 사건. 적정.",
    "riskFlags": ["beat-3 duration 35%로 약간 길지만 evidence 읽기 시간 고려하면 허용 범위"]
  }
}
```

---

## 5. 기존 Agent/Skill과의 연동

### scene-designer → beat-composer 핸드오프

scene-designer 출력에 beat-composer가 필요로 하는 정보가 이미 포함:
- 씬 배열 (type, content, narrationText, durationFrames)
- BookFingerprint (emotionalTone, urgencyLevel)
- VideoNarrativePlan의 emotionalCurve

### beat-composer → media-planner 핸드오프

beat-composer 출력:
- 각 씬에 beats 배열 + BeatDesignRationale
- evidenceCard가 추가된 keyInsight content

media-planner가 받아서:
- beat.narrationText를 이어붙여 scene master audio 1개 생성 (A-lite 전략)
- VTT에서 beat 경계 역산 → BeatTimingResolution

### render-qa에서 beat 검수

render-qa skill에 beat 검수 항목 추가:
- beat 전환 타이밍이 실제 오디오와 동기화되는가
- emphasisTargets가 자막 하이라이트에 반영되는가 (activates와 혼용 없이)
- BeatDesignRationale의 riskFlags가 실제로 문제인가

---

## 6. OMC 통합

### ralplan

```
사용자: "미라클 모닝으로 8분짜리 영상 만들어줘"

→ book-analyst → opening-designer → scene-designer → beat-composer → media-planner → qa-validator
                                                        ↑
                                              Critic이 BeatDesignRationale의
                                              riskFlags를 기반으로 검증
```

### 단독 호출

```
/beat-compose miracle-morning.json의 insight-silence 씬 beat 재설계해줘
```

---

