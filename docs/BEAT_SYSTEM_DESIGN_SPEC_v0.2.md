# Beat System Design Spec
**Editorial Signal — P2 설계 문서**
Version: 0.2.0 (Revised)
Date: 2026-03-25
Status: 설계 검토 대기 — 사람이 content-schema.json 수정 후 구현 착수

---

## Revision Log

| Version | 변경 | 근거 |
|---------|------|------|
| 0.1.0 | 초안 | 코드베이스 분석 기반 |
| 0.2.0 | 5건 수정 + 3건 추가 | 외부 리뷰 피드백 반영 |

**v0.2 핵심 변경:**
1. `emphasisTargets` 필드 추가 — activates와 강조 단어 분리
2. `useBeatTimeline` → element state machine 기반으로 재설계
3. shorts: 단일 beat fallback → compressed beats 전략
4. TTS: 전략 B 제거 → A-lite(scene master audio) 단일 전략
5. SubtitleLayer 예시를 root HUD 원칙에 맞게 분리
6. beat 최소 길이 validation 추가
7. beat role vs visualIntent 미래 확장 기록
8. Opening beat-aware를 Phase 2A로 추가

---

## 0. 이 문서의 위치

```
의존:    DSGS_CANONICAL_SPEC_v1.md (상위 시스템 설계)
         REVISED_CANONICAL_SPEC.md (현재 구현 기준)
         src/types/index.ts (타입 소스 오브 트루스)

수정 대상: content-schema.json, types/index.ts, validate.ts
영향 범위: 모든 씬 컴포넌트, choreography 시스템, buildProps.ts, planScenes.ts
```

---

## 1. 문제 정의

### 1-1. 현재 상태

씬은 **시간 축이 없는 단일 덩어리**다. KeyInsightScene의 현재 코드를 보면:

```tsx
// src/scenes/KeyInsightScene.tsx — 현재
<ArchitecturalReveal preset="heavy" delay={0}>   // SignalBar
<ArchitecturalReveal preset="heavy" delay={3}>   // Headline
<ArchitecturalReveal preset="heavy" delay={12}>  // SupportText
```

`delay`는 프레임 오프셋을 하드코딩한 것이다. 씬이 5초든 42초든, headline은 항상 3프레임 뒤에 나타난다.

`narrationText`도 씬 전체에 대한 단일 문자열이다:

```json
{
  "narrationText": "할 엘로드는 스무 살에 정면충돌 교통사고를 당했습니다. 6분간 심장이 멈췄고..."
}
```

이 긴 나레이션 중 "어느 구간에서 headline이 보이고, 어느 구간에서 supportText가 등장하는가"를 제어할 방법이 없다.

### 1-2. 구체적 문제 4가지

**P1 — 나레이션 ↔ 시각 동기화 불가**
34초짜리 KeyInsight 씬에서 headline은 0.1초에 나타나지만, 나레이션이 headline 내용을 말하는 건 12~18초 구간이다. 시청자는 이미 읽은 텍스트를 나레이션이 뒤늦게 따라오는 경험을 한다.

**P2 — 정보 계층 표현 불가**
"주장 → 근거 → 데이터"처럼 시간에 따라 정보가 심화되는 구조를 만들 수 없다. 모든 요소가 씬 시작 직후 거의 동시에 등장한다.

**P3 — 씬 duration과 무관한 고정 delay**
`delay={12}`는 씬이 5초(150f)일 때 0.4초 지연이지만, 씬이 40초(1200f)일 때도 똑같이 0.4초다. duration에 비례하는 타이밍이 아니다.

**P4 — 두 렌더 경로의 타이밍 모델 분리**
프리셋 씬(ArchitecturalReveal `delay`)과 VCL 씬(ChoreographyTiming `delayFrames + durationFrames`)이 서로 다른 타이밍 모델을 사용한다. Beat가 이 두 경로를 통합하는 공통 시간 모델이 된다.

### 1-3. Beat가 해결하는 것

Beat = **씬 내부의 시간 구간**. 각 구간이 "어떤 시각 요소가 활성화되고, 어떤 나레이션이 재생되는가"를 선언적으로 정의한다.

```
씬 (34초)
├── Beat 1: "hook"       0~8초    headline 등장 + 나레이션 앞부분
├── Beat 2: "support"    8~20초   supportText 등장 + 나레이션 중간
└── Beat 3: "evidence"   20~34초  evidenceCard 등장 + 나레이션 뒷부분
```

---

## 2. 핵심 설계 원칙

### 원칙 1 — Beat는 데이터다 (코드가 아니다)

Beat 정의는 content JSON에 들어간다. 씬 컴포넌트 코드에 하드코딩하지 않는다.
같은 KeyInsightScene 컴포넌트가 Beat 없는 JSON과 Beat 있는 JSON을 모두 렌더할 수 있어야 한다.

### 원칙 2 — 비율 기반 (절대 프레임 아님)

Beat의 시간 범위는 씬 duration에 대한 비율(`startRatio` / `endRatio`)로 정의한다. 씬이 5초든 40초든 비율에 맞게 스케일된다.
TTS 기반 자동 계산이 비율을 오버라이드할 수 있다 (§5 참조).

### 원칙 3 — 하위 호환 필수

