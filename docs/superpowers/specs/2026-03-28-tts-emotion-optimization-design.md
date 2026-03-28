# TTS 감정 표현 최적화 설계

> Fish Audio S2 공식 문서 모범 사례 기반, 영상 생성 파이프라인의 TTS 감정 표현 품질 향상

**날짜:** 2026-03-28
**상태:** Draft
**영향 범위:** content-composer, content-authoring-rules, Beat 타입, fish-audio-engine, beatNarrationResolver, mediaPlanExecutor

---

## 1. 문제 정의

### 현재 상태

현재 TTS 감정 표현 시스템에 세 가지 문제가 있다.

**1-1. 씬 전체에 감정 태그 1개만 적용**

`addEmotionTag()`가 씬의 전체 narrationText(10~30초 분량) 앞에 태그 1개만 붙인다.
Fish Audio S2 공식 문서는 "Use one emotion per sentence"를 권장한다.
첫 문장 이후의 감정 표현이 사실상 무시되어, 긴 나레이션이 평탄하게 읽힌다.

```
현재: [열정적이고 강조하는 톤으로] 문장1. 문장2. 문장3. 문장4. 문장5.
권장: [호기심] 문장1. [강조] 문장2. [차분] 문장3. [경고] 문장4. [따뜻] 문장5.
```

**1-2. mediaPlanExecutor에서 sceneType 미전달**

`mediaPlanExecutor.ts`의 `generateTTSWithCaptions()` 호출에서 `sceneType` 인자가 누락되어,
DSGS 파이프라인 경로에서는 감정 태그 자체가 붙지 않는다.

**1-3. narration 문체가 감정을 담지 못함**

Fish Audio S2의 감정 표현은 태그 + 문장 텍스트의 조합으로 결정된다.
태그만으로 음성을 강제할 수 없으며, 문장 자체에 감정이 실리는 문체적 장치가 필요하다.
현재 narration은 정보 전달 위주의 평서문으로 작성되어 있어, 태그를 붙여도 효과가 제한적이다.

```
현재: 매일 1%씩 나아지면 1년 뒤 37배가 됩니다.
개선: 매일 1%씩만 나아져 보세요. 1년 뒤? 무려 37배입니다!
```

### 핵심 인사이트

**태그가 아니라 문체가 감정의 본체다.** 감정 태그는 보조 수단이며, narration 텍스트 자체가
오디오북 화법으로 작성되어야 TTS 엔진이 감정을 자연스럽게 표현할 수 있다.

---

## 2. 설계 원칙

1. **문체 우선**: 감정 표현의 70~80%는 narration 문체가 결정한다. 태그는 보조.
2. **단일 경로**: `emotionTag`가 있으면 사용, 없으면 태그 없이 문체만으로. fallback 경로 없음.
3. **불일치 방지**: 문체와 맞지 않는 태그는 붙이지 않는다. 태그 없음 > 불일치 태그.
4. **스키마 최소 변경**: Beat 인터페이스에 optional 필드 1개 추가. 기존 JSON 호환 유지.
5. **파이프라인 단계 추가 없음**: content-composer 프롬프트 개선으로 해결.

---

## 3. 두 레이어 구조

### 레이어 1 — Narration 문체 (높은 임팩트)

content-composer가 narration을 작성할 때 오디오북 화법으로 작성하도록 가이드라인을 추가한다.

#### 오디오북 화법 가이드라인

content-authoring-rules.md에 다음 규칙을 추가:

```markdown
## 오디오북 화법 규칙

narrationText는 "읽히는 글"이 아니라 "들리는 말"로 작성한다.
TTS 엔진이 감정을 실을 수 있는 문체적 장치를 활용한다.

### 필수 장치 (beat당 최소 1개 사용)

1. **질문형 전환**: "~일까요?", "~해보신 적 있으신가요?"
   - 청자의 주의를 환기하고 TTS가 올라가는 억양을 생성
2. **감탄/강조 어미**: "~입니다!", "무려 ~", "바로 ~"
   - TTS가 에너지를 실을 수 있는 발판
3. **말줄임표 (...)**: "그런데... 반대로 생각해보면"
   - 자연스러운 pause 생성, 극적 긴장감
4. **짧은 문장 + 긴 문장 교차**: 리듬감
   - "핵심은 간단합니다. 복잡하게 생각할 필요 없어요."
5. **2인칭 청자 호출**: "여러분", "한번 생각해보세요"
   - 대화체 느낌, TTS의 자연스러운 톤 유도
6. **대조/반전 구문**: "~라고 생각하시죠? 하지만 실제로는..."
   - 감정 전환점 생성

### 금지 사항

- 논문체/보고서체 평서문 나열 ("~이다", "~것이다" 연속)
- 모든 문장을 같은 어미로 끝내기 ("~합니다" 5회 연속)
- 감정 없는 사실 나열 ("A는 B이고, C는 D이며, E는 F입니다")
- 한 beat에 4문장 이상 (TTS가 감정을 유지하기 어려움)

### 씬 타입별 문체 톤

| 씬 타입         | 문체 톤                      | 예시                                                      |
| --------------- | ---------------------------- | --------------------------------------------------------- |
| hook            | 도발적 질문, 직접 호칭, 반전 | "목표를 세우지 마세요. 이게 무슨 말일까요?"               |
| keyInsight      | 놀라움 → 설명 → 의미 부여    | "무려 37배입니다! 어떻게 가능할까요?"                     |
| framework       | 명확한 구조화, 번호 강조     | "첫째, 분명하게 만들어라. 핵심은 이겁니다."               |
| quote           | 도입 → 인용 → 여운           | "그는 이렇게 말했습니다... '변화는 정체성에서 시작된다.'" |
| application     | 격려, 구체적 상황 묘사       | "지금 당장 해볼 수 있는 게 있습니다."                     |
| compareContrast | 대비 강조, 반전              | "A 그룹은 성공했습니다. 그런데 B 그룹은? 완전히 달랐죠."  |
| closing         | 따뜻한 정리, 행동 촉구       | "오늘 딱 하나만 기억하세요."                              |
```

#### 적용 지점

- `.claude/rules/content-authoring-rules.md`에 위 섹션 추가
- content-composer 스킬이 이 규칙을 참조하여 narration 작성

### 레이어 2 — Beat별 감정 태그 (보조)

content-composer가 narration 문체를 작성하면서, 문체와 일치하는 감정 태그를 beat별로 함께 작성한다.

#### Beat 인터페이스 변경

```typescript
// src/types/index.ts — Beat 인터페이스에 추가
export interface Beat {
  // ... 기존 필드 유지
  emotionTag?: string; // Fish Audio S2 [bracket] 태그. 예: "[호기심 어린 톤으로]"
}
```

#### 태그 작성 규칙

content-authoring-rules.md에 추가:

````markdown
## Beat 감정 태그 (emotionTag) 규칙

Fish Audio S2의 [bracket] 문법으로 beat별 감정을 지정한다.
태그는 보조 수단이며, narration 문체가 감정의 본체다.

### 작성 원칙

1. **문체와 일치할 때만 태그를 붙인다**
   - 질문형 문장 → [호기심 어린 톤으로] ✅
   - 평서문 → [호기심 어린 톤으로] ❌ (불일치)

2. **모든 beat에 태그를 넣지 않아도 된다**
   - 태그 없음은 허용. 문체만으로 충분한 beat는 emotionTag를 생략.
   - 감정 전환이 필요한 포인트에만 전략적으로 배치.

3. **한국어 자연어 + paralinguistic 태그 혼용 가능**
   - 감정 톤: [호기심 어린 톤으로], [따뜻하고 격려하는 톤으로]
   - Paralinguistic: [pause], [emphasis], [whisper], [sigh]
   - S2는 둘 다 같은 메커니즘으로 처리

