# TTS 감정 표현 최적화 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fish Audio S2 공식 문서 모범 사례에 맞게 TTS 감정 표현을 최적화한다 — 오디오북 화법 가이드라인 + beat별 emotionTag 지원

**Architecture:** 두 레이어 구조. 레이어 1은 content-authoring-rules에 오디오북 화법 가이드라인을 추가하여 narration 문체 자체의 품질을 올린다. 레이어 2는 Beat 인터페이스에 emotionTag 필드를 추가하고, Fish Audio 경로에서만 태그를 TTS 텍스트에 삽입한다. edge-tts/qwen3 경로에는 태그 미포함 텍스트를 전달하여 태그가 음성으로 읽히는 것을 방지한다.

**Tech Stack:** TypeScript, Fish Audio S2 API, Zod/JSON Schema

**Spec:** `docs/superpowers/specs/2026-03-28-tts-emotion-optimization-design.md`

---

## File Map

| 파일                                                     | 변경 유형      | 역할                                           |
| -------------------------------------------------------- | -------------- | ---------------------------------------------- |
| `.claude/skills/subtitle-audio/tts-engine-comparison.md` | Modify         | Fish Audio S2-Pro 현행화 (선행 작업)           |
| `.claude/rules/content-authoring-rules.md`               | Modify         | 오디오북 화법 규칙 + emotionTag 규칙 추가      |
| `src/types/index.ts`                                     | Modify:795-851 | Beat 인터페이스에 `emotionTag?: string` 추가   |
| `src/schema/content-schema.json`                         | Modify:419-475 | BeatDefinition에 emotionTag 필드 추가          |
| `src/tts/beatNarrationResolver.ts`                       | Modify         | `resolveBeatNarrationWithEmotions()` 함수 추가 |
| `src/tts/fish-audio-engine.ts`                           | Modify:62-69   | `addEmotionTag()` 시그니처에 options 추가      |
| `src/tts/ttsClient.ts`                                   | Modify:398-496 | Fish Audio 경로에서 hasBeatsWithEmotions 전달  |
| `scripts/generate-captions.ts`                           | Modify:298-345 | TTS용/Caption용 텍스트 분리 + 엔진별 분기      |
| `src/tts/mediaPlanExecutor.ts`                           | Modify:47-52   | sceneType 전달 버그 수정                       |
| `src/tts/index.ts`                                       | Modify         | barrel export에 새 함수 추가                   |

---

## Task 0: 선행 — tts-engine-comparison.md 현행화

**Files:**

- Modify: `.claude/skills/subtitle-audio/tts-engine-comparison.md`

- [ ] **Step 1: 문서 업데이트**

`.claude/skills/subtitle-audio/tts-engine-comparison.md`를 아래로 교체:

````markdown
# TTS Engine Comparison

DSGS supports multiple TTS engines via `TTSEngineKey` type.

## Engine Matrix

| Engine         | Cost             | Korean | Quality   | Latency        | Emotion Tags | Notes                                                                             |
| -------------- | ---------------- | ------ | --------- | -------------- | ------------ | --------------------------------------------------------------------------------- |
| **fish-audio** | Paid (API)       | ✅     | Excellent | Medium (~3-5s) | ✅ [bracket] | Fish Audio S2-Pro cloud API. Voice cloning + STT. **기본 엔진 (CLAUDE.md 선언)**. |
| **edge-tts**   | Free             | ✅     | Good      | Fast (~1-3s)   | ❌           | Microsoft Azure Edge, CLI via `pip install edge-tts`. Fallback 전용.              |
| **qwen3-tts**  | Free (self-host) | ✅     | Good      | Varies         | ❌           | Open source, requires GPU for real-time. Voice cloning 지원.                      |

## Recommended Selection

1. **Production (default)**: `fish-audio` — best quality, voice cloning, emotion tags, STT timestamps
2. **Fallback**: `edge-tts` — zero cost, no API key needed
3. **Development/self-host**: `qwen3-tts` — GPU 필요, 무료

## Fish Audio S2-Pro Features

- Cloud API: `https://api.fish.audio`
- 감정 태그: `[bracket]` 문법, 한국어 자연어 지원 (예: `[호기심 어린 톤으로]`)
- Paralinguistic: `[pause]`, `[emphasis]`, `[whisper]`, `[sigh]` 등
- STT: `/v1/asr` 엔드포인트로 segment-level 타임스탬프
- Temperature: 0.0~1.0 (씬 타입별 자동 조절)
- Speed: `prosody.speed` 0.5~2.0