`beats` 필드가 없는 기존 씬은 **암묵적 단일 Beat** (`ratio 0~1`)로 처리된다. 기존 content JSON 파일은 수정 없이 작동한다.

### 원칙 4 — 두 렌더 경로 통합

프리셋 씬 → `ArchitecturalReveal`이 Beat 기반 delay를 계산.
VCL 씬 → `ChoreographyTiming`이 Beat 경계를 존중하여 타이밍을 계획.

### 원칙 5 — 오디오는 항상 Scene master 1트랙 (v0.2 추가)

Beat는 **화면 분할 단위**이지, 오디오 분할 단위가 아니다. TTS는 씬 전체에 대해 1개 오디오 파일을 생성하고, beat 경계는 VTT 타임스탬프에서 역산한다. Beat별 개별 오디오 생성은 하지 않는다.

### 원칙 6 — 요소는 마운트 유지, 상태만 전이 (v0.2 추가)

Beat 전환 시 React 컴포넌트를 unmount/remount하지 않는다. 요소는 씬 전체에 걸쳐 마운트 상태를 유지하고, Beat에 따라 **animation state만 전이**한다. 이로써 이중 지연, 깜빡임, 재등장 문제를 방지한다.

---

## 3. Beat 타입 정의

### 3-1. TypeScript 타입 (types/index.ts 추가분)

```typescript
// ============================================================
// Beat System Types — P2 Extension
// ============================================================

/**
 * Beat = 씬 내부의 시간 구간.
 * 각 beat는 시각 요소의 활성화 시점과 나레이션 구간을 정의한다.
 *
 * 설계 규칙:
 * - beats 배열은 startRatio 오름차순 정렬이어야 한다
 * - beats는 겹칠 수 없다 (gap은 허용 — gap에서는 마지막 상태 hold)
 * - 모든 beat의 합이 반드시 0~1 전체를 커버할 필요는 없다
 */
export interface Beat {
  /** beat 고유 ID. 씬 내에서 유일. */
  id: string;

  /** beat의 역할. 씬 타입별로 의미가 다르다. */
  role: BeatRole;

  /**
   * 씬 duration 대비 시작 비율 (0~1).
   * 실제 프레임 = Math.round(scene.durationFrames * startRatio)
   */
  startRatio: number;

  /**
   * 씬 duration 대비 종료 비율 (0~1).
   * endRatio > startRatio 필수.
   * 최소 beat 길이: endRatio - startRatio >= 0.12
   */
  endRatio: number;

  /**
   * 이 beat 구간에서 재생될 나레이션 텍스트.
   * 설정하면 씬의 narrationText를 beat 단위로 분할한 것.
   * 미설정이면 이 beat 구간에는 나레이션 없음 (시각 전용 beat).
   *
   * 중요: 이 텍스트는 오디오 생성 시 이어붙여져 scene master audio 1개가 된다.
   * beat별 개별 오디오를 생성하지 않는다.
   */
  narrationText?: string;

  /**
   * 이 beat에서 활성화(등장)할 시각 요소 키 목록.
   * 씬 타입별 content 필드 이름을 참조한다.
   *
   * 예: KeyInsight에서 ["headline", "underlineKeyword"]
   * 예: Framework에서 ["items[0]", "items[1]"]
   *
   * 빈 배열이면 시각 변화 없이 나레이션만 진행.
   */
  activates: string[];

  /**
   * 이 beat에서 비활성화(퇴장)할 요소 키 목록. (optional)
   * 설정하면 이전 beat에서 등장한 요소를 명시적으로 퇴장시킨다.
   * 미설정이면 이전 beat의 요소는 계속 보인다 (누적 모드).
   */
  deactivates?: string[];

  /**
   * v0.2 추가: 이 beat에서 강조할 단어/구 목록.
   * activates와 별개. activates는 UI 요소 키, emphasisTargets는 실제 텍스트.
   *
   * 용도:
   * - 자막 하이라이트 키워드
   * - headline 내 특정 단어 pulse 강조
   * - beat-level 키워드 시각 효과
   *
   * 예: ["고요함", "10분", "토대"]
   */
  emphasisTargets?: string[];

  /**
   * beat 진입 시 사용할 모션 프리셋 오버라이드.
   * 미설정이면 씬의 motionPresetOverride 또는 기본값 사용.
   */
  motionPreset?: MotionPresetKey;

  /**
   * beat-level 모션 스타일. 기본: "enter" (등장).
   * "replace"는 이전 요소를 교체하며 등장.
   * "emphasis"는 이미 보이는 요소에 강조 효과만 추가.
   */
  transition?: "enter" | "replace" | "emphasis";

  // --- 미래 확장 (v0.2에서 문서화만, 구현은 v1.0+) ---
  // visualIntent?: string;  // role과 별도로, 렌더 힌트 (예: "stat-card", "pulse-ring")
  // §13 Q-future 참조
}

/**
 * Beat role — 씬 타입에 독립적인 의미론적 역할.
 * 씬 컴포넌트가 role을 기준으로 렌더 로직을 분기할 수 있다.
 */
export type BeatRole =
  | "hook"        // 시선을 끄는 첫 요소
  | "headline"    // 핵심 주장
  | "support"     // 보조 설명
  | "evidence"    // 근거/데이터
  | "reveal"      // 순차 공개 (framework items, list items)
  | "compare"     // 비교 대상 등장
  | "transition"  // 다음 씬으로의 전환 준비
  | "recap"       // 요약/마무리
  | (string & {}); // 확장 가능
```

