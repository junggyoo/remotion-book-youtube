# QA Checklist — Editorial Signal
**Version:** 1.0.0  
**위치:** 이 파일이 QA 기준의 단일 소스다. `src/pipeline/qa.ts`는 이 파일을 코드로 구현한 것이다.  
**사용법:** 렌더 전/후 아래 항목을 순서대로 체크한다.

---

## Level 0 — 렌더 전 필수 (BLOCKED 조건)

이 항목 중 하나라도 FAIL이면 렌더를 시작하지 않는다.

```
[ ] content JSON이 content-schema.json 스키마를 통과했다
[ ] 씬 수 >= 최솟값 (longform/both: 5, shorts: 1)
[ ] 모든 씬에 id가 있고 중복이 없다
[ ] (longform/both만) scenes[0].type === "cover"
[ ] (longform/both만) scenes[last].type === "closing"
[ ] (longform/both만) CoverContent.coverImageUrl 파일이 존재한다
    검증 경로: path.join('assets', scenes[0].content.coverImageUrl)
    ※ BookMetadata.coverImageUrl은 검증에 사용하지 않음
[ ] 모든 필수 narrationText가 채워져 있다 (silent 씬이면 명시됨)
[ ] 모든 narrationText <= 200자
[ ] (longform/both) 모든 headline <= 60자
[ ] TTS 생성이 완료됐거나 skipTTS: true가 명시됐다
[ ] license: "pending-check" 에셋이 scenes에 포함되지 않는다
```

---

## Level 1 — 구조 / 타이밍

```
[ ] 모든 씬의 from + durationFrames가 연속적이다 (gap 없음, overlap 없음)
[ ] 씬 간 from 값이 오름차순이다
[ ] totalFrames = fps × 목표 영상 길이 ±5%
[ ] TTS duration이 있는 씬은 durationFrames >= TTS durationFrames다
[ ] chapterDivider가 있다면 씬 흐름에서 논리적 위치에 있다
```

**자동 체크 명령:**
```bash
npm run qa:structure -- content/books/{book-id}.json
```

---

## Level 2 — 씬별 콘텐츠

씬 타입별로 체크한다.

### cover
```
[ ] title과 author가 화면에 보인다
[ ] 책 표지 이미지가 로드됐다 (또는 fallback rect가 보인다)
[ ] brand label이 있다
```

### keyInsight
```
[ ] headline이 화면에서 잘린 곳 없이 보인다
[ ] headline <= 60자 (hard limit)
[ ] signal bar가 있다 (cobalt blue)
[ ] 지나치게 빠르거나 느리지 않다 (75~150f 범위)
```

### compareContrast
```
[ ] 좌/우 패널 모두 텍스트가 보인다
[ ] divider line이 있다
[ ] left/rightLabel이 있다
[ ] 좌측과 우측이 revealOrder에 맞게 등장한다
```

### quote
```
[ ] quoteMark가 있다
[ ] quoteText가 3줄 이하다
[ ] attribution이 있다
[ ] hold 시간이 충분하다 (>= 90f)
```

### framework
```
[ ] 항목 수 <= 5개
[ ] 각 항목에 number와 title이 있다
[ ] stagger 순서가 올바르다 (1→2→3...)
[ ] 마지막 항목이 화면에 잘리지 않는다
```

### closing
```
[ ] recapStatement가 있다
[ ] brand label이 있다 (showBrandLabel: false가 명시된 경우 제외)
```

---

## Level 3 — 디자인 시스템 준수

```
[ ] 색상 하드코딩 없음 (grep 체크: src/**/*.tsx에 #[0-9a-fA-F] 없음)
[ ] 모든 씬 컴포넌트가 format prop을 받는다
[ ] 씬당 accent 색상 <= 2개
[ ] scale emphasis <= 1.06
[ ] Y 오프셋 <= 24px
[ ] 세리프 폰트가 quote/chapter/cover에만 사용됐다
[ ] SaaS 카드 스타일 없음 (과도한 border-radius + shadow 조합 없음)
```

