# BeatElement Keys by Scene Type

beat.activates에 사용하는 키 목록. src/scenes/*.tsx의 getBeatState() 호출에서 추출.

> 이 문서는 `scripts/extract-beat-keys.ts`로 자동 생성.
> 마지막 생성: 2026-03-28

---

## ApplicationScene (ApplicationScene.tsx)
- `anchorStatement`
- `step-${index}` (동적 패턴)
- `step-${i}` (동적 패턴)

## ChapterDividerScene (ChapterDividerScene.tsx)
- `chapterTitle`
- `underline`

## ClosingScene (ClosingScene.tsx)
- `accentBar`
- `ctaText`
- `recapStatement`

## CompareContrastScene (CompareContrastScene.tsx)
- `connector`
- `leftPanel`
- `rightPanel`

## CoverScene (CoverScene.tsx)
- `author`
- `brandBar`
- `coverImage`
- `subtitle`
- `title`

## DataScene (DataScene.tsx)
- `annotation`
- `chartContainer`
- `dataLabel`
- `sourceCredit`

## FrameworkScene (FrameworkScene.tsx)
- `frameworkLabel`
- `item-${index}` (동적 패턴)
- `item-${i}` (동적 패턴)

## HighlightScene (HighlightScene.tsx)
- `mainText`
- `subText`

## KeyInsightScene (KeyInsightScene.tsx)
- `accentBar`
- `evidenceCard`
- `headline`
- `supportText`

## ListRevealScene (ListRevealScene.tsx)
- `listLabel`

## QuoteScene (QuoteScene.tsx)
- `attribution`
- `quoteMarks`
- `quoteText`

## SplitQuoteScene (SplitQuoteScene.tsx)
- `leftQuote`
- `rightQuote`
- `vsLabel`

## TimelineScene (TimelineScene.tsx)
- `timelineLabel`
- `dot-${i}` (동적 패턴)
- `event-${i}` (동적 패턴)

## TransitionScene (TransitionScene.tsx)
- `brandMark`
- `label`
- `labelContainer`

---

## 동적 키 패턴 요약

| 씬 | 패턴 | 예시 |
|-----|------|------|
| ApplicationScene | `step-${index}` | step-0 |
| ApplicationScene | `step-${i}` | step-0 |
| FrameworkScene | `item-${index}` | item-0 |
| FrameworkScene | `item-${i}` | item-0 |
| TimelineScene | `dot-${i}` | dot-0 |
| TimelineScene | `event-${i}` | event-0 |

## 와일드카드

- `*` — 모든 요소 자동 stagger (content-authoring-rules.md 참조)