### 3-2. SceneBase 수정

```typescript
// 기존 SceneBase에 beats 필드 추가
export interface SceneBase {
  id: string;
  type: SceneType;
  layoutArchetypeOverride?: LayoutArchetype;
  durationFrames?: number;
  motionPresetOverride?: MotionPresetKey;
  narrationText?: string;
  assets?: SceneAssetRefs;
  shorts?: ShortsSceneConfig;

  // ← P2 추가
  beats?: Beat[];
}
```

### 3-3. ShortsSceneConfig 확장 (v0.2 추가)

```typescript
export interface ShortsSceneConfig {
  skipForShorts?: boolean;
  durationFramesOverride?: number;

  // ← P2 추가: shorts 전용 beat 오버라이드
  beats?: Beat[];
}
```

shorts beat 해결 순서:
1. `shorts.beats`가 있으면 → 사용
2. 없으면 → longform `beats`를 자동 압축 (compressBeatsForShorts)
3. longform beats도 없으면 → 암묵적 단일 beat

### 3-4. 하위 호환 — 암묵적 단일 Beat

`beats`가 없거나 빈 배열이면, 런타임에서 **암묵적 Beat 1개**를 생성:

```typescript
function resolveBeats(scene: SceneBase, format: FormatKey): Beat[] {
  // shorts인 경우 shorts.beats 우선
  if (format === "shorts" && scene.shorts?.beats && scene.shorts.beats.length > 0) {
    return scene.shorts.beats;
  }

  // longform beats
  if (scene.beats && scene.beats.length > 0) {
    // shorts인데 shorts.beats가 없으면 → 자동 압축
    if (format === "shorts") {
      return compressBeatsForShorts(scene.beats);
    }
    return scene.beats;
  }

  // 암묵적 단일 beat: 씬 전체가 하나의 beat
  return [{
    id: `${scene.id}-implicit`,
    role: "headline",
    startRatio: 0,
    endRatio: 1,
    narrationText: scene.narrationText,
    activates: ["*"],  // 모든 요소 동시 활성화 (기존 동작 유지)
    transition: "enter",
  }];
}

/**
 * longform beats → shorts 자동 압축.
 * 규칙:
 * - 3 beats 이하: 비율만 재조정하여 그대로 유지
 * - 4+ beats: "headline" + "evidence/recap" 2개로 합침
 * - 최대 3 beats
 */
function compressBeatsForShorts(longformBeats: Beat[]): Beat[] {
  if (longformBeats.length <= 3) {
    // 비율만 균등 재배분
    const count = longformBeats.length;
    return longformBeats.map((beat, i) => ({
      ...beat,
      id: `${beat.id}-shorts`,
      startRatio: i / count,
      endRatio: (i + 1) / count,
    }));
  }

  // 4+ beats: headline + 나머지 합침 + 마지막 유지 → 최대 3개
  const headlineBeat = longformBeats.find(b => b.role === "headline") ?? longformBeats[0];
  const lastBeat = longformBeats[longformBeats.length - 1];
  const midBeats = longformBeats.filter(b => b !== headlineBeat && b !== lastBeat);

  const result: Beat[] = [
    { ...headlineBeat, id: `${headlineBeat.id}-shorts`, startRatio: 0, endRatio: 0.4 },
  ];

  if (midBeats.length > 0) {
    // 중간 beats를 하나로 합침
    result.push({
      id: `${midBeats[0].id}-shorts-merged`,
      role: "support",
      startRatio: 0.4,
      endRatio: 0.7,
      narrationText: midBeats.map(b => b.narrationText).filter(Boolean).join(" "),
      activates: midBeats.flatMap(b => b.activates),
      transition: "enter",
    });
  }

  result.push({
    ...lastBeat, id: `${lastBeat.id}-shorts`,
    startRatio: result.length === 2 ? 0.7 : 0.4,
    endRatio: 1,
  });

  return result;
}
```

---

## 4. content-schema.json 변경안

### 4-1. Beat 스키마 정의

```json
{
  "BeatDefinition": {
    "type": "object",
    "required": ["id", "role", "startRatio", "endRatio", "activates"],
    "properties": {
      "id": {
        "type": "string",
        "description": "beat 고유 ID. 씬 내 유일."
      },
      "role": {
        "type": "string",
        "enum": ["hook", "headline", "support", "evidence",
                 "reveal", "compare", "transition", "recap"],
        "description": "의미론적 역할"
      },
      "startRatio": {
        "type": "number", "minimum": 0, "maximum": 1
      },
      "endRatio": {
        "type": "number", "minimum": 0, "maximum": 1
      },
      "narrationText": { "type": "string" },
      "activates": {
        "type": "array",
        "items": { "type": "string" }
      },
      "deactivates": {
        "type": "array",
        "items": { "type": "string" }
      },
      "emphasisTargets": {
        "type": "array",
        "items": { "type": "string" },
        "description": "강조할 단어/구. activates와 별개 네임스페이스."
      },
      "motionPreset": {
        "type": "string",
        "enum": ["gentle", "smooth", "snappy", "heavy", "dramatic"]
      },
      "transition": {
        "type": "string",
        "enum": ["enter", "replace", "emphasis"],
        "default": "enter"
      }
    }
  }
}
```