4. **한 beat에 태그 1개만**
   - 여러 감정을 섞지 않는다 (Fish Audio 공식: "Don't mix conflicting emotions")

### 태그 예시 (씬 타입별)

**keyInsight 씬:**

```json
{
  "beats": [
    {
      "role": "headline",
      "emotionTag": "[호기심 어린 톤으로]",
      "narrationText": "매일 1%씩만 나아져 보세요. 1년 뒤? 무려 37배입니다!"
    },
    {
      "role": "support",
      "emotionTag": null,
      "narrationText": "처음에는 차이가 느껴지지 않습니다. 하지만 복리처럼 쌓이기 시작하면..."
    },
    {
      "role": "evidence",
      "emotionTag": "[경고하는 톤으로]",
      "narrationText": "반대로 1%씩 미끄러지면? 거의 0에 가까워집니다."
    },
    {
      "role": "conclusion",
      "emotionTag": "[emphasis]",
      "narrationText": "이것이 바로 습관의 복리 효과입니다."
    }
  ]
}
```
````

**quote 씬:**

```json
{
  "beats": [
    {
      "role": "headline",
      "emotionTag": null,
      "narrationText": "제임스 클리어는 이런 말을 남겼습니다."
    },
    {
      "role": "support",
      "emotionTag": "[부드럽고 감성적인 톤으로]",
      "narrationText": "'변화의 목표는 책 한 권을 읽는 것이 아니라... 독서가가 되는 것이다.'"
    },
    {
      "role": "conclusion",
      "emotionTag": "[pause]",
      "narrationText": "행동이 아니라 정체성을 바꾸라는 겁니다."
    }
  ]
}
```

````

---

## 4. 코드 변경 상세

### 4-1. Beat 타입 변경

**파일:** `src/types/index.ts`

```typescript
export interface Beat {
  id: string;
  role: BeatRole;
  startRatio: number;
  endRatio: number;
  narrationText?: string;
  activates: string[];
  deactivates?: string[];
  emphasisTargets?: string[];
  motionPreset?: MotionPresetKey;
  transition?: "enter" | "replace" | "emphasis";
  emotionTag?: string;  // 추가: Fish Audio S2 [bracket] 감정 태그
}
````

### 4-2. content-schema.json 변경

**파일:** `src/schema/content-schema.json`

beat 정의에 `emotionTag` 필드 추가:

```json
{
  "emotionTag": {
    "type": "string",
    "description": "Fish Audio S2 emotion tag in [bracket] syntax"
  }
}
```

**주의:** content-schema.json은 읽기 전용 정책이지만, 이 변경은 Beat 시스템 설계 스펙
(`BEAT_SYSTEM_DESIGN_SPEC_v0.2.md` section 4)에 따른 스키마 확장이므로 허용된다.

### 4-3. beatNarrationResolver.ts 변경

**파일:** `src/tts/beatNarrationResolver.ts`

기존 `resolveBeatNarration()`은 beat의 narrationText만 합산한다.
새로운 함수 `resolveBeatNarrationWithEmotions()`를 추가하여 emotionTag를 포함한 텍스트를 생성한다.

```typescript
/**
 * Beat별 narrationText를 emotionTag와 함께 합산한다.
 * emotionTag가 있는 beat: "[태그] 나레이션텍스트"
 * emotionTag가 없는 beat: "나레이션텍스트" (태그 없이)
 *
 * Fish Audio S2는 [bracket] 태그를 문장 앞에서 해석한다.
 */
