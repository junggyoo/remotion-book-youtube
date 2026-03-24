# Prompt Templates — Editorial Signal Video Production
**Version:** 1.0.0  
**워크플로:** Step 1 콘텐츠 구조화 → Step 2 영상 빌드 → Step 3 검수/폴리시

---

## Step 1. 콘텐츠 구조화 프롬프트

### 역할
책 정보와 핵심 요약을 받아 `content-schema.json` 형식의 `book.json` 파일을 생성한다.  
Claude가 책 내용을 분석하고 씬 구조까지 직접 설계한다.

### 입력 형식

```
[BOOK_INFO]
제목: {책 제목}
원제: {원제 (있으면)}
저자: {저자명}
장르: selfHelp | psychology | business | philosophy | science | ai
출판년도: {년도}
책 표지 이미지: {파일명 또는 URL}

[BOOK_SUMMARY]
{핵심 내용 요약 또는 챕터별 내용. 자유 형식으로 작성.
분량 제한 없음. 많을수록 씬 설계 품질 향상.}

[PRODUCTION_CONFIG]
포맷: longform | shorts | both
목표 길이: {분} (longform만)
테마: dark | light
특별 요청: {있으면 작성}
```

### 프롬프트 본문

```
# 역할
너는 Editorial Signal 채널의 콘텐츠 프로듀서 겸 씬 설계자다.
아래 책 정보를 기반으로 Remotion 영상 제작용 content JSON을 생성해줘.

# 제약
- 반드시 아래 첨부 파일의 스키마를 따른다: content-schema.json
- 씬 타입은 scene-catalog.json에 정의된 9종만 사용한다
- 브랜드 규칙은 CLAUDE.md를 따른다

# 책 정보
{위의 BOOK_INFO 붙여넣기}

# 책 내용 요약
{위의 BOOK_SUMMARY 붙여넣기}

# 제작 설정
{위의 PRODUCTION_CONFIG 붙여넣기}

# 씬 설계 가이드라인
다음 원칙으로 씬을 설계해줘:

1. 구조: cover → chapterDivider(들) → 본문 씬들 → closing
2. 본문 씬 믹스 권장 비율 (longform 기준):
   - keyInsight: 3~5개 (가장 중요한 주장)
   - quote: 1~2개 (저자의 핵심 문장)
   - framework: 1~2개 (구조화된 개념)
   - compareContrast: 1~2개 (오해 vs 실제)
   - application: 1~2개 (직장인 관점 적용)
   - data: 0~1개 (관련 수치가 있을 때만)
3. 각 씬의 narrationText는 30~120자 권장 (200자 초과 시 validate FAIL)
4. keyInsight의 headline은 60자 이내 (hard limit)
5. 전체 씬은 8~14개 (longform 기준)
6. shorts용 씬:
   - shorts 단독 제작 시: 1~3개 씬 (cover/closing 강제 없음)
   - both 제작 시: 임팩트 있는 2~3개 씬의 `shorts.skipForShorts`를 false로 유지 (나머지는 true 설정)

# 출력 형식
반드시 아래 형식으로 출력해줘:

## 씬 설계 이유 (간단히)
{각 씬을 왜 선택했는지 3~5줄}

## content JSON
\`\`\`json
{
  "metadata": { ... },
  "production": { ... },
  "narration": { ... },
  "scenes": [ ... ],
  "audio": { ... }
}
\`\`\`

## 제작 메모
{편집자가 확인해야 할 사항, 이미지 필요 에셋, 라이선스 확인 필요 항목}
```

### 체크리스트 (Step 1 완료 기준)

- [ ] JSON이 content-schema.json 스키마를 따름
- [ ] book.json 상단에 `"$schema": "../../src/schema/content-schema.json"` 선언됨
- [ ] (longform/both) scenes[0].type === "cover"
- [ ] (longform/both) scenes[last].type === "closing"
- [ ] (shorts) 씬 1개 이상
- [ ] 총 씬 수: longform 5~14개, shorts 1~3개
- [ ] 모든 headline <= 60자 (hard limit)
- [ ] 모든 narrationText <= 200자 (권장 120자 이하)
- [ ] CoverContent.coverImageUrl 지정됨 (assets/covers/ 파일 존재 확인)
- [ ] framework items <= 5개
- [ ] `npm run validate` 통과

### 에러 처리