### 4-2. narrationText 처리 규칙

```
beats가 없을 때:
  scene.narrationText → 씬 전체에 적용 (기존 동작)

beats가 있을 때:
  scene.narrationText → fallback으로만 사용 (beats 없는 뷰어/도구용)
  beat[n].narrationText → 이어붙여서 scene master audio 1개 생성
  개별 beat 오디오는 생성하지 않음
```

---

## 5. Beat ↔ TTS/자막 동기화

### 5-1. A-lite 전략 (단일 전략 — v0.2 확정)

**Scene master audio 1트랙. Beat별 오디오 생성 없음.**

현재 TTS 파이프라인(`ttsClient.ts`)이 이미 씬 단위로 1개 오디오 + word-level VTT를 생성하고, `subtitleGen.ts`의 `generateSentenceSubtitles`가 VTT에서 문장 경계를 역산한다. A-lite는 이 기존 파이프라인의 자연스러운 확장이다.

```
A-lite 흐름:

1. 모든 beat.narrationText를 순서대로 이어붙임
   → "첫 번째, Silence. 고요함입니다. 대부분의 사람들은..."

2. 전체 텍스트로 generateTTSWithCaptions() 1회 호출
   → scene master audio 1개 + word-level VTT 1개

3. VTT의 sentence-level 타임스탬프에서 beat 경계를 역산
   → BeatTimingResolution[] 생성

4. beat의 startRatio/endRatio를 실제 TTS 타이밍으로 업데이트 (optional)
```

```typescript
interface BeatTimingResolution {
  beatId: string;
  /** TTS 오디오 기반으로 계산된 실제 시작 프레임 */
  resolvedStartFrame: number;
  /** TTS 오디오 기반으로 계산된 실제 종료 프레임 */
  resolvedEndFrame: number;
  /** 원래 content JSON의 비율 (fallback용) */
  originalStartRatio: number;
  originalEndRatio: number;
}

/**
 * 기존 generateSentenceSubtitles()의 문장-VTT 매칭 로직을 재활용하여
 * beat 경계를 실제 오디오 타이밍에 매핑한다.
 */
function resolveBeatTimings(
  beats: Beat[],
  captions: Caption[],
  sceneDurationFrames: number,
  fps: number,
): BeatTimingResolution[] {
  // beat.narrationText들을 순서대로 sentence 단위로 분할
  // 각 sentence를 VTT captions에 매칭 (기존 subtitleGen.ts 로직 재활용)
  // beat 경계 = 해당 beat의 첫 sentence 시작 ~ 마지막 sentence 끝
  // ...구현은 subtitleGen.ts의 generateSentenceSubtitles 패턴 따름
}
```

### 5-2. 자막 하이라이트 (v0.2 수정)

자막은 beat와 별개로 **Root Composition의 전역 HUD 레이어**에서 처리한다.

Beat는 자막 레이어에 직접 렌더하지 않고, `emphasisTargets`를 통해 **하이라이트 힌트만 전달**한다.

```typescript
// Root Composition 레벨에서 emphasisTargets를 자막 레이어에 전달
function getCurrentEmphasisTargets(
  beats: Beat[],
  currentFrame: number,
  sceneDurationFrames: number,
): string[] {
  const activeBeat = beats.find(b => {
    const start = Math.round(sceneDurationFrames * b.startRatio);
    const end = Math.round(sceneDurationFrames * b.endRatio);
    return currentFrame >= start && currentFrame < end;
  });
  return activeBeat?.emphasisTargets ?? [];
}
```

---

## 6. 씬 컴포넌트 통합 — Element State Machine (v0.2 재설계)

### 6-1. ElementBeatState 타입

요소의 beat 상태를 boolean이 아닌 **state machine**으로 관리한다.

```typescript
/**
 * 요소의 beat 기반 애니메이션 상태.
 * 요소는 항상 마운트 상태를 유지하고, state만 전이한다.
 */
export type ElementVisibility =
  | "hidden"     // 아직 어떤 beat에서도 활성화되지 않음
  | "entering"   // 활성화 beat에 진입한 직후 (모션 재생 중)
  | "visible"    // 모션 완료, 계속 보이는 상태
  | "exiting"    // deactivates에 의해 퇴장 모션 진행 중
  | "emphasized" // 이미 visible인 요소에 강조 효과 적용 중

export interface ElementBeatState {
  visibility: ElementVisibility;
  /** 이 요소가 entering 상태가 된 프레임 */
  entryFrame: number;
  /** exiting이면 퇴장이 시작된 프레임 */
  exitFrame?: number;
  /** 현재 beat의 emphasisTargets에 해당하는 강조가 활성인지 */
  emphasis: boolean;
  /** entering/exiting 모션에 사용할 preset */
  motionPreset: MotionPresetKey;
}
```

### 6-2. useBeatTimeline 훅 (v0.2 재설계)

