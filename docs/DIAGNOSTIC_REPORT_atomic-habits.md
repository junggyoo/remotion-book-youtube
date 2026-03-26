# 코드베이스 진단 보고서 — "아주 작은 습관의 힘" 5분 롱폼

> 날짜: 2026-03-26
> 대상: content/books/atomic-habits.json + 전체 파이프라인
> 목적: 8가지 렌더링 문제의 구조적 원인 분석 (코드 수정 없음)

---

## A. 파이프라인 실제 흐름 추적

### 실행 경로

```
npm run make:video content/books/atomic-habits.json
  ↓
[1] validate-content.ts → src/pipeline/validate.ts (Zod 14종 스키마)
[2] generate-captions.ts → src/tts/ttsClient.ts (edge-tts + VTT→Caption[])
    → beatNarrationResolver.ts (beat narration 연결)
    → beatTimingResolver.ts (caption 매칭 → resolvedFrame)
    → assets/tts/{sceneId}.mp3 + .json + manifest.json
[3] qa-check.ts --pre-render (manifest/audio/caption 존재 확인)
[4] render-longform.ts → Remotion CLI → LongformComposition.tsx
    → manifest.json 로드 → applyResolvedTimings()
    → SceneRenderer + Audio + BeatEmphasisCaptionLayer
[5] qa-check.ts (후처리 검증)
```

### 각 단계 구현 상태

| 단계                | 파일                            | 상태      | 산출물                  |
| ------------------- | ------------------------------- | --------- | ----------------------- |
| 1. Validate         | `src/pipeline/validate.ts`      | ✅ 동작함 | ValidationResult        |
| 2. TTS 생성         | `src/tts/ttsClient.ts`          | ✅ 동작함 | .mp3 + .json + manifest |
| 3. Beat 타이밍 해석 | `src/tts/beatTimingResolver.ts` | ✅ 동작함 | BeatTimingResolution[]  |
| 4. 자막 생성        | `src/tts/subtitleGen.ts`        | ✅ 동작함 | SubtitleEntry[]         |
| 5. Duration 동기화  | `src/pipeline/planScenes.ts`    | ✅ 동작함 | PlannedScene[]          |
| 6. Props 빌드       | `src/pipeline/buildProps.ts`    | ✅ 동작함 | CompositionProps        |
| 7. Remotion 렌더    | `LongformComposition.tsx`       | ✅ 동작함 | .mp4                    |
| 8. QA 체크          | `scripts/qa-check.ts`           | ✅ 동작함 | 콘솔 리포트             |

**Source of Truth 체인:**

- 콘텐츠 구조 → `content/books/atomic-habits.json`
- 씬 타입 정의 → `src/types/index.ts`
- 씬 기본값 → `src/schema/scene-catalog.json`
- TTS 결과 → `assets/tts/manifest.json`
- 렌더링 → `src/compositions/LongformComposition.tsx`

> **결론: 모든 파이프라인 단계가 구현되어 있고 동작한다. 스텁이나 미구현 단계는 없다.**
> 문제는 각 단계가 "잘못된 값"으로 동작하는 것이지, "동작하지 않는" 것이 아니다.

---

## B. 설계 문서 vs 실제 코드 Diff

### DSGS 파이프라인 (10단계)

| #   | 설계 단계          | 코드 구현                             | 상태        | 비고                              |
| --- | ------------------ | ------------------------------------- | ----------- | --------------------------------- |
| 1   | BookAnalyzer       | `src/analyzer/bookAnalyzer.ts`        | ✅ 구현     | BookFingerprint 생성              |
| 2   | NarrativePlanner   | `src/analyzer/narrativePlanner.ts`    | ✅ 구현     | VideoNarrativePlan 생성           |
| 3   | OpeningComposer    | `src/analyzer/openingComposer.ts`     | ✅ 구현     | OpeningPackage 생성               |
| 4   | ScenePlanner       | `src/planner/scenePlanner.ts`         | ✅ 구현     | preset 매칭                       |
| 5   | GapDetector        | `src/planner/gapDetector.ts`          | ✅ 구현     | gap 식별                          |
| 6   | SceneSynthesizer   | `src/planner/sceneSynthesizer.ts`     | ⚠️ 스텁     | VCL 엔진 미작동                   |
| 6.5 | AssetPlanner       | 타입만 존재                           | ❌ 미구현   | MediaPlan 정의는 있으나 로직 없음 |
| 7   | BlueprintValidator | `src/validator/blueprintValidator.ts` | ✅ 구현     |                                   |
| 8   | BlueprintRenderer  | `src/renderer/BlueprintRenderer.tsx`  | ⚠️ 데드코드 | 존재하지만 호출되지 않음          |
| 9   | ScenePromoter      | 없음                                  | ❌ 미구현   | 재사용성 평가 시스템 부재         |