## edge-tts Korean Voices

| Voice ID             | Gender | Style                          |
| -------------------- | ------ | ------------------------------ |
| `ko-KR-SunHiNeural`  | Female | Standard narration, warm tone  |
| `ko-KR-InJoonNeural` | Male   | Standard narration, clear tone |

## edge-tts CLI Usage

```bash
# Install
pip install edge-tts

# Generate audio + VTT subtitles
edge-tts --voice ko-KR-SunHiNeural --text "텍스트" --write-media output.mp3 --write-subtitles output.vtt

# With speed/pitch adjustment
edge-tts --voice ko-KR-SunHiNeural --rate "+10%" --pitch "+2Hz" --text "텍스트" --write-media output.mp3
```
````

## VTT Format Note

edge-tts outputs VTT with comma-separated timestamps (`HH:MM:SS,mmm`) instead of standard WebVTT dot separator (`HH:MM:SS.mmm`). The shared `vttParser.ts` handles this format.

## 주의: 엔진별 감정 태그 호환성

- Fish Audio: `[bracket]` 태그를 자연어로 해석하여 음성에 감정 반영
- edge-tts/qwen3-tts: 태그를 이해하지 못하고 **그대로 텍스트로 읽음**
- 따라서 emotionTag가 포함된 텍스트는 Fish Audio 경로에서만 사용해야 한다

````

- [ ] **Step 2: 커밋**

```bash
git add .claude/skills/subtitle-audio/tts-engine-comparison.md
git commit -m "docs: tts-engine-comparison.md 현행화 — Fish Audio S2-Pro 기본 엔진 반영"
````

---

## Task 1: 오디오북 화법 가이드라인 추가

**Files:**

- Modify: `.claude/rules/content-authoring-rules.md`

- [ ] **Step 1: content-authoring-rules.md 끝에 오디오북 화법 섹션 추가**

`.claude/rules/content-authoring-rules.md` 파일 맨 끝에 아래 내용을 추가한다:

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
- 한 beat에 4문장 이상 비권장 (soft limit — beat 분절 구조에 따라 초과 허용)

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

## Beat 감정 태그 (emotionTag) 규칙

Fish Audio S2의 [bracket] 문법으로 beat별 감정을 지정한다.
태그는 보조 수단이며, narration 문체가 감정의 본체다.
Fish Audio 경로에서만 적용되며, edge-tts/qwen3 경로에서는 무시된다.

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
```

- [ ] **Step 2: 커밋**

```bash
git add .claude/rules/content-authoring-rules.md
git commit -m "docs: 오디오북 화법 가이드라인 + emotionTag 규칙 추가"
```

---

## Task 2: Beat 타입에 emotionTag 필드 추가

**Files:**

- Modify: `src/types/index.ts:795-851`
- Modify: `src/schema/content-schema.json:419-475`

- [ ] **Step 1: Beat 인터페이스에 emotionTag 추가**

`src/types/index.ts`에서 Beat 인터페이스의 `transition` 필드 뒤에 추가:

```typescript
  // 기존 마지막 필드:
  transition?: "enter" | "replace" | "emphasis";

  // 추가:
  /**
   * Fish Audio S2 감정 태그. [bracket] 문법.
   * 예: "[호기심 어린 톤으로]", "[pause]", "[emphasis]"
   * Fish Audio 경로에서만 TTS 텍스트에 삽입된다.
   * edge-tts/qwen3에서는 무시된다.
   */
  emotionTag?: string;
```

- [ ] **Step 2: content-schema.json의 BeatDefinition에 emotionTag 추가**

`src/schema/content-schema.json`에서 BeatDefinition의 `transition` 필드 뒤(line 473 부근 `}` 앞)에 추가:

```json
        "emotionTag": {
          "type": "string",
          "description": "Fish Audio S2 [bracket] 감정 태그. 예: '[호기심 어린 톤으로]', '[pause]'. Fish Audio 경로에서만 사용."
        }
```

- [ ] **Step 3: 타입 체크 확인**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: 에러 없음 (optional 필드 추가이므로 기존 코드 영향 없음)

- [ ] **Step 4: 커밋**

```bash
git add src/types/index.ts src/schema/content-schema.json
git commit -m "feat: Beat에 emotionTag 필드 추가 (Fish Audio S2 감정 태그)"
```

---

## Task 3: resolveBeatNarrationWithEmotions() 함수 추가

**Files:**