```typescript
interface BeatTimelineState {
  /** 현재 활성 beat (없으면 null = beat 사이 gap, 마지막 상태 hold) */
  activeBeat: Beat | null;
  /** 요소별 상태 */
  elementStates: Map<string, ElementBeatState>;
  /** 현재 beat의 진행률 0~1 */
  beatProgress: number;
  /** 현재 beat의 emphasisTargets */
  currentEmphasis: string[];
}

function useBeatTimeline(
  beats: Beat[],
  durationFrames: number,
  defaultMotionPreset: MotionPresetKey = "heavy",
): BeatTimelineState {
  const frame = useCurrentFrame();

  // 1. 현재 프레임이 어느 beat에 속하는지 찾기
  const activeBeat = beats.find(b => {
    const start = Math.round(durationFrames * b.startRatio);
    const end = Math.round(durationFrames * b.endRatio);
    return frame >= start && frame < end;
  }) ?? null;

  // 2. 요소별 상태 계산
  const elementStates = new Map<string, ElementBeatState>();
  const activatedElements = new Set<string>();
  const deactivatedElements = new Set<string>();

  // 모션 프리셋별 entering duration (프레임)
  const ENTERING_DURATION: Record<MotionPresetKey, number> = {
    gentle: 45, smooth: 30, snappy: 18, heavy: 36, dramatic: 54,
  };

  for (const beat of beats) {
    const beatStart = Math.round(durationFrames * beat.startRatio);
    const beatEnd = Math.round(durationFrames * beat.endRatio);
    const preset = beat.motionPreset ?? defaultMotionPreset;
    const enteringDur = ENTERING_DURATION[preset];

    if (frame >= beatStart) {
      // activates 처리
      for (const key of beat.activates) {
        if (key === "*") {
          // 모든 요소 활성화 — 암묵적 beat 호환
          continue; // "*"는 컴포넌트 레벨에서 별도 처리
        }

        if (!activatedElements.has(key) || deactivatedElements.has(key)) {
          // 새로 활성화되는 요소
          activatedElements.add(key);
          deactivatedElements.delete(key);

          const isEntering = frame < beatStart + enteringDur;

          elementStates.set(key, {
            visibility: isEntering ? "entering" : "visible",
            entryFrame: beatStart,
            emphasis: false,
            motionPreset: preset,
          });
        }
      }

      // deactivates 처리
      if (beat.deactivates && frame >= beatStart) {
        for (const key of beat.deactivates) {
          deactivatedElements.add(key);
          const existing = elementStates.get(key);
          if (existing && existing.visibility !== "hidden") {
            elementStates.set(key, {
              ...existing,
              visibility: "exiting",
              exitFrame: beatStart,
            });
          }
        }
      }
    }
  }

  // 3. emphasis 적용
  const currentEmphasis = activeBeat?.emphasisTargets ?? [];
  // emphasis는 자막/외부 레이어에서 사용. 요소 상태에도 반영.
  if (activeBeat?.transition === "emphasis") {
    for (const key of activeBeat.activates) {
      const state = elementStates.get(key);
      if (state && state.visibility === "visible") {
        elementStates.set(key, { ...state, visibility: "emphasized", emphasis: true });
      }
    }
  }

  // 4. beat 진행률
  let beatProgress = 0;
  if (activeBeat) {
    const start = Math.round(durationFrames * activeBeat.startRatio);
    const end = Math.round(durationFrames * activeBeat.endRatio);
    beatProgress = Math.min(1, (frame - start) / Math.max(1, end - start));
  }

  return { activeBeat, elementStates, beatProgress, currentEmphasis };
}
```

### 6-3. ArchitecturalReveal Beat-Aware 래퍼

기존 `ArchitecturalReveal`을 직접 수정하지 않고, beat state를 받아 처리하는 래퍼를 만든다.

```typescript
/**
 * BeatElement — 요소를 항상 마운트하고, beat state에 따라 시각 상태만 전이.
 * ArchitecturalReveal을 내부적으로 사용하되, visibility state에 따라 제어.
 */
const BeatElement: React.FC<{
  elementKey: string;
  beatState: ElementBeatState | undefined;
  format: FormatKey;
  theme: Theme;
  children: React.ReactNode;
}> = ({ elementKey, beatState, format, theme, children }) => {
  if (!beatState || beatState.visibility === "hidden") {
    // 마운트는 유지하되 렌더하지 않음 (opacity: 0, pointer-events: none)
    return (
      <div style={{ opacity: 0, pointerEvents: "none" }}>
        {children}
      </div>
    );
  }

  if (beatState.visibility === "entering") {
    return (
      <ArchitecturalReveal
        format={format}
        theme={theme}
        preset={beatState.motionPreset}
        delay={0}  // delay=0: beat 시작 프레임이 이미 entryFrame
      >
        {children}
      </ArchitecturalReveal>
    );
  }

  if (beatState.visibility === "exiting") {
    // TODO: exit animation (v1.0)
    return (
      <div style={{ opacity: 0.3, transition: "opacity 0.3s" }}>
        {children}
      </div>
    );
  }

  if (beatState.visibility === "emphasized") {
    return (
      <div style={{ transform: "scale(1.02)", transition: "transform 0.2s" }}>
        {children}
      </div>
    );
  }

  // "visible" — 정상 표시
  return <>{children}</>;
};
```

### 6-4. KeyInsightScene Beat 적용 예 (v0.2 수정 — SubtitleLayer 제거)