### 현재 실제 사용 경로

**atomic-habits.json은 DSGS 파이프라인(1-9)을 사용하지 않는다.**
대신 아래 경로를 탄다:

```
수작업 JSON 작성 → validate → TTS → planScenes → buildProps → Remotion render
```

DSGS의 Analyzer/Planner/Synthesizer는 **자동 씬 생성용**이며,
현재 콘텐츠는 **수동 작성된 JSON**을 직접 렌더링한다.
BlueprintRenderer는 `case "custom":`에서만 호출되며, atomic-habits에는 custom 씬이 없다.

### Beat 시스템 (BEAT_SYSTEM_DESIGN_SPEC v0.2)

| 항목                | 설계      | 코드                                    | 상태    |
| ------------------- | --------- | --------------------------------------- | ------- |
| Beat 인터페이스     | 정의됨    | `src/types/index.ts` L779-835           | ✅ 일치 |
| resolveBeats        | 정의됨    | `src/hooks/resolveBeats.ts`             | ✅ 일치 |
| useBeatTimeline     | 정의됨    | `src/hooks/useBeatTimeline.ts`          | ✅ 일치 |
| BeatElement         | 정의됨    | `src/components/motion/BeatElement.tsx` | ✅ 일치 |
| 14종 씬 beat 통합   | 전체 적용 | 전체 적용                               | ✅ 일치 |
| Wildcard("\*") 폴백 | 정의됨    | 구현됨                                  | ✅ 일치 |
| emphasisTargets     | 정의됨    | CaptionLayer 연동                       | ✅ 일치 |

---

## C. 8개 문제 각각의 원인 분석

### 문제 1: 영상이 무조건 cover로 시작

**원인:** 단일 — 콘텐츠 JSON의 scenes 배열 순서
**관련 파일:** `content/books/atomic-habits.json` L29-71

```
scenes[0] = cover-01 (type: "cover")
scenes[1] = hook-01  (type: "highlight")
```

- `LongformComposition.tsx`는 scenes 배열을 **순서 그대로** 렌더링 (L296)
- 순서 변경 로직 없음 — JSON에서 hook을 앞에 놓으면 hook-first 가능
- validate.ts가 `scenes[0].type === 'cover'`를 **강제**하는지 확인 필요
  → validate.ts에서 cover-first 검사가 있으면, hook-first로 바꾸려면 validator 수정 필요

**결론:** 코드 문제가 아니라 **콘텐츠 설계 결정**. hook-first를 원하면 JSON 순서 변경 + validator 조건 완화.

---

### 문제 2: 책 커버 이미지 부재

**원인:** 단일 — 에셋 파일 미존재
**관련 파일:**

- `content/books/atomic-habits.json` L9, L39: `"coverImageUrl": "covers/atomic-habits-cover.png"`
- `src/scenes/CoverScene.tsx`: `ImageMask` 컴포넌트로 렌더링
- `src/components/primitives/ImageMask.tsx`: `staticFile(src)` → `assets/covers/atomic-habits-cover.png`

```
assets/covers/atomic-habits-cover.png → 존재하는가?
```

- ImageMask에 `onError` 폴백 있음 (theme.surfaceMuted 색상 rect)
- 이미지가 없으면 회색 박스만 표시됨
- **이미지 수집/저장 파이프라인 없음** — AssetPlanner(6.5단계) 미구현