export function resolveBeatNarrationWithEmotions(
  scene: SceneWithBeats,
): string | undefined {
  if (!scene.beats || scene.beats.length === 0) {
    return scene.narrationText;
  }

  const narratedBeats = scene.beats.filter(
    (b) => b.narrationText && b.narrationText.trim().length > 0,
  );

  if (narratedBeats.length === 0) return undefined;

  return narratedBeats
    .map((b) => {
      const text = b.narrationText!.trim();
      if (b.emotionTag && b.emotionTag.trim()) {
        return `${b.emotionTag.trim()} ${text}`;
      }
      return text;
    })
    .join(" ");
}
```

기존 `resolveBeatNarration()`은 그대로 유지한다 (caption 생성 등 태그 없는 원본 텍스트가 필요한 곳에서 사용).

### 4-4. fish-audio-engine.ts 변경

**파일:** `src/tts/fish-audio-engine.ts`

`addEmotionTag()` 함수의 역할 변경:

```typescript
/**
 * 감정 태그를 narration 텍스트에 적용한다.
 *
 * beat별 emotionTag가 이미 포함된 텍스트(resolveBeatNarrationWithEmotions 결과)는
 * 그대로 반환한다 (이미 태그가 삽입되어 있으므로).
 *
 * beat가 없는 씬의 경우, scene-type 기반 태그를 텍스트 맨 앞에 1개만 붙인다.
 * (기존 동작 유지 — beats 없는 씬은 문체에 주로 의존)
 */
export function addEmotionTag(
  narrationText: string,
  sceneType: string,
  options?: { hasBeatsWithEmotions?: boolean; emotionOverride?: string },
): string {
  // beat별 emotionTag가 이미 삽입된 텍스트는 그대로 반환
  if (options?.hasBeatsWithEmotions) {
    return narrationText;
  }

  // beats 없는 씬: scene-type 태그를 맨 앞에 1개만
  const tag = options?.emotionOverride || SCENE_EMOTION_MAP[sceneType] || "";
  return tag ? `${tag} ${narrationText}` : narrationText;
}
```

### 4-5. generate-captions.ts 변경

**파일:** `scripts/generate-captions.ts`

TTS 생성 시 beat별 emotionTag를 포함한 텍스트를 사용:

```typescript
// 기존
const text = scene.beats?.length
  ? resolveBeatNarration(scene)
  : scene.narrationText;

// 변경: TTS용 텍스트 (emotionTag 포함)
const textForTTS = scene.beats?.length
  ? resolveBeatNarrationWithEmotions(scene)
  : scene.narrationText;

// caption용 텍스트 (emotionTag 미포함 — 자막에 태그가 보이면 안 됨)
const textForCaptions = scene.beats?.length
  ? resolveBeatNarration(scene)
  : scene.narrationText;
```

Fish Audio 호출 시:

```typescript
// 기존: generateViaFishAudio(text, ...) 내부에서 addEmotionTag()
// 변경: beat emotionTag가 있으면 이미 포함된 텍스트 전달
const hasBeatsWithEmotions = scene.beats?.some((b) => b.emotionTag) ?? false;

const fishResult = await generateViaFishAudio(
  textForTTS, // emotionTag 포함된 텍스트
  audioPath,
  fishConfig,
  scene.type,
  book.narration.speed,
  { hasBeatsWithEmotions },
);
```

caption 생성 시에는 `textForCaptions` (태그 없는 원본)을 사용하여
자막에 `[호기심 어린 톤으로]` 같은 태그가 표시되지 않도록 한다.

### 4-6. mediaPlanExecutor.ts 버그 수정

**파일:** `src/tts/mediaPlanExecutor.ts`

sceneType 미전달 버그 수정:

```typescript
// 기존 (sceneType 누락)
const ttsResult = await generateTTSWithCaptions(
  blueprint.id,
  narrationText,
  config,
  outputDir,
);