```tsx
export const KeyInsightScene: React.FC<KeyInsightSceneProps> = ({
  format, theme, from, durationFrames, content, beats,
}) => {
  const resolvedBeats = resolveBeats(
    { id: "scene", type: "keyInsight", beats, narrationText: "" },
    format
  );
  const { elementStates } = useBeatTimeline(resolvedBeats, durationFrames);

  const isWildcard = resolvedBeats.length === 1
    && resolvedBeats[0].activates.includes("*");

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      {/* Background + Texture layers (항상 보임) */}
      <AbsoluteFill style={{ zIndex: 0, backgroundColor: theme.bg }} />
      <AbsoluteFill style={{ zIndex: 5, backgroundColor: theme.surfaceMuted, opacity: 0.04 }} />

      <SafeArea format={format} theme={theme}>
        {/* Signal Bar */}
        {content.useSignalBar !== false && (
          <BeatElement
            elementKey="signalBar"
            beatState={isWildcard ? ALWAYS_VISIBLE : elementStates.get("signalBar")}
            format={format} theme={theme}
          >
            <SignalBar format={format} theme={theme} />
          </BeatElement>
        )}

        {/* Headline */}
        <BeatElement
          elementKey="headline"
          beatState={isWildcard ? ALWAYS_VISIBLE : elementStates.get("headline")}
          format={format} theme={theme}
        >
          <HeadlineWithEmphasis
            text={content.headline}
            keyword={content.underlineKeyword}
            theme={theme} format={format}
          />
        </BeatElement>

        {/* Support Text */}
        {format !== "shorts" && content.supportText && (
          <BeatElement
            elementKey="supportText"
            beatState={isWildcard ? ALWAYS_VISIBLE : elementStates.get("supportText")}
            format={format} theme={theme}
          >
            <TextBlock text={content.supportText} variant="bodyL" color={theme.textMuted} ... />
          </BeatElement>
        )}

        {/* Evidence Card (P2 신규) */}
        {content.evidenceCard && (
          <BeatElement
            elementKey="evidenceCard"
            beatState={elementStates.get("evidenceCard")}
            format={format} theme={theme}
          >
            <EvidenceCard data={content.evidenceCard} theme={theme} format={format} />
          </BeatElement>
        )}
      </SafeArea>

      {/* 주의: SubtitleLayer는 여기에 넣지 않는다.
          자막은 LongformComposition의 전역 HUD 레이어에서 처리.
          Beat의 emphasisTargets는 composition 레벨에서 자막에 전달된다. */}
    </AbsoluteFill>
  );
};

// 암묵적 단일 beat일 때 사용하는 상수
const ALWAYS_VISIBLE: ElementBeatState = {
  visibility: "visible",
  entryFrame: 0,
  emphasis: false,
  motionPreset: "heavy",
};
```

---

## 7. 씬 컴포넌트 통합 — VCL 경로

### 7-1. SceneBlueprint에 beats 추가

```typescript
export interface SceneBlueprint {
  // ... 기존 필드 ...

  /** VCL beat 배열. 없으면 단일 beat로 간주. */
  beats?: BlueprintBeat[];
}

/**
 * BlueprintBeat는 Beat의 VCL 특화 버전.
 * activates가 VCL element ID를 참조한다.
 */
export interface BlueprintBeat extends Beat {
  activates: string[];  // VCLElement.id 참조
}
```

### 7-2. Choreography 함수 시그니처 확장

```typescript
export type ChoreographyFunction = (
  elements: VCLElement[],
  totalDuration: number,
  preset: MotionPresetKey,
  config?: Record<string, unknown>,
  beats?: BlueprintBeat[],       // ← 추가
) => ChoreographyTiming[];
```

beats가 전달되면, choreography 함수는 각 element의 delay를 해당 element가 처음 activates되는 beat의 `startRatio * totalDuration`으로 설정한다. beats가 없으면 기존 로직 유지.

### 7-3. activates 네임스페이스 (확정: 분리 유지)

프리셋 씬: content 필드 이름 ("headline", "supportText", "evidenceCard", "items[0]")
VCL 씬: VCLElement.id ("headline-01", "body-01")

향후 resolver로 추상화 예정:

```typescript
// 미래 확장 (v1.0+)
type BeatTargetRef =
  | { kind: "content"; path: string }   // 프리셋 씬
  | { kind: "element"; id: string };    // VCL 씬

// v0.2에서는 string 유지
```

---

## 8. KeyInsight 3계층 정보 구조

### 8-1. KeyInsightContent 확장

```typescript
export interface KeyInsightContent {
  headline: string;           // 기존 (hard limit: 60자)
  supportText?: string;       // 기존
  underlineKeyword?: string;  // 기존
  useSignalBar?: boolean;     // 기존

  // ← P2 추가: 3계층 근거 카드
  evidenceCard?: EvidenceCard;
}

export interface EvidenceCard {
  type: "statistic" | "quote" | "case" | "research";
  value: string;
  caption?: string;
  source?: string;
}
```

### 8-2. 3계층 content JSON 예시