**결론:** 이미지를 수동으로 `assets/covers/`에 배치해야 함. 자동화 로직 없음.

---

### 문제 3: 영상/자막/음성 길이 싱크 불일치 ⭐ 핵심 문제

**원인:** 복합 — durationFrames 결정 체인의 구조적 결함

**Duration Resolution Decision Tree** (`src/pipeline/planScenes.ts`):

```
1. scene.durationFrames 명시값 → 그대로 사용 (최고 우선순위)
2. TTS 없음 → scene-catalog.json 기본값
3. TTS 있음 → TTS.durationFrames + 15
```

**문제:** atomic-habits.json의 **모든 11개 씬이 durationFrames를 명시적으로 설정**하고 있다.
따라서 Rule 1이 항상 적용되고, **TTS 실제 길이가 무시된다.**

| 씬               | JSON durationFrames | TTS durationFrames | 차이 (초)             | 상태    |
| ---------------- | ------------------- | ------------------ | --------------------- | ------- |
| cover-01         | 420 (14.0s)         | 229 (7.6s)         | +6.4s 침묵            | ⚠️ 과다 |
| hook-01          | 750 (25.0s)         | 424 (14.1s)        | +10.9s 침묵           | 🔴 심각 |
| insight-compound | 660 (22.0s)         | 507 (16.9s)        | +5.1s 침묵            | ⚠️ 과다 |
| chapter-01       | 180 (6.0s)          | 170 (5.7s)         | +0.3s                 | ✅ 양호 |
| framework-01     | 1050 (35.0s)        | 872 (29.1s)        | +5.9s 침묵            | ⚠️ 과다 |
| insight-identity | 750 (25.0s)         | 702 (23.4s)        | +1.6s                 | ✅ 양호 |
| compare-01       | 690 (23.0s)         | 690 (23.0s)        | 0s                    | ✅ 정확 |
| application-01   | 750 (25.0s)         | 899 (30.0s)        | **−5.0s 오디오 잘림** | 🔴 심각 |
| quote-01         | 480 (16.0s)         | 288 (9.6s)         | +6.4s 침묵            | ⚠️ 과다 |
| insight-recap    | 570 (19.0s)         | TTS 확인 필요      | —                     | —       |
| closing-01       | 450 (15.0s)         | TTS 확인 필요      | —                     | —       |

**핵심 발견:**

1. **11개 씬 중 6개**에서 TTS보다 씬 durationFrames가 훨씬 큼 → 나레이션 끝나고 **침묵 구간** 발생
2. **application-01**에서 TTS(899f)가 씬(750f)보다 **149프레임(5초) 초과** → 오디오 잘림
3. Beat ratio가 씬 durationFrames 기준으로 적용되므로, 오디오와 비주얼 타이밍 불일치 발생

**Beat 타이밍 왜곡 메커니즘:**

```
applyResolvedTimings()에서:
  startRatio = resolvedStartFrame / sceneDurationFrames

예: hook-01
  beat hook-b3 resolvedEndFrame=422, sceneDurationFrames=750
  → endRatio = 422/750 = 0.563

  원래 endRatio=1.0이었으나 0.563으로 압축됨
  → 씬의 마지막 43.7% (10.9초)는 beat 없이 정적 상태
```

```
예: application-01 (오디오 초과)
  beat app-b4 resolvedEndFrame=897, sceneDurationFrames=750
  → endRatio = 897/750 = 1.196 (>1.0!)

  → 마지막 beat이 씬 경계를 초과하여 잘림
  → 오디오도 750프레임(25초) 시점에서 강제 잘림
```

---

### 문제 4: 자막이 이상한 위치에서 잘림 + 글자 단위 컬러 효과

**원인:** 복합

**(a) 자막 분절 문제:**

- `subtitleGen.ts`의 `splitKoreanSentences()`는 마침표/물음표/느낌표 기준으로 분리
- 한국어 조사나 어미 중간에서 잘리지는 않지만, **한 문장이 28자를 넘으면** `splitToLines()`가 공백 기준 줄바꿈
- 공백이 없는 긴 한국어 문장은 **28자 강제 절단** → 의미 단위 무시 가능