---

## Level 4 — 모션

```
[ ] 모든 spring config가 motion-presets.json의 preset에서 참조됐다
[ ] 하드컷 전환 없음 (chapterShift는 dramatic preset 사용)
[ ] 동시 애니메이션 요소 <= 4개 (shorts는 <= 3개)
[ ] 과한 bounce 없음 (constraints.avoidExcessiveBounce)
[ ] 랜덤 rotation 없음
[ ] full-screen shake 없음
[ ] 파티클/불꽃 효과 없음
```

---

## Level 5 — 자막

```
[ ] 모든 씬에 자막이 있다 (silent 씬 제외)
[ ] 자막 줄당 <= 28자
[ ] 자막 최대 2줄
[ ] 자막 노출 타이밍이 VO와 싱크됐다 (±3f 이내)
[ ] 자막이 안전 영역(safe area) 안에 있다
[ ] 자막이 씬 끝 이후까지 노출되지 않는다
```

---

## Level 6 — 에셋 / Fallback

```
[ ] 모든 이미지가 staticFile() 경로를 사용한다
[ ] 누락 이미지가 있는 경우 fallback rect가 보인다 (검은 화면 없음)
[ ] license: "pending-check" 에셋이 영상에 포함되지 않는다
[ ] 폰트가 정상 로드됐다 (시스템 폰트 fallback이 아닌 Pretendard)
[ ] bgm이 있다면 볼륨이 0.12 이하다
[ ] bgm이 갑자기 끊기지 않는다 (fade-out 있음)
```

---

## Level 7 — Shorts 전용 (포맷: shorts일 때만)

**Shorts format 특이사항:**
- cover / closing 씬 없어도 PASS
- 씬 1개도 PASS (shorts 최솟값 = 1)
- `skipForShorts: true` 씬 제외 후 1개 이상이면 PASS

```
[ ] 화면 비율이 1080×1920 (9:16)이다
[ ] 텍스트가 central axis 기준으로 정렬됐다
[ ] 씬당 애니메이션 요소 <= 3개
[ ] 씬당 핵심 주장 1개
[ ] body paragraph 없음 (키워드/단문만)
[ ] 각 씬 길이 2~4초 (60~120f) 이내
[ ] skipForShorts: true 씬이 제외됐다
```

---

## 자동 체크 항목 (`npm run qa`로 실행)

아래는 `src/pipeline/qa.ts`가 자동으로 확인하는 항목:

```
- content JSON 스키마 유효성
- 씬 타이밍 연속성 (gap/overlap)
- totalFrames 범위
- 하드코딩 색상 감지 (grep)
- 에셋 파일 존재 여부
- 자막 길이 초과 여부
- license pending 에셋 포함 여부
```

수동으로만 확인 가능한 항목:

```
- 시각적 디자인 품질
- 모션 리듬감
- 자막-VO 싱크 정밀도
- 브랜드 톤 일관성
```

---

## 최종 판정 기준

| 판정 | 조건 |
|------|------|
| **READY_TO_PUBLISH** | Level 0~5 전 항목 PASS. Shorts는 Level 7도 PASS |
| **NEEDS_REVISION** | Level 1~6 중 FAIL 있음. Level 0은 PASS |
| **BLOCKED** | Level 0 중 하나라도 FAIL. 렌더 시작 불가. |

---

## 체크 결과 기록 양식

```markdown
# QA Report — {book-id} ({date})

## 판정: READY_TO_PUBLISH | NEEDS_REVISION | BLOCKED

## Level 0
- [x] content JSON 스키마 통과
- [x] scenes[0] cover
...

## Level 1
...

## FAIL 항목
| Level | 항목 | 원인 | 수정 방법 |
|-------|------|------|-----------|
| 3 | 색상 하드코딩 | KeyInsightScene.tsx:42 | tokens 참조로 교체 |

## 수정 후 재체크 결과
{수정 완료 후 FAIL 항목 재체크}
```