- Modify: `src/tts/beatNarrationResolver.ts`
- Modify: `src/tts/index.ts`

- [ ] **Step 1: resolveBeatNarrationWithEmotions() 추가**

`src/tts/beatNarrationResolver.ts` 파일 끝에 새 함수를 추가한다:

```typescript
/**
 * Beat별 narrationText를 emotionTag와 함께 합산한다.
 * Fish Audio 경로 전용 — TTS API에 전달할 텍스트를 생성한다.
 *
 * - emotionTag가 있는 beat: "[태그] 나레이션텍스트"
 * - emotionTag가 없는 beat: "나레이션텍스트" (태그 없이)
 *
 * edge-tts/qwen3 경로에서는 이 함수 대신 resolveBeatNarration()을 사용한다.
 * QA-13A 글자수 검증에도 resolveBeatNarration()을 사용한다 (태그 미포함).
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

  if (narratedBeats.length === 0) {
    return scene.narrationText;
  }

  // Runtime assertion: same order check as resolveBeatNarration
  for (let i = 1; i < narratedBeats.length; i++) {
    if (narratedBeats[i].startRatio < narratedBeats[i - 1].startRatio) {
      console.warn(
        `[beatNarrationResolver] Beat order mismatch: ${narratedBeats[i].id} startRatio < ${narratedBeats[i - 1].id}. Using scene narration fallback.`,
      );
      return scene.narrationText;
    }
  }

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

- [ ] **Step 2: barrel export에 추가**

`src/tts/index.ts`에서 beatNarrationResolver import가 없으므로, 아래를 파일 끝에 추가:

```typescript
export {
  resolveBeatNarration,
  resolveBeatNarrationWithEmotions,
} from "./beatNarrationResolver";
```

- [ ] **Step 3: 타입 체크 확인**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add src/tts/beatNarrationResolver.ts src/tts/index.ts
git commit -m "feat: resolveBeatNarrationWithEmotions() — beat별 emotionTag 포함 텍스트 생성"
```

---

## Task 4: addEmotionTag() 시그니처 변경

**Files:**

- Modify: `src/tts/fish-audio-engine.ts:62-69`

- [ ] **Step 1: addEmotionTag() 함수 변경**

`src/tts/fish-audio-engine.ts`에서 기존 `addEmotionTag` 함수를 교체:

```typescript
/**
 * 감정 태그를 narration 텍스트에 적용한다.
 *
 * beat별 emotionTag가 이미 포함된 텍스트(resolveBeatNarrationWithEmotions 결과)는
 * 그대로 반환한다 (이미 태그가 삽입되어 있으므로).
 *
 * beat가 없는 씬의 경우, scene-type 기반 태그를 텍스트 맨 앞에 1개만 붙인다.
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

- [ ] **Step 2: 타입 체크 — 기존 호출부 호환성 확인**

`addEmotionTag(text, sceneType)` 형태의 기존 호출이 모두 호환되는지 확인 (options는 optional이므로 문제 없어야 함):

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/tts/fish-audio-engine.ts
git commit -m "refactor: addEmotionTag()에 options 파라미터 추가 (하위 호환)"
```

---

## Task 5: ttsClient.ts — Fish Audio 경로에서 hasBeatsWithEmotions 전달

**Files:**

- Modify: `src/tts/ttsClient.ts:398-496`

- [ ] **Step 1: generateTTSViaFishAudio()에 hasBeatsWithEmotions 전달**

`src/tts/ttsClient.ts`에서 `generateTTSViaFishAudio()` 함수 내부의 `addEmotionTag` 호출(line 414)을 수정:

```typescript
// 기존:
const textWithEmotion = addEmotionTag(text, sceneType || "");

// 변경:
const textWithEmotion = addEmotionTag(text, sceneType || "", options);
```

함수 시그니처에도 options 추가:

```typescript
async function generateTTSViaFishAudio(
  sceneId: string,
  text: string,
  outputDir: string,
  sceneType?: string,
  narrationSpeed?: number,
  options?: { hasBeatsWithEmotions?: boolean },
): Promise<TTSResult | undefined> {
```

- [ ] **Step 2: generateTTSWithCaptionsViaFishAudio()에도 동일 적용**

`generateTTSWithCaptionsViaFishAudio()` 함수(line 440)에도 동일하게 options 추가:

```typescript
async function generateTTSWithCaptionsViaFishAudio(
  sceneId: string,
  text: string,
  outputDir: string,
  sceneType?: string,
  narrationSpeed?: number,
  options?: { hasBeatsWithEmotions?: boolean },
): Promise<TTSResultWithCaptions | undefined> {
```