**(b) 글자 단위 컬러 효과:**

- `CaptionLayer.tsx`가 `@remotion/captions`의 TikTok 스타일 렌더링 사용
- **단어 단위 하이라이트**가 기본 동작 (현재 단어에 signal 색상 적용)
- `emphasisTargets` + `emphasisTimeRangeMs`가 beat 기간 동안 특정 키워드에 강조색 적용
- 한국어 suffix-stripping으로 "목표를" → "목표" 매칭 시도하지만 완벽하지 않음

**관련 파일:**

- `src/tts/subtitleGen.ts`: splitKoreanSentences(), splitToLines()
- `src/components/hud/CaptionLayer.tsx`: 단어 하이라이트 + emphasis

---

### 문제 5: 나레이션 "첫째" → 화면 "둘째" + 빈 화면

**원인:** 복합 — **문제 3의 파생 효과 + beat 인덱싱 오류**

**(a) 타이밍 불일치 (문제 3 파생):**

- 씬 durationFrames가 TTS보다 크면, `applyResolvedTimings()`이 beat ratio를 압축
- 결과: beat가 씬 전반부에 몰리고, 후반부는 빈 화면(마지막 활성 요소만 정적 표시)
- 나레이션과 비주얼 전환 시점이 어긋남

**(b) Framework/Application 인덱싱 off-by-one:**

**FrameworkScene.tsx L157:**

```tsx
const itemKey = `item-${index}`; // index: 0, 1, 2, 3 → "item-0", "item-1", "item-2", "item-3"
```

**atomic-habits.json L256:**

```json
"activates": ["item-1"]  // "첫째"를 가리키려고 했으나...
```

**매핑 결과:**
| 나레이션 | beat activates | 렌더러 해석 | 실제 표시 |
|---------|---------------|------------|----------|
| "첫째, 분명하게" | item-1 | items[1] (2번째) | "매력적으로 만들어라" ← **오류** |
| "둘째, 매력적으로" | item-2 | items[2] (3번째) | "쉽게 만들어라" ← **오류** |
| "셋째, 쉽게" | item-3 | items[3] (4번째) | "만족스럽게 만들어라" ← **오류** |
| "넷째, 만족스럽게" | item-4 | items[4] → **undefined** | **빈 화면** ← **오류** |

**동일한 문제가 ApplicationScene에도 존재** (step-1, step-2, step-3 인덱싱).

**관련 파일:**

- `src/scenes/FrameworkScene.tsx` L156-158
- `src/scenes/ApplicationScene.tsx` (동일 패턴)
- `content/books/atomic-habits.json` L239-290, L394-465

---

### 문제 6: Beat 간 애니메이션이 정적 — 텍스트 슬라이드

**원인:** 복합

**(a) 모션 강도 제한:**

- BeatElement의 모션 타입은 4종: `architectural`(Y이동+페이드), `scale`(확대+페이드), `slide`(X이동+페이드), `none`
- 모든 모션이 **opacity + transform(translate/scale)** 만 사용
- 최대 이동거리: Y 24px, X 40px, scale 1.06
- "입장" 이후 **요소가 정적으로 유지** — exit 애니메이션 미구현 (deactivates TODO)
- emphasis는 1.02 scale pulse만 있음

**(b) Beat 전환 패턴의 단조로움:**

- `transition: "enter"`만 사용됨 (replace, emphasis는 atomic-habits에서 사용하지 않음)
- 한 beat에서 다음 beat으로 갈 때 **새 요소가 나타나기만** 할 뿐, 이전 요소가 퇴장하지 않음
- 결과: 화면에 요소가 **누적**될 뿐, **교체**되지 않음

**(c) 씬 간 전환 없음:**

- 씬 경계에서 아무런 전환 효과 없이 바로 다음 씬으로 전환
- TransitionScene 타입이 존재하지만 atomic-habits에서 사용하지 않음

**관련 파일:**

- `src/components/motion/BeatElement.tsx`: 4종 모션 프리미티브
- `src/components/motion/ArchitecturalReveal.tsx`: Y+opacity만
- `src/hooks/useBeatTimeline.ts`: exit 상태 미처리