// 수정 (sceneType 전달)
const sceneType = blueprint.fallbackPreset || blueprint.sceneType || "";
const ttsResult = await generateTTSWithCaptions(
  blueprint.id,
  narrationText,
  config,
  outputDir,
  sceneType,
);
```

---

## 5. 데이터 플로우 (개선 후)

```
Content JSON (content-composer가 오디오북 화법 + emotionTag로 작성)
│
├─ beats 있는 씬:
│   beat[0]: { emotionTag: "[호기심 어린 톤으로]", narrationText: "매일 1%씩만..." }
│   beat[1]: { emotionTag: null,                   narrationText: "처음에는..." }
│   beat[2]: { emotionTag: "[경고하는 톤으로]",     narrationText: "반대로..." }
│       ↓
│   resolveBeatNarrationWithEmotions() — TTS용 (태그 포함)
│   → "[호기심 어린 톤으로] 매일 1%씩만... 처음에는... [경고하는 톤으로] 반대로..."
│
│   resolveBeatNarration() — Caption용 (태그 미포함)
│   → "매일 1%씩만... 처음에는... 반대로..."
│       ↓
│   Fish Audio S2 API (temperature: scene-type 기반)
│       ↓
│   감정이 전환되는 오디오 + 태그 없는 깨끗한 자막
│
├─ beats 없는 씬:
│   narrationText: "이 책의 핵심을 알아봅니다."
│       ↓
│   addEmotionTag() — scene-type 기반 태그 1개 (맨 앞)
│   → "[차분하고 자신감 있는 목소리로] 이 책의 핵심을 알아봅니다."
│       ↓
│   Fish Audio S2 API
│       ↓
│   기존과 동일한 동작 (하위 호환)
```

---

## 6. 하위 호환성

| 항목                                | 영향                                                 |
| ----------------------------------- | ---------------------------------------------------- |
| 기존 content JSON (emotionTag 없음) | 동작 변화 없음. emotionTag가 없으면 기존 로직 그대로 |
| 기존 TTS 산출물                     | 재생성 필요 없음. 새로 생성할 때만 적용              |
| beats 없는 씬                       | 기존과 동일 (scene-type 태그 1개)                    |
| content-schema.json                 | emotionTag optional 필드 추가 (기존 JSON 통과)       |
| mediaPlanExecutor 버그 수정         | DSGS 경로에서 감정 태그가 새로 적용됨 (개선)         |

---

## 7. 변경 파일 목록

| 파일                                       | 변경 내용                                 | 유형   |
| ------------------------------------------ | ----------------------------------------- | ------ |
| `.claude/rules/content-authoring-rules.md` | 오디오북 화법 규칙 + emotionTag 규칙 추가 | 규칙   |
| `src/types/index.ts`                       | Beat에 `emotionTag?: string` 추가         | 타입   |
| `src/schema/content-schema.json`           | beat에 emotionTag 필드 허용               | 스키마 |
| `src/tts/beatNarrationResolver.ts`         | `resolveBeatNarrationWithEmotions()` 추가 | 로직   |
| `src/tts/fish-audio-engine.ts`             | `addEmotionTag()` 시그니처 변경           | 로직   |
| `scripts/generate-captions.ts`             | TTS용/Caption용 텍스트 분리               | 로직   |
| `src/tts/mediaPlanExecutor.ts`             | sceneType 전달 버그 수정                  | 버그   |
| `src/tts/ttsClient.ts`                     | `addEmotionTag()` 호출부 options 전달     | 로직   |

---

## 8. 테스트 계획

1. **하위 호환 테스트**: emotionTag 없는 기존 content JSON으로 `generate-captions.ts` 실행 — 기존과 동일한 결과 확인
2. **emotionTag 적용 테스트**: emotionTag가 포함된 테스트 content JSON으로 TTS 생성 — 태그가 오디오에 포함되고, 자막에는 미포함 확인
3. **mediaPlanExecutor 버그 수정 테스트**: DSGS 파이프라인으로 TTS 생성 시 감정 태그 적용 확인
4. **A/B 청취 비교**: 동일 narration을 (a) 현재 방식 vs (b) 오디오북 화법 + beat별 태그로 생성하여 품질 비교
