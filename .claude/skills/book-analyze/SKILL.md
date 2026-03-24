---
name: book-analyze
description: >
  책의 구조, 감정, 메타포를 분석하여 BookFingerprint를 생성한다.
  책 요약 영상 기획, book.json 생성, 콘텐츠 JSON 작성 시 사용.
  "책 분석해줘", "영상 기획", "fingerprint" 등의 요청에 자동 활성화.
context: fork
agent: book-analyst
---

# Book Analyzer + Narrative Planner

DSGS 파이프라인 Stage 1-2. 책 정보를 분석하여 영상 제작의 기초 데이터를 생성한다.

## 입력

- 책 제목, 저자, 장르 (GenreKey: selfHelp | psychology | business | philosophy | science | ai)
- 책 내용 요약 (챕터별 또는 자유 형식)
- 목표 영상 길이 (분)

## 출력

1. **BookFingerprint** JSON — 책의 구조적/감정적/시각적 특성 분석
2. **VideoNarrativePlan** JSON — segments + emotionalCurve

## 분석 프레임워크 (5가지 질문)

반드시 아래 5가지 질문에 답한 후 BookFingerprint를 작성한다.

| # | 질문 | 매핑 필드 |
|---|------|----------|
| Q1 | **구조(Structure):** 목록? 순환? 계층? 비교? 시간축? | `structure`, `coreFramework` |
| Q2 | **관계(Relationship):** 병렬? 순차? 대립? 포함? | `narrativeArcType` |
| Q3 | **핵심 숫자(Numbers):** 퍼센트? 개수? 비율? | `keyConceptCount` |
| Q4 | **감정 톤(Emotional Tone):** 긴장? 각성? 평온? | `emotionalTone`, `urgencyLevel` |
| Q5 | **시각적 이미지(Mental Image):** 바퀴? 산? 파도? 나선? | `visualMotifs`, `spatialMetaphors` |

## 절차

1. 책 정보 수집 (제목, 저자, 장르, 요약)
2. 5가지 질문 답변 작성 → [fingerprint-template.md](fingerprint-template.md) 참조
3. 답변 기반으로 BookFingerprint JSON 작성
4. `src/analyzer/bookAnalyzer.ts`의 `validateBookFingerprint()` 호출하여 검증
5. BookFingerprint + 목표 시간으로 `src/analyzer/narrativePlanner.ts`의 `planNarrative()` 호출
6. 결과 반환 (BookFingerprint + VideoNarrativePlan)

## Hook Strategy 선택 가이드

| 전략 | 적합한 경우 |
|------|-----------|
| `pain` | 독자의 현재 고통을 직접 건드릴 때 |
| `contrarian` | 통념을 뒤집는 주장이 책의 핵심일 때 |
| `transformation` | 극적 변화 사례가 강력할 때 |
| `identity` | "당신은 어떤 사람인가?" 질문이 유효할 때 |
| `question` | 답이 궁금해지는 질문으로 시작할 때 |
| `system` | 체계적 방법론이 핵심일 때 |
| `urgency` | 시급성/긴박감이 책의 동력일 때 |

## 검증 체크리스트

- [ ] genre가 6개 GenreKey 중 하나
- [ ] structure가 framework/narrative/argument/collection 중 하나
- [ ] keyConceptCount >= 1
- [ ] emotionalTone 배열이 1개 이상
- [ ] hookStrategy가 7개 전략 중 하나
- [ ] entryAngle이 한 문장으로 작성됨
- [ ] VideoNarrativePlan segments의 durationRatio 합 = 1.0

## 완성 예시

- [examples/miracle-morning.json](examples/miracle-morning.json) — 미라클 모닝 (자기계발, framework 구조)