---

### 문제 7: 컴포넌트가 전반적으로 단조로움

**원인:** 복합

**(a) 실제 사용 씬 타입 분포 (atomic-habits):**

```
cover(1) + highlight(1) + keyInsight(3) + chapterDivider(1)
+ framework(1) + compareContrast(1) + application(1) + quote(1) + closing(1)
= 11씬, 9종 타입
```

- 14종 중 5종 미사용 (timeline, data, listReveal, splitQuote, transition)
- keyInsight가 3회 반복 → 시각적 변화 적음

**(b) 시각 요소 제한:**

- 모든 씬이 **텍스트 + 배경색**으로 구성
- 이미지: CoverScene에서만 사용 (그마저도 파일 미존재)
- 아이콘: `iconId` 필드가 타입에 있으나 렌더러에서 **미구현** (FrameworkScene, ApplicationScene 모두 TODO)
- 차트: DataScene에 구현되어 있으나 atomic-habits에서 미사용
- 배경 텍스처: 미묘한 surfaceMuted 오버레이만 (opacity 0.04-0.08)

**(c) 레이아웃 다양성 부족:**

- 대부분 씬이 **중앙 정렬 텍스트 블록** 패턴
- split-compare(좌우분할)는 CompareContrastScene에서만
- grid-expand(그리드)는 FrameworkScene에서만
- 시각적 다양성이 구조적으로 제한됨

**관련 파일:**

- `src/scenes/FrameworkScene.tsx` L~160: iconId TODO
- `src/scenes/ApplicationScene.tsx`: iconId TODO

---

### 문제 8: 설계 문서 워크플로우대로 실행되는지 의심

**원인:** **정당한 의심 — 설계와 실행이 다른 경로를 탄다**

| 설계 문서 경로 (DSGS)                             | 실제 실행 경로              |
| ------------------------------------------------- | --------------------------- |
| BookAnalyzer → NarrativePlanner → OpeningComposer | ❌ 사용 안 함               |
| ScenePlanner → GapDetector → SceneSynthesizer     | ❌ 사용 안 함               |
| BlueprintValidator → BlueprintRenderer            | ❌ BlueprintRenderer 미호출 |
| ScenePromoter                                     | ❌ 미구현                   |
| **실제:** JSON 수작업 → validate → TTS → render   | ✅ 이 경로만 동작           |

DSGS 1-9단계는 **자동화된 씬 생성** 파이프라인이다.
현재 atomic-habits는 **수동 작성된 JSON**을 바로 렌더링한다.
두 경로는 **병렬로 존재**하며, 현재는 수동 경로만 활성화되어 있다.

---

## D. Content Contract 검증

### 씬 타입별 content 필드 ↔ 렌더러 사용 키 매핑

| 씬 타입         | content 필드                                          | beat element keys                                           | 일치 여부        |
| --------------- | ----------------------------------------------------- | ----------------------------------------------------------- | ---------------- |
| cover           | title, subtitle, author, coverImageUrl, brandLabel    | coverImage, title, subtitle, author, brandLabel             | ✅               |
| highlight       | mainText, subText, highlightColor, showPulse          | mainText, subText, signalBar                                | ✅               |
| keyInsight      | headline, supportText, underlineKeyword, evidenceCard | signalBar, headline, supportText, evidenceCard              | ⚠️ 주의사항 있음 |
| chapterDivider  | chapterNumber, chapterTitle, chapterSubtitle          | chapterNumber, chapterTitle, chapterSubtitle                | ✅               |
| framework       | frameworkLabel, items[]                               | frameworkLabel, **item-0**, item-1, item-2...               | 🔴 인덱싱 불일치 |
| compareContrast | leftLabel, leftContent, rightLabel, rightContent      | leftLabel, leftContent, rightLabel, rightContent, connector | ✅               |
| application     | anchorStatement, steps[]                              | anchorStatement, **step-0**, step-1, step-2...              | 🔴 인덱싱 불일치 |
| quote           | quoteText, attribution                                | quoteMark, quoteText, attribution                           | ✅               |
| closing         | recapStatement, ctaText                               | recapStatement, ctaText, brandLabel                         | ✅               |

