# 7가지 Hook Strategy 상세 가이드

## 1. pain — 시청자의 문제를 찌름

**패턴:** 문제→공감→해결 약속
**적합 장르:** psychology, selfHelp
**스코어링 핵심:** narrativeArcType === 'warning', emotionalTone에 'urgent'/'intense' 포함 시 높음

**좋은 예:**
> "매일 아침 알람을 끄고 다시 잠드는 자신이 싫으면서도, 왜 우리는 계속 같은 일을 반복할까요?"

**나쁜 예 (금지):**
> "오늘 소개할 책은 습관에 관한 책입니다." ← 일반적, 문제를 찌르지 않음

**anti-pattern:**
- 문제를 나열만 하고 공감 없이 넘어감
- 해결 약속 없이 끝남

---

## 2. contrarian — 통념을 뒤집음

**패턴:** 통념→반박→진짜 이유
**적합 장르:** science, philosophy
**스코어링 핵심:** structure === 'argument', narrativeArcType === 'discovery'

**좋은 예:**
> "열심히 노력하면 성공한다고요? 과학은 정반대를 말합니다."

**나쁜 예 (금지):**
> "이 책은 새로운 관점을 제시합니다." ← 무엇이 뒤집히는지 구체적이지 않음

**anti-pattern:**
- 통념을 정확히 명시하지 않고 "다른 시각" 같은 모호한 표현
- 반박의 근거를 Hook에서 미리 다 설명함 (궁금증 소멸)

---

## 3. transformation — 변화 전후를 먼저 보여줌

**패턴:** 결과→궁금증→방법 약속
**적합 장르:** selfHelp, business
**스코어링 핵심:** narrativeArcType === 'transformation', emotionalTone에 'uplifting' 포함

**좋은 예:**
> "아침 한 시간이 하루 전체를 바꾼다면, 당신의 인생도 바뀔 수 있을까요?"

**나쁜 예 (금지):**
> "이 책을 읽으면 인생이 바뀝니다." ← 구체적 변화 없음, 일반적

**anti-pattern:**
- 결과를 보여주지 않고 "변화가 가능합니다" 같은 추상적 약속
- before/after 대비 없이 after만 이야기

---

## 4. identity — 정체성에 연결

**패턴:** 정체성 질문→연결→해답
**적합 장르:** selfHelp, psychology
**스코어링 핵심:** emotionalTone에 'reflective' 포함, contentMode === 'conceptual'

**좋은 예:**
> "당신은 '아침형 인간'이라고 생각하시나요? 사실, 그건 선택의 문제입니다."

**나쁜 예 (금지):**
> "누구나 아침형 인간이 될 수 있습니다." ← 질문 없음, 정체성 연결 없음

**anti-pattern:**
- 정체성 질문이 너무 넓음 ("당신은 누구인가요?")
- 연결 단계 없이 바로 해답으로 점프

---

## 5. question — 강한 질문으로 시작

**패턴:** 질문→일반답→깊은 답 약속
**적합 장르:** philosophy, science
**스코어링 핵심:** structure === 'argument', contentMode === 'conceptual', narrativeArcType === 'discovery'

**좋은 예:**
> "우리가 매일 내리는 결정 중 95%가 무의식적이라면, 과연 '자유의지'는 존재할까요?"

**나쁜 예 (금지):**
> "자유의지에 대해 알아보겠습니다." ← 질문이 아님, 궁금증 유발 없음

**anti-pattern:**
- 질문이 Yes/No로 끝남 (깊이 없음)
- 일반답 단계를 건너뛰고 바로 깊은 답으로 감

---

## 6. system — 원인이 구조라고 프레이밍

**패턴:** 오해→시스템 관점→해결
**적합 장르:** selfHelp, business
**스코어링 핵심:** structure === 'framework' && coreFramework 존재, contentMode === 'actionable'

**좋은 예:**
> "새벽에 못 일어나는 건 의지력의 문제가 아닙니다. 아침을 설계하는 시스템이 없었을 뿐이에요."

**나쁜 예 (금지):**
> "아침 루틴에 관한 책을 소개합니다." ← 시스템 관점 없음

**anti-pattern:**
- 오해를 먼저 제시하지 않고 바로 시스템 설명
- "시스템"이라는 단어만 쓰고 실제 구조 언급 없음

---

## 7. urgency — 지금 바꿔야 한다고 자극

**패턴:** 현재→위험→변화 약속
**적합 장르:** business, ai
**스코어링 핵심:** urgencyLevel === 'high', narrativeArcType === 'warning', emotionalTone에 'urgent' 포함

**좋은 예:**
> "AI가 당신의 직업을 대체하는 데 필요한 시간은 5년이 아니라, 18개월입니다."

**나쁜 예 (금지):**
> "AI 시대에 대비해야 합니다." ← 구체적 위험 없음, 긴급성 약함

**anti-pattern:**
- 공포만 조장하고 변화 약속 없음
- 숫자/타임라인 없이 막연한 위기감

---

## 조합 전략 (Primary + Secondary)

`selectHookStrategy`는 secondary 전략도 선택할 수 있다 (score >= primary * 0.7).

**미라클 모닝 예시:** `system` (primary) + `transformation` (secondary)
- system: "아침을 설계하는 시스템이 없었을 뿐" → 구조적 관점
- transformation: "아침 한 시간이 하루 전체를 바꾼다면" → 변화 약속
- 두 전략이 자연스럽게 결합: "시스템으로 변화를 만든다"

조합 시 Hook에서 primary 전략을, Intro에서 secondary 전략 뉘앙스를 살린다.