내부의 `addEmotionTag` 호출(line 456)도 수정:

```typescript
// 기존:
const textWithEmotion = addEmotionTag(text, sceneType || "");

// 변경:
const textWithEmotion = addEmotionTag(text, sceneType || "", options);
```

- [ ] **Step 3: public API에 options 전파**

`generateTTS()` (line 524)와 `generateTTSWithCaptions()` (line 572) 함수 시그니처에 options 추가하고, Fish Audio 호출 시 전달:

`generateTTSWithCaptions()`:

```typescript
export async function generateTTSWithCaptions(
  sceneId: string,
  text: string,
  config: NarrationConfig,
  outputDir: string,
  sceneType?: string,
  options?: { hasBeatsWithEmotions?: boolean },
): Promise<TTSResultWithCaptions | undefined> {
```

Fish Audio 호출 부분 (line 590 부근):

```typescript
// 기존:
const result = await generateTTSWithCaptionsViaFishAudio(
  sceneId,
  text,
  outputDir,
  sceneType,
  config.speed,
);

// 변경:
const result = await generateTTSWithCaptionsViaFishAudio(
  sceneId,
  text,
  outputDir,
  sceneType,
  config.speed,
  options,
);
```

`generateTTS()`에도 동일 패턴 적용.

- [ ] **Step 4: 타입 체크**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: 에러 없음 (모든 options 파라미터는 optional)

- [ ] **Step 5: 커밋**

```bash
git add src/tts/ttsClient.ts
git commit -m "feat: ttsClient Fish Audio 경로에 hasBeatsWithEmotions 옵션 전파"
```

---

## Task 6: generate-captions.ts — TTS용/Caption용 텍스트 분리

**Files:**

- Modify: `scripts/generate-captions.ts:19-20,298-405`

- [ ] **Step 1: import 추가**

`scripts/generate-captions.ts` 상단의 import 부분(line 19)에 추가:

```typescript
import { resolveBeatNarration } from "../src/tts/beatNarrationResolver";
// 기존 import 유지, 아래 추가:
import { resolveBeatNarrationWithEmotions } from "../src/tts/beatNarrationResolver";
```

(기존에 `resolveBeatNarration`은 이미 import됨 — line 19)

- [ ] **Step 2: 씬 루프 내 텍스트 분리**

`scripts/generate-captions.ts`의 씬 처리 루프(line 298 부근)를 수정:

```typescript
// 기존:
const text = scene.beats?.length
  ? resolveBeatNarration(scene)
  : scene.narrationText;

// 변경:
// Caption용 텍스트 (태그 미포함 — 자막, QA 글자수 검증)
const textForCaptions = scene.beats?.length
  ? resolveBeatNarration(scene)
  : scene.narrationText;

// TTS용 텍스트 (Fish Audio일 때만 태그 포함)
const hasBeatsWithEmotions =
  engine === "fish-audio" && (scene.beats?.some((b) => b.emotionTag) ?? false);
const textForTTS = hasBeatsWithEmotions
  ? resolveBeatNarrationWithEmotions(scene)
  : textForCaptions;
```

- [ ] **Step 3: text 참조를 textForCaptions/textForTTS로 교체**

나머지 코드에서 `text` 변수 참조를 올바른 변수로 교체:

1. TTS skip 체크 (line 303 부근):

```typescript
// 기존:
if (!text || text.trim().length === 0) {
// 변경:
if (!textForCaptions || textForCaptions.trim().length === 0) {
```

2. 로그 출력 (line 315 부근):

```typescript
// 기존:
console.log(`[TTS] ${scene.id}: "${text.slice(0, 40)}..."`);
// 변경:
console.log(`[TTS] ${scene.id}: "${textForCaptions.slice(0, 40)}..."`);
```

3. Fish Audio 호출 (line 323 부근):

```typescript
// 기존:
const fishResult = await generateViaFishAudio(
  text,
  audioPath,
  fishConfig,
  scene.type,
  book.narration.speed,
);

// 변경:
const fishResult = await generateViaFishAudio(
  textForTTS!,
  audioPath,
  fishConfig,
  scene.type,
  book.narration.speed,
);
```

4. edge-tts / qwen3 호출 — `textForCaptions` 사용:

```typescript
// qwen3 (line 348 부근):
success = await generateViaQwen3(
  textForCaptions,
  audioPath,
  vttPath,
  book.narration.speed ?? 1.0,
);

// edge-tts (line 358 부근):
success = await generateViaEdgeTTS(
  textForCaptions,
  book.narration,
  audioPath,
  vttPath,
);
```