### 치명적 매핑 오류

#### 🔴 Framework/Application 인덱싱 off-by-one

**렌더러** (0-indexed): `item-0`, `item-1`, `item-2`, `item-3`
**콘텐츠** (1-indexed): `item-1`, `item-2`, `item-3`, `item-4`

→ 모든 항목이 1칸씩 밀림. 마지막 항목(`item-4`)은 존재하지 않는 items[4] 참조.

#### ⚠️ KeyInsight evidenceCard Wildcard 제외

- Wildcard(`*`) 모드에서 `WILDCARD_STAGGER`에 evidenceCard가 **포함되지 않음**
- beat 없이 evidenceCard를 사용하면 카드가 표시되지 않음
- atomic-habits에서는 beat이 evidenceCard를 명시적으로 활성화하므로 **현재는 문제 없음**
- 하지만 beat 없는 씬에서 evidenceCard 사용 시 버그 발생

---

## E. Duration/Sync 체인 분석

### Duration 결정 기준

```
resolveDuration(scene, ttsResult):
  IF scene.durationFrames (명시값) → return scene.durationFrames  ← 현재 모든 씬이 여기 해당
  ELIF no TTS → return scene-catalog.json durationFramesDefault
  ELIF TTS ≤ catalogDefault + 60 → return TTS.durationFrames + 15
  ELSE → throw Error (나레이션 너무 김)
```

**문제:** 명시값이 최우선이므로 TTS 결과가 무시됨.

### Audio Duration → Scene Duration 반영 경로

```
edge-tts → .mp3 → ffprobe → durationMs → durationFrames = ceil(durationMs/1000 * 30)
                                ↓
                  manifest.json에 기록됨
                                ↓
          BUT planScenes()에서 scene.durationFrames 명시값이 우선 → TTS 길이 무시
```

### Subtitle Timing → Audio 정렬

```
subtitleGen.ts:
  splitKoreanSentences(narrationText)
  → 각 문장을 Caption[] 단어에 매칭 (텍스트 오버랩)
  → caption.startMs/endMs → frame 변환
  → LEAD_FRAMES=3, TRAIL_FRAMES=6 적용
```

자막 타이밍 자체는 **오디오 기준으로 정확**하다.
문제는 **씬이 오디오보다 길어서** 자막이 끝나도 씬이 계속되는 것.

### Beat Ratio → Absolute Time 변환

```
beatTimingResolver.ts:
  beat.narrationText가 있으면 → caption 매칭으로 실제 프레임 계산
  없으면 → ratio × sceneDurationFrames (폴백)

LongformComposition.tsx applyResolvedTimings():
  newStartRatio = resolvedStartFrame / sceneDurationFrames
  newEndRatio = resolvedEndFrame / sceneDurationFrames
```

**왜곡 사례:**

```
hook-01: TTS=424f, scene=750f
  beat hook-b3: resolvedEnd=422f → ratio = 422/750 = 0.563
  원래 ratio=1.0 → 0.563으로 압축
  → 씬의 43.7%가 활동 없는 침묵 구간

application-01: TTS=899f, scene=750f
  beat app-b4: resolvedEnd=897f → ratio = 897/750 = 1.196
  → ratio > 1.0 → beat이 씬 밖으로 밀려남
  → 마지막 beat 절반이 렌더링되지 않음
  → 오디오 25초 지점에서 잘림 (5초 손실)
```

---

## F. 수정 우선순위 제안

### 🔴 즉시 수정해야 할 구조적 결함 3개

#### 결함 1: Duration 불일치 (문제 3, 5의 근본 원인)

**현상:** 씬 durationFrames가 TTS와 무관하게 고정됨
**근본 해결:** content JSON에서 `durationFrames` 제거 → TTS 기반 자동 계산 의존
**단기 패치:** `durationFrames`를 TTS + 15f 기준으로 재계산하는 스크립트

