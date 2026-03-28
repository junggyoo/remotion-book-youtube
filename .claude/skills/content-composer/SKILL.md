---
name: content-composer
description: >
  BookFingerprint와 VideoNarrativePlan을 기반으로 content JSON을 생성한다.
  book-analyst 스킬 실행 후 자동으로 이어지는 다음 단계.
  "영상 만들어줘", "롱폼 생성", "book video" 등의 요청 시 활성화.
triggers:
  - 영상 만들어
  - 롱폼 생성
  - 책 요약 영상
  - book video
  - make video
---

# Content Composer Skill

book-analyst의 출력(BookFingerprint + VideoNarrativePlan)을 받아서 content/books/\*.json을 생성하는 스킬.

## 전체 플로우

```
사용자: "부자 아빠 가난한 아빠 영상 만들어줘"
    ↓
Step 1: book-analyst 에이전트 호출 → BookFingerprint + VideoNarrativePlan
    ↓
Step 2: content JSON 생성 (이 스킬의 핵심)
    ↓
Step 3: 스키마 검증 (npm run validate)
    ↓
Step 4: 오케스트레이터 실행 (dsgs-orchestrate.ts)
    ↓
output/*.mp4
```

## Step 1: book-analyst 호출

book-analyst 에이전트를 호출해서 다음을 얻는다:

- BookFingerprint: genre, structure, hookStrategy, emotionalTone, visualMotifs 등
- VideoNarrativePlan: segments 배열 + emotionalCurve

book-analyst가 웹 검색으로 책 정보를 조사하고, 5가지 질문 프레임워크로 분석한다.
**이 단계를 건너뛰지 않는다.**

## Step 2: content JSON 생성

### 2-0. 기존 규칙 참조 (필수)

아래 두 파일의 규칙을 반드시 따른다:

- `.claude/rules/content-generation-contract.md` — budget 계산, 나레이션 분량, 자체 검증 절차
- `.claude/rules/content-authoring-rules.md` — duration 규칙, beat activates key, narration 규칙

### 2-1. 템플릿 참조 (필수)

content/books/atomic-habits.json을 먼저 읽어서 정확한 스키마를 파악한다.
필드명, 타입, 중첩 구조를 추측하지 말고 이 파일을 직접 참조한다.

### 2-2. 씬 구성 결정

BookFingerprint를 기반으로 씬 구성을 결정한다:

| BookFingerprint 필드 | 씬 구성 결정                         |
| -------------------- | ------------------------------------ |
| structure: framework | framework 씬 포함                    |
| structure: narrative | keyInsight 중심, framework 생략 가능 |
| structure: argument  | compareContrast 포함                 |
| hookStrategy         | hook 씬(highlight 타입)의 톤 결정    |
| keyConceptCount      | keyInsight 씬 개수 결정 (2~3개)      |
| visualMotifs         | 비유/은유 기반 씬 추가 여부          |

필수 씬: cover(첫 번째), closing(마지막)
선택 씬: hook, keyInsight, framework, compareContrast, quote, application, chapterDivider, data

**기계적 복사 금지**: 모든 책에 같은 구성을 넣지 않는다.
책 내용에 맞는 씬만 포함한다.

### 2-3. Duration 계산

content-generation-contract.md의 절차를 따른다:

1. `production.targetDurationSeconds` 설정 (보통 300~480초)
2. 총 나레이션 글자수 = targetDurationSeconds × CPS
   - qwen3-tts speed=1.25 기준: CPS ≈ 7.1
   - edge-tts speed=1 기준: CPS ≈ 5.7
3. 각 씬의 글자수 = 씬 duration 비율에 비례하여 배분
4. 씬별 minChars 이상 필수, maxChars 초과 금지

### 2-4. 나레이션 대본 작성

각 씬의 narrationText를 작성한다:

- BookFingerprint의 entryAngle, coreFramework를 활용
- 한국어 유튜브 나레이션 톤 (구어체, 정보 밀도)
- 씬 타입별 가이드라인은 content-generation-contract.md Step 3 참조

**핵심**: 각 beat의 narrationText 합 = 씬 narrationText (정확히 일치)

- `beats.map(b => b.narrationText).join(" ") === scene.narrationText`
- beat 경계에서 공백 하나로 연결됨에 주의

### 2-5. Beat 분할

각 씬에 beats 배열을 작성한다 (8초+ 씬에는 필수):

beat 작성 규칙:

- beat.id: `"{sceneId}-b{n}"` 형식
- beat.role: `"headline" | "support" | "evidence" | "reveal" | "hook" | "recap"` 등
- beat.startRatio / endRatio: 0~1 범위, 겹침 없음, 연속
- beat.activates: 씬 컴포넌트의 BeatElement key — **BEAT_KEYS.md 참조 필수**
- beat.emphasisTargets: 자막에서 하이라이트할 키워드 (activates와 혼용 금지)
- beat.transition: `"enter" | "replace" | "emphasis"`
- 최소 beat 길이: endRatio - startRatio >= 0.12

### 2-5.5. Thumbnail 자동 생성

BookFingerprint에서 thumbnail 필드를 자동 생성한다.

`src/thumbnail/auto-config.ts`의 `generateThumbnailConfig(fingerprint)` 함수를 참고하여
아래 매핑 규칙에 따라 thumbnail 객체를 생성한다:

| BookFingerprint 필드                 | → ThumbnailConfig 필드                             |
| ------------------------------------ | -------------------------------------------------- |
| entryAngle                           | hookText (30자 이내로 절삭)                        |
| coreFramework 또는 uniqueElements[0] | accentWord                                         |
| hookStrategy                         | expression, gesture (매핑 테이블 참조)             |
| urgencyLevel                         | mood (high→urgent, medium→dramatic, low→confident) |
| genre                                | backgroundStyle (장르별 기본값)                    |

**hookStrategy → expression/gesture 매핑:**

| hookStrategy   | expression            | gesture                            |
| -------------- | --------------------- | ---------------------------------- |
| pain           | 깊은 고민에 빠진 표정 | 양손으로 머리를 감싸는 제스처      |
| contrarian     | 자신감 넘치는 표정    | X자 제스처                         |
| transformation | 확신에 찬 표정        | 검지 손가락을 세움                 |
| identity       | 진지하고 단호한 표정  | 가슴에 손을 얹는 제스처            |
| question       | 의아한 표정           | 턱에 손을 대고 생각하는 포즈       |
| system         | 분석적인 표정         | 양손으로 구조를 설명하는 손짓      |
| urgency        | 긴박한 표정           | 양손으로 얼굴을 받치며 놀란 제스처 |

**규칙:**

- 사용자가 이미 thumbnail 필드를 직접 작성한 경우, 자동 생성을 건너뛴다
- **hookText는 entryAngle 기반 초안이다.** 클릭 유도력이 약하면 더 강한 카피로 수정할 것. entryAngle은 영상 진입 각도 설명이고, hookText는 썸네일 클릭 유도 카피이므로 성격이 다를 수 있다.
- accentWord가 hookText에 포함되지 않으면 accentWord를 생략한다

### 2-6. JSON 파일 저장

content/books/{book-id}.json으로 저장.

- narration 있는 씬에 durationFrames 직접 명시 금지 (TTS가 결정)
- thumbnail 필드는 Step 2-5.5에서 자동 생성됨 (사용자가 직접 작성한 경우 유지)

## Step 3: 스키마 검증

```bash
npm run validate -- content/books/{book-id}.json
```

에러가 나면:

1. 에러 메시지를 읽는다
2. 해당 필드를 수정한다
3. 다시 validate한다
4. 통과할 때까지 반복한다

## Step 4: 오케스트레이터 실행

```bash
# 오케스트레이터 실행 (TTS + 렌더 포함)
npx ts-node scripts/dsgs-orchestrate.ts content/books/{book-id}.json --mode auto --format longform
```

오케스트레이터가 Stage 1~8을 자동 실행한다.
Stage 7(validation)에서 실패하면 content JSON을 수정하고 재실행.
Stage 8에서 TTS + 렌더가 자동으로 진행된다.

## 스키마 주의사항 (자주 틀리는 필드)

| 필드                         | 올바른 값                                                     | 흔한 실수                          |
| ---------------------------- | ------------------------------------------------------------- | ---------------------------------- |
| production.format            | `"longform"` (string)                                         | `{ format: "longform", ... }` 객체 |
| evidenceCard.type            | `"case" \| "statistic" \| "analogy" \| "quote" \| "research"` | `"definition"` 등 없는 값          |
| chapterDivider.chapterNumber | number (1, 2, 3)                                              | `"Part 1"` 같은 string             |
| framework items              | `{ number, title, description }`                              | `{ label, description }`           |
| application steps            | `{ title, detail }`                                           | `{ number, label, detail }`        |
| compareContrast.leftTag      | `"before"\|"myth"\|"wrong"\|"common"\|"custom"`               | 자유 텍스트                        |
| compareContrast.rightTag     | `"after"\|"fact"\|"right"\|"author"\|"custom"`                | 자유 텍스트                        |
| compareContrast.revealOrder  | `"simultaneous"\|"left-first"\|"right-first"`                 | `"sequential"`                     |
| compareContrast content      | `leftContent`, `rightContent` (string)                        | `leftItems` (array)                |
| narration.ttsEngine          | `"fish-audio"` (권장) / `"qwen3-tts"` / `"edge-tts"`          | 더 이상 사용하지 않는 엔진         |

## BeatElement Key 참조

같은 디렉토리의 **BEAT_KEYS.md**를 참조한다.
이 파일은 `scripts/extract-beat-keys.ts`로 자동 생성 가능.

각 씬 타입별로 beat.activates에 사용할 수 있는 키가 정의되어 있다.
존재하지 않는 키를 사용하면 해당 beat의 시각 효과가 동작하지 않는다 (silent failure).

## TTS 감정 태그 (Fish Audio S2)

Fish Audio S2 사용 시, narrationText에 감정 태그를 자동 삽입한다.
태그는 generate-captions.ts에서 씬 타입별로 자동 삽입되므로,
content JSON에는 태그를 넣지 않는다.

자동 매핑:

- hook (highlight) → [excited]
- cover → [confident]
- keyInsight → [enthusiastic]
- chapterDivider → [calm]
- framework → [confident]
- compareContrast → [curious]
- quote → [soft tone]
- application → [encouraging]
- closing → [warm]
- data → [confident]

수동으로 특정 beat에 감정을 지정하고 싶으면,
beat.\_emotionOverride 필드를 추가할 수 있다 (선택사항).

## 절대 금지

- book-analyst를 건너뛰고 바로 content JSON 작성
- atomic-habits.json의 씬 구조를 그대로 복사하고 텍스트만 바꾸기
- 필드명을 추측 (반드시 atomic-habits.json 참조)
- generated/ 폴더의 파일을 수동 작성
- 오케스트레이터를 우회
- Root.tsx에 수동으로 Composition 등록
