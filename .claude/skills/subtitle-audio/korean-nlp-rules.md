# Korean NLP Rules for Subtitle Generation

## Sentence Splitting

### Approach

Korean narration text is split into sentences using regex-based pattern matching on common sentence endings followed by a period.

### Sentence Ending Patterns (Initial Set)

| Pattern   | Type                   | Example           |
| --------- | ---------------------- | ----------------- |
| `습니다.` | 합니다체 (formal)      | 알아봅니다.       |
| `입니다.` | 합니다체 (formal)      | 프레임워크입니다. |
| `됩니다.` | 합니다체 (formal)      | 변경됩니다.       |
| `합니다.` | 합니다체 (formal)      | 시작합니다.       |
| `봅니다.` | 합니다체 (formal)      | 살펴봅니다.       |
| `줍니다.` | 합니다체 (formal)      | 높여줍니다.       |
| `옵니다.` | 합니다체 (formal)      | 나옵니다.         |
| `에요.`   | 해요체 (polite)        | 중요해요.         |
| `해요.`   | 해요체 (polite)        | 시작해요.         |
| `하죠.`   | 해요체 (casual polite) | 해보죠.           |
| `네요.`   | 해요체 (polite)        | 좋네요.           |
| `거든요.` | 해요체 (explanatory)   | 때문이거든요.     |
| `지요.`   | 해요체 (polite)        | 그렇지요.         |
| `까요.`   | 의문형 (question)      | 할까요.           |
| `세요.`   | 존댓말 (honorific)     | 해보세요.         |
| `어요.`   | 해요체 (polite)        | 바꿔어요.         |
| `져요.`   | 해요체 (polite)        | 달라져요.         |
| `?`       | 의문문                 | 무엇일까요?       |
| `!`       | 감탄문                 | 시작해보세요!     |

### Regex

```typescript
const KOREAN_SENTENCE_ENDINGS =
  /(?:습니다|입니다|됩니다|합니다|봅니다|줍니다|옵니다|에요|해요|하죠|네요|거든요|지요|까요|세요|어요|져요)\.\s*|[?!]\s+/g;
```

### Known Limitations

1. **Missing endings**: Less common endings like `~답니다.`, `~랍니다.`, `~럽니다.` are not covered. Add as encountered.
2. **Period in abbreviations**: "S.A.V.E.R.S." would cause false splits. Current mitigation: regex requires Korean characters before the period.
3. **Long clauses**: Korean often chains clauses with `~하고`, `~하며`, `~해서` — these produce single long sentences that may overflow 2 lines. The `splitToLines()` function handles overflow by hard-wrapping.
4. **No NLP library**: This is a regex-based approach, not a proper NLP tokenizer. For production-quality splitting, consider integrating a Korean NLP library (e.g., `koalanlp`, `mecab-ko`).

### How to Add New Endings

1. Identify the pattern from failed subtitle splits in test output
2. Add to the `KOREAN_SENTENCE_ENDINGS` regex in `src/tts/subtitleGen.ts`
3. Add to the table above
4. Test with `scripts/test-tts-pipeline.ts`

## Line Breaking (어절 단위)

### Rules

- Break lines at spaces (word boundaries) when possible
- If a word exceeds 28 chars, hard-break at the limit
- Never break inside a 조사 (particle) — Korean particles attach to nouns without spaces
- Max 28 chars per line, max 2 lines per subtitle

### Implementation

Line breaking is handled by `splitToLines()` in `src/tts/subtitleGen.ts`:

1. If remaining text ≤ 28 chars → single line
2. Otherwise, find last space within 28 chars → break there
3. If no space found → hard break at 28
4. Repeat for second line
5. Text beyond 2 lines is trimmed (not shown)

### Korean-Specific Considerations

- Korean text has spaces between 어절 (word units), not individual morphemes
- 조사 (particles like 은/는/이/가/을/를) attach directly to nouns: "미라클 모닝의" not "미라클 모닝 의"
- This means space-based breaking naturally preserves 조사 attachment
- No special 조사 handling needed when breaking at spaces