```
Phase 1 해결: durationFrames 제거 또는 TTS 후 자동 갱신
영향 범위: content JSON + planScenes.ts
```

#### 결함 2: Beat 인덱싱 off-by-one (문제 5의 직접 원인)

**현상:** content의 `item-1`이 렌더러의 `items[1]`(두 번째 항목)에 매핑
**근본 해결:** 다음 중 하나 택일:

- (A) 렌더러를 1-indexed로 변경: `item-${index + 1}`
- (B) 콘텐츠를 0-indexed로 변경: `item-0`, `item-1`, ...
- (C) 양쪽 모두 지원하는 alias 시스템

**추천:** (B) — 렌더러가 JavaScript 배열 인덱스와 일치하는 것이 자연스러움

```
Phase 1 해결: content JSON의 beat activates 키를 0-indexed로 수정
영향 범위: content JSON (framework, application 씬의 beats)
```

#### 결함 3: 오디오 절단 (application-01)

**현상:** TTS(899f=30s)가 씬(750f=25s)보다 5초 김
**근본 해결:** 결함 1 해결 시 자동 해결 (TTS 기반 duration이면 씬이 오디오에 맞춰짐)
**단기 패치:** application-01의 durationFrames를 914 (899+15)로 수정

```
Phase 1 해결: 결함 1과 동시 해결
```

---

### Phase 분류

| Phase             | 범위              | 대상 문제  | 작업 내용                                                |
| ----------------- | ----------------- | ---------- | -------------------------------------------------------- |
| **Phase 1: 싱크** | Duration + 인덱싱 | #3, #5     | durationFrames 자동화, off-by-one 수정, 오디오 절단 해소 |
| **Phase 2: 구조** | 에셋 + 전환       | #1, #2, #8 | hook-first 옵션, 커버 이미지 파이프라인, DSGS 경로 정비  |
| **Phase 3: 표현** | 모션 + 다양성     | #4, #6, #7 | exit 애니메이션, 전환 효과, 아이콘 렌더링, 자막 개선     |

### Phase 1 → Phase 2 → Phase 3 순서 근거

- Phase 1은 **현재 영상이 깨지는** 문제를 수정 (오디오 잘림, 화면-나레이션 불일치)
- Phase 2는 **영상 구조의 완성도**를 높임 (hook-first, 이미지, DSGS 연결)
- Phase 3은 **시각적 품질**을 올림 (모션, 다양성) — Phase 1/2 없이는 효과 미미

---

## 부록: 관련 파일 인덱스

| 영역       | 파일                                       | 역할                |
| ---------- | ------------------------------------------ | ------------------- |
| 콘텐츠     | `content/books/atomic-habits.json`         | 소스 데이터         |
| 타입       | `src/types/index.ts`                       | 타입 단일 소스      |
| 파이프라인 | `src/pipeline/planScenes.ts`               | Duration 결정       |
| 파이프라인 | `src/pipeline/buildProps.ts`               | 최종 props 빌드     |
| TTS        | `src/tts/ttsClient.ts`                     | TTS 생성            |
| TTS        | `src/tts/beatTimingResolver.ts`            | Beat→프레임 변환    |
| TTS        | `src/tts/subtitleGen.ts`                   | 자막 생성           |
| 에셋       | `assets/tts/manifest.json`                 | TTS 결과 메타데이터 |
| 렌더링     | `src/compositions/LongformComposition.tsx` | 메인 컴포지션       |
| 씬         | `src/scenes/FrameworkScene.tsx` L156-158   | 인덱싱 문제         |
| 씬         | `src/scenes/ApplicationScene.tsx`          | 인덱싱 문제         |
| 모션       | `src/components/motion/BeatElement.tsx`    | Beat 모션           |
| HUD        | `src/components/hud/CaptionLayer.tsx`      | 자막 렌더링         |
| 검증       | `src/pipeline/validate.ts`                 | 콘텐츠 검증         |
| 설계       | `docs/DSGS_CANONICAL_SPEC_v1.md`           | 정규 스펙           |
| 설계       | `docs/BEAT_SYSTEM_DESIGN_SPEC_v0.2.md`     | Beat 스펙           |