| 문제 | 조치 |
|------|------|
| JSON 스키마 오류 | validate 결과를 붙여넣고 수정 요청 |
| 씬 수 부족 (longform <5) | "씬이 부족합니다. keyInsight와 quote를 추가로 설계해주세요" |
| headline 초과 | "다음 headline들이 60자를 초과합니다. 줄여주세요: [목록]" |
| 특정 씬 타입 과다 | "keyInsight가 너무 많습니다. 일부를 quote나 application으로 변환해주세요" |

---

## Step 2. 영상 빌드 프롬프트

### 역할
Step 1에서 생성한 `book.json`을 기반으로 Remotion 프로젝트를 빌드한다.  
씬 컴포넌트 작성, 에셋 연결, composition 조립까지 수행.

### 입력 형식

```
[BUILD_TARGET]
book.json 파일명: {파일명}
빌드 범위: full | scene-only:{씬id} | composition-only
우선 포맷: longform | shorts | both

[EXISTING_STATE]
이미 구현된 컴포넌트: {있으면 나열, 없으면 "없음"}
알려진 이슈: {있으면 나열}
```

### 프롬프트 본문

```
# 역할
너는 Editorial Signal Remotion 프로젝트의 개발자다.
아래 book.json을 기반으로 Remotion 영상을 빌드해줘.

# 필수 참조 파일 (먼저 읽어라)
1. CLAUDE.md — 모든 규칙의 기준
2. src/types/index.ts — TypeScript 타입
3. src/schema/scene-catalog.json — 씬 규격
4. src/design/tokens/design-tokens-draft.json — 디자인 토큰
5. src/design/tokens/motion-presets.json — 모션 프리셋

# 빌드 대상
{위의 BUILD_TARGET 붙여넣기}

# 현재 상태
{위의 EXISTING_STATE 붙여넣기}

# 빌드 규칙
1. CLAUDE.md의 모든 규칙을 따른다
2. 색상·폰트·간격은 토큰에서만 참조
3. 모션은 motion-presets.json의 preset에서만 참조
4. 모든 씬 컴포넌트는 format prop(longform/shorts)을 받는다
5. 모든 외부 에셋에 fallback 처리
6. TTS narrationText는 src/tts/ttsClient.ts를 통해 처리
7. 구현 불확실한 부분은 TODO 주석으로 표시 후 최선의 버전 구현

# 빌드 순서
Phase 1: 토큰 파일 확인 및 누락된 토큰 보완
Phase 2: 필요한 primitive 컴포넌트 확인/생성
Phase 3: 씬 컴포넌트 구현 (scene-catalog.json의 layers 정의 기준)
Phase 4: Composition 조립
Phase 5: TTS 생성 및 자막 싱크
Phase 6: 로컬 preview 확인용 코드 완성

# 출력 형식
각 파일을 완성된 코드로 출력해줘.
파일 경로를 항상 명시해줘.
불확실한 부분은 코드 주석에 TODO로 표시해줘.

## 생성/수정 파일 목록
{생성하거나 수정할 파일 목록}

## 구현 코드
{파일별 완성 코드}

## 빌드 후 확인 사항
{확인이 필요한 항목}
```

### 씬별 빌드 체크리스트

각 씬 컴포넌트 완성 기준:

- [ ] `format` prop 처리됨
- [ ] `theme` prop으로 모든 색상 참조
- [ ] `from` 기준 상대 프레임으로 애니메이션 계산
- [ ] `durationFrames` props로 받음 (하드코딩 없음)
- [ ] motion preset에서 spring config 참조
- [ ] shorts 분기 처리됨
- [ ] 모든 에셋에 onError fallback
- [ ] zIndex가 scene-catalog.json의 layers 정의와 일치

### 에러 처리

| 문제 | 조치 |
|------|------|
| 타입 오류 | `src/types/index.ts` 확인 후 타입 정의 추가 |
| 토큰 참조 오류 | `design-tokens-draft.json` 경로/키 확인 |
| 에셋 없음 | `asset-manifest.json`에 항목 추가 + fallback 구현 |
| TTS 실패 | silent mode 활성화 + 자막 파일만 사용 |
| Remotion 렌더 오류 | `durationFrames` 연속성 확인 (gap/overlap) |

---

## Step 3. 검수 / 폴리시 프롬프트