```json
{
  "id": "insight-silence",
  "type": "keyInsight",
  "durationFrames": 1260,
  "content": {
    "headline": "Silence — 고요함 속에서 하루가 시작된다",
    "supportText": "명상, 기도, 심호흡 등 어떤 형태든 좋습니다.",
    "underlineKeyword": "고요함",
    "useSignalBar": true,
    "evidenceCard": {
      "type": "research",
      "value": "하루 10분 명상 → 코르티솔 23% 감소",
      "caption": "8주간 MBSR 프로그램 참가자 대상",
      "source": "Harvard Medical School, 2018"
    }
  },
  "beats": [
    {
      "id": "silence-b1",
      "role": "headline",
      "startRatio": 0,
      "endRatio": 0.35,
      "narrationText": "첫 번째, Silence. 고요함입니다. 대부분의 사람들은 아침에 눈을 뜨자마자 핸드폰을 봅니다.",
      "activates": ["signalBar", "headline"],
      "emphasisTargets": ["고요함", "Silence"],
      "transition": "enter"
    },
    {
      "id": "silence-b2",
      "role": "support",
      "startRatio": 0.35,
      "endRatio": 0.65,
      "narrationText": "알림, 뉴스, 메시지에 반응하며 하루를 시작하죠. 하지만 미라클 모닝은 다릅니다.",
      "activates": ["supportText"],
      "emphasisTargets": ["반응", "의도적"],
      "transition": "enter"
    },
    {
      "id": "silence-b3",
      "role": "evidence",
      "startRatio": 0.65,
      "endRatio": 1.0,
      "narrationText": "명상이든, 심호흡이든, 고요한 10분으로 하루를 여는 것. 이것이 나머지 5가지 습관의 토대입니다.",
      "activates": ["evidenceCard"],
      "deactivates": ["supportText"],
      "emphasisTargets": ["10분", "코르티솔 23%"],
      "motionPreset": "snappy",
      "transition": "replace"
    }
  ]
}
```

---

## 9. 씬 타입별 Beat 패턴 가이드

### keyInsight (3 beats)

| Beat | Role | Activates | Emphasis | 의미 |
|------|------|-----------|----------|------|
| 1 | headline | signalBar, headline | 핵심 키워드 | 주장 제시 |
| 2 | support | supportText | 보조 키워드 | 설명 |
| 3 | evidence | evidenceCard | 수치/출처 | 근거 |

### framework (N+1 beats)

| Beat | Role | Activates | 의미 |
|------|------|-----------|------|
| 1 | headline | frameworkLabel | 프레임워크 이름 |
| 2~N+1 | reveal | items[i] | 각 항목 순차 공개 |

### compareContrast (3 beats)

| Beat | Role | Activates | 의미 |
|------|------|-----------|------|
| 1 | hook | leftLabel, leftContent | 오해/이전 상태 |
| 2 | compare | rightLabel, rightContent | 저자 주장 |
| 3 | recap | connector | 결론 |

### quote (2 beats)

| Beat | Role | Activates | 의미 |
|------|------|-----------|------|
| 1 | headline | quoteText | 인용문 등장 |
| 2 | support | attribution | 출처 표시 |

---

## 10. Validation 규칙

```typescript
function validateBeats(scene: TypedScene): string[] {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!scene.beats || scene.beats.length === 0) return errors;

  // 1. startRatio 오름차순 정렬 확인
  for (let i = 1; i < scene.beats.length; i++) {
    if (scene.beats[i].startRatio < scene.beats[i - 1].startRatio) {
      errors.push(
        `[${scene.id}] beat "${scene.beats[i].id}" startRatio is before previous beat`
      );
    }
  }

  // 2. endRatio > startRatio
  for (const beat of scene.beats) {
    if (beat.endRatio <= beat.startRatio) {
      errors.push(`[${scene.id}] beat "${beat.id}" endRatio must be > startRatio`);
    }
  }

  // 3. 비율 범위 0~1
  for (const beat of scene.beats) {
    if (beat.startRatio < 0 || beat.endRatio > 1) {
      errors.push(`[${scene.id}] beat "${beat.id}" ratios must be in 0~1 range`);
    }
  }

  // 4. overlap 검사
  for (let i = 1; i < scene.beats.length; i++) {
    if (scene.beats[i].startRatio < scene.beats[i - 1].endRatio) {
      errors.push(
        `[${scene.id}] beats "${scene.beats[i - 1].id}" and "${scene.beats[i].id}" overlap`
      );
    }
  }

  // 5. beat id 중복 검사
  const ids = scene.beats.map(b => b.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length > 0) {
    errors.push(`[${scene.id}] duplicate beat ids: ${dupes.join(", ")}`);
  }

  // === v0.2 추가: 리듬 품질 검증 ===

  // 6. beat 최소 길이: 0.12 미만 금지
  for (const beat of scene.beats) {
    const length = beat.endRatio - beat.startRatio;
    if (length < 0.12) {
      errors.push(
        `[${scene.id}] beat "${beat.id}" length ${length.toFixed(2)} is below minimum 0.12`
      );
    }
  }

  // 7. shorts beat 최소 길이 경고: 0.18 미만
  if (scene.shorts?.beats) {
    for (const beat of scene.shorts.beats) {
      const length = beat.endRatio - beat.startRatio;
      if (length < 0.18) {
        warnings.push(
          `[${scene.id}] shorts beat "${beat.id}" length ${length.toFixed(2)} below recommended 0.18`
        );
      }
    }
  }

  // 8. 8초+ 씬에서 단일 beat 경고
  const durationSec = (scene.durationFrames ?? 150) / 30;
  if (durationSec >= 8 && scene.beats.length === 1) {
    warnings.push(
      `[${scene.id}] scene is ${durationSec.toFixed(0)}s but has only 1 beat. Consider adding more beats.`
    );
  }

  // 9. hook 계열 scene에서 최소 2 beats 경고
  // (Opening scene은 hook+intro로 2 beat 이상이 바람직)

  return errors; // warnings는 별도 채널로 출력
}
```