5. Fish Audio STT fallback (line 397 부근):

```typescript
// 기존:
captions = fe.generateCaptionsFromText(text, durationMs);
// 변경:
captions = fe.generateCaptionsFromText(textForCaptions, durationMs);
```

- [ ] **Step 4: generateViaFishAudio에 hasBeatsWithEmotions 전달**

`generateViaFishAudio()` 함수(line 194)의 `addEmotionTag` 호출을 수정:

```typescript
async function generateViaFishAudio(
  text: string,
  audioPath: string,
  config: FishAudioConfig,
  sceneType: string,
  speed?: number,
  options?: { hasBeatsWithEmotions?: boolean },
): Promise<{ success: boolean; durationMs: number }> {
  try {
    const engine = await loadFishEngine();
    if (!engine) return { success: false, durationMs: 0 };
    const configWithParams = {
      ...config,
      temperature: engine.getTemperatureForScene(sceneType),
      speed: speed ?? 1.0,
    };
    const textWithEmotion = engine.addEmotionTag(text, sceneType, options);
    const durationMs = await engine.generateFishAudio(
      textWithEmotion,
      audioPath,
      configWithParams,
    );
    return { success: fs.existsSync(audioPath) && durationMs > 0, durationMs };
  } catch (err) {
    console.error(`[FAIL] fish-audio:`, err);
    return { success: false, durationMs: 0 };
  }
}
```

그리고 호출부도 수정:

```typescript
const fishResult = await generateViaFishAudio(
  textForTTS!,
  audioPath,
  fishConfig,
  scene.type,
  book.narration.speed,
  { hasBeatsWithEmotions },
);
```

- [ ] **Step 5: 타입 체크**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: 에러 없음

- [ ] **Step 6: 커밋**

```bash
git add scripts/generate-captions.ts
git commit -m "feat: generate-captions에 TTS용/Caption용 텍스트 분리 + 엔진별 분기"
```

---

## Task 7: mediaPlanExecutor.ts — sceneType 전달 버그 수정

**Files:**

- Modify: `src/tts/mediaPlanExecutor.ts:30-52`

- [ ] **Step 1: executeMediaPlan에 sceneType 추가**

`src/tts/mediaPlanExecutor.ts`의 `executeMediaPlan()` 함수를 수정한다.

함수 시그니처에 sceneType 추가:

```typescript
export async function executeMediaPlan(
  blueprint: SceneBlueprint,
  outputDir: string,
  fps: number = DEFAULT_FPS,
  sceneType?: string,
): Promise<MediaPlanResult> {
```

generateTTSWithCaptions 호출부(line 47)에 sceneType 전달:

```typescript
// 기존:
const ttsResult = await generateTTSWithCaptions(
  blueprint.id,
  narrationText,
  config,
  outputDir,
);

// 변경:
const ttsResult = await generateTTSWithCaptions(
  blueprint.id,
  narrationText,
  config,
  outputDir,
  sceneType,
);
```

- [ ] **Step 2: 호출부 확인**

executeMediaPlan을 호출하는 곳을 찾아서 sceneType을 전달하도록 확인:

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: 에러 없음 (sceneType은 optional이므로 기존 호출부 영향 없음)

- [ ] **Step 3: 커밋**

```bash
git add src/tts/mediaPlanExecutor.ts
git commit -m "fix: mediaPlanExecutor에서 sceneType을 generateTTSWithCaptions에 전달"
```

---

## Task 8: 하위 호환 검증

**Files:** 없음 (검증만)

- [ ] **Step 1: 전체 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 2: validate 실행**

기존 content JSON이 새 스키마에서도 통과하는지 확인:

```bash
npm run validate -- content/books/atomic-habits.json
```

Expected: 통과 (emotionTag는 optional 필드)

- [ ] **Step 3: 기존 content JSON으로 generate-captions 테스트**

emotionTag가 없는 기존 JSON으로 TTS 생성이 기존과 동일하게 동작하는지 확인:

```bash
TTS_ENGINE=edge-tts npx ts-node scripts/generate-captions.ts content/books/atomic-habits.json 2>&1 | head -30
```

Expected: 기존과 동일한 출력, 에러 없음

- [ ] **Step 4: 커밋 (변경 사항 있을 때만)**

검증 과정에서 수정이 필요한 부분이 있으면 수정 후 커밋.