### 역할
빌드된 영상을 검수하고 품질을 개선한다.  
QA 체크리스트 기준으로 문제를 찾고 수정한다.

### 입력 형식

```
[QA_TARGET]
대상 파일: {렌더된 mp4 파일명 또는 Remotion 프로젝트 경로}
포맷: longform | shorts

[KNOWN_ISSUES]
{알려진 문제점 목록. 없으면 "없음"}

[REVIEW_FOCUS]
전체 | 타이밍만 | 자막만 | 모션만 | 특정씬:{씬id}
```

### 프롬프트 본문

```
# 역할
너는 Editorial Signal 영상의 QA 엔지니어이자 폴리시 편집자다.
아래 qa-checklist.md의 모든 항목을 기준으로 빌드된 결과물을 검수하고 수정해줘.

# 필수 참조
- qa-checklist.md (기준 문서)
- CLAUDE.md (규칙 문서)

# 검수 대상
{위의 QA_TARGET 붙여넣기}

# 알려진 이슈
{위의 KNOWN_ISSUES 붙여넣기}

# 검수 범위
{위의 REVIEW_FOCUS 붙여넣기}

# 검수 절차
1. qa-checklist.md의 모든 항목을 순서대로 체크한다
2. FAIL 항목을 모두 나열한다
3. 각 FAIL 항목의 원인을 코드에서 찾는다
4. 수정 코드를 작성한다
5. 수정 후 재체크한다

# 폴리시 기준 (FAIL이 아니지만 개선 가능한 것)
- 씬 사이 리듬감 (너무 빠르거나 느린 씬)
- 타이포그래피 위계 (헤드라인 vs 바디 대비)
- 자막 타이밍 (VO와 텍스트 노출 싱크)
- 색상 사용 (accent 과다 / 부족)
- 모션 밀도 (너무 많은 동시 애니메이션)

# 출력 형식

## QA 결과 요약
| 항목 | 결과 | 비고 |
|------|------|------|
| {체크 항목} | PASS/FAIL | {내용} |

## FAIL 항목 수정
{항목별 원인 + 수정 코드}

## 폴리시 제안
{FAIL은 아니지만 개선 가능한 항목 목록}

## 최종 판정
READY_TO_PUBLISH | NEEDS_REVISION | BLOCKED

## 다음 액션
{READY_TO_PUBLISH면 render 명령 / NEEDS_REVISION이면 수정 항목 / BLOCKED면 블로킹 이슈}
```

### Step 3 완료 기준

- [ ] qa-checklist.md 전 항목 PASS
- [ ] BLOCKED 항목 없음
- [ ] 렌더 출력물 파일 크기 정상 (0KB 아님)
- [ ] 영상 길이 목표 ±5% 이내
- [ ] 자막 전 씬 커버
- [ ] `npm run qa` 자동 체크 통과

---

## 반복 작업 자동화 전략

### 매번 새로 작성해야 하는 것

```
content/books/{책id}.json    ← Step 1 프롬프트로 생성
```

단 하나. 나머지는 모두 재사용.

### 재사용 가능한 것

```
src/components/           ← 한 번 만들면 모든 영상에 재사용
src/design/tokens/        ← 브랜드 변경 시에만 수정
src/schema/               ← 수정 금지 (읽기 전용)
src/pipeline/             ← 로직 변경 시에만 수정
scripts/                  ← 커맨드 변경 시에만 수정
```

### Claude Code 세션 운영 팁

**세션 시작 시 컨텍스트 로드 순서:**
```
1. CLAUDE.md
2. src/types/index.ts
3. (작업 대상 파일)
```

**세션이 길어지면 컨텍스트가 희석된다:**
- 3~4개 이상 파일 수정 후에는 새 세션 시작 권장
- 새 세션 시작 전 현재 상태를 `progress-log.md`에 기록

**컨텍스트 유지 전략:**
```markdown
# progress-log.md (세션 간 인수인계 파일)
## 완료된 작업
- [x] CoverScene.tsx
- [x] KeyInsightScene.tsx

## 진행 중
- [ ] FrameworkScene.tsx — items 5개 stagger 구현 중

## 알려진 이슈
- SubtitleLayer zIndex 겹침 (hud:70 vs emphasis:40 확인 필요)

## 다음 세션에서 할 것
- FrameworkScene 완성
- LongformComposition 조립
```