---

## 11. 마이그레이션 전략

### Phase 1 — 인프라 (사람 + Claude Code)

1. **[사람]** content-schema.json에 BeatDefinition 스키마 추가
2. **[Claude Code]** types/index.ts에 Beat, BeatRole, EvidenceCard, ElementBeatState 타입 추가
3. **[Claude Code]** validate.ts에 validateBeats 함수 추가 (리듬 품질 포함)
4. **[Claude Code]** useBeatTimeline 훅 구현 (src/hooks/useBeatTimeline.ts)
5. **[Claude Code]** resolveBeats + compressBeatsForShorts 유틸 구현 (src/pipeline/resolveBeats.ts)
6. **[Claude Code]** BeatElement 래퍼 컴포넌트 구현 (src/components/motion/BeatElement.tsx)

검증: 기존 content JSON (miracle-morning.json, test-book.json)이 beats 없이 정상 동작 확인.

### Phase 2A — Opening Beat-Aware (Claude Code)

현재 Opening은 keyInsight 또는 동적 생성으로 처리된다. Opening 씬에 beat를 적용하면 "hook → intro → bridge" 흐름이 시간축에서 제어된다. 사용자 체감이 가장 큰 변화.

1. miracle-morning.json의 첫 씬(intro-01)에 2-beat 예시 적용
2. Remotion Studio에서 시각 확인

### Phase 2B — KeyInsight 3계층 (Claude Code)

1. KeyInsightContent에 evidenceCard 필드 추가
2. EvidenceCard 컴포넌트 구현 (src/components/primitives/EvidenceCard.tsx)
3. KeyInsightScene을 BeatElement 기반으로 리팩토링
4. miracle-morning.json의 insight-silence 씬에 3-beat 예시 추가
5. Remotion Studio에서 시각 확인

### Phase 3 — 나머지 씬 확장 (점진적)

FrameworkScene, CompareContrastScene, QuoteScene 순으로 beat-aware 변환.

### Phase 4 — TTS A-lite 파이프라인 통합

1. ttsClient.ts에서 beat.narrationText 합침 → 기존 generateTTSWithCaptions 호출
2. subtitleGen.ts에서 기존 generateSentenceSubtitles 로직을 확장 → BeatTimingResolution 생성
3. durationSync.ts에서 beat 기반 씬 duration 재계산
4. LongformComposition에서 emphasisTargets를 CaptionLayer에 전달

---

## 12. content-schema.json 수정 체크리스트

**사람이 직접 수행해야 할 변경 항목:**

- [ ] `definitions`에 `BeatDefinition` 객체 추가 (§4-1)
- [ ] 각 씬 공통 properties에 `beats` 배열 필드 추가
- [ ] `ShortsSceneConfig`에 `beats` 배열 필드 추가
- [ ] `KeyInsightContent.properties`에 `evidenceCard` 객체 추가
- [ ] `EvidenceCard` 정의 추가 (type, value, caption, source)
- [ ] `_notice`에 "v1.1.0 — Beat system + EvidenceCard 추가" 메모

수정 후 `npm run validate`로 기존 JSON 파일이 여전히 통과하는지 확인.

---

## 13. 열린 질문 (확정 + 미래 확장)

### Q1. beat 간 gap — 확정: hold

Gap 구간에서는 마지막 beat의 상태를 유지한다. breathe/fade 효과는 v1.0에서 스타일 옵션으로 추가.

### Q2. shorts에서 beat — 확정: compressed beats

shorts도 beat를 유지한다. `shorts.beats` 우선, 없으면 longform beats 자동 압축, 그마저 없으면 암묵적 단일 beat.

### Q3. TTS 전략 — 확정: A-lite 단일 전략

Scene master audio 1트랙. 기존 `generateTTSWithCaptions` + VTT sentence 매칭을 확장. Beat별 개별 오디오 생성은 하지 않는다.

### Q4. activates 네임스페이스 — 확정: 분리 유지, 향후 resolver

프리셋 = content key, VCL = element id. v1.0에서 `BeatTargetRef` 타입으로 추상화 예정.

### Q-future. role vs visualIntent 분리

현재 `role`은 의미론적 역할만 담는다. 실제 렌더에서 같은 `role: "evidence"`도 stat-card, quote-card, diagram 등 다양한 시각 표현이 가능하다. v1.0에서 `visualIntent?: string` 필드를 추가하여 role(의미)와 intent(시각 힌트)를 분리할 수 있다. v0.2에서는 role만으로 충분.

---

## 14. 비스코프 확인

- Storybook 도입 — Beat가 정착된 후 별도 설계
- Scene Playground composition — BlueprintRenderer + Beat 안정화 후
- beat 기반 자동 씬 분할 (AI가 narrationText → beats 자동 생성) — v2.0
- beat 기반 감정 곡선 시각화 — DSGS emotionalCurve 연결, v2.0
- beat exit animation 체계 — v1.0 (현재는 opacity fade만)