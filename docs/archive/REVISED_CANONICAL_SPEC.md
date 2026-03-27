# REVISED_CANONICAL_SPEC.md
**Editorial Signal — 최종 Canonical Specification**  
Version: 2.0.0 | CANONICAL_SPEC.md를 대체함  
이 문서가 모든 충돌의 해결 기준이다. 다른 어떤 문서도 이 문서를 override할 수 없다.

---

## 0. Precedence Chain (전 프로젝트 단 하나)

```
1위  REVISED_CANONICAL_SPEC.md     ← 지금 이 문서. 모든 충돌 해결 기준.
2위  src/types/index.ts             ← TypeScript 타입 단일 소스.
3위  src/schema/scene-catalog.json  ← 씬 기본값 레지스트리.
4위  src/schema/asset-manifest.json ← 에셋 레지스트리.
─────────────────────────────────────
파생  REVISED_CLAUDE_4_3_HANDOFF.md ← 이 spec의 구현 브리프.
파생  CLAUDE.md                      ← 이 spec의 운영 규칙.
참고  architecture.md               ← 개념 설명. 구현 기준 아님.
참고  implementation-plan.md        ← 빌드 순서. 구현 기준 아님.
IDE용 src/schema/content-schema.json ← IDE 자동완성 전용. 런타임 미사용.
```

**규칙:** 다른 문서가 이 문서와 다른 값을 기재하면 이 문서의 값이 옳다.

---

## 1. 확정 숫자 규칙 (전 문서 통일 기준)

```
headline max chars:          60자  (hard limit, validate FAIL)
narrationText max chars:    200자  (hard limit, validate FAIL)
narrationText recommended:  120자  (권장, validate WARN only)
subtitle chars per line:     28자
subtitle max lines:           2줄
subtitle lead frames:         3f   (VO 시작 3f 전 노출)

longform minimum scenes:      5    (cover + 3 본문 이상 + closing)
longform recommended scenes:  8–14
shorts minimum scenes:        1
shorts recommended scenes:    1–3

framework items max:          5
application steps max:        4
quote text max lines:         3줄
```

---

## 2. System Ownership Map

```
src/types/index.ts
  ← TypeScript interface/type 정의 위치.
  ← 아래 섹션 3에서 확정된 변경사항이 반영된 버전이 canonical.
  ← 다른 파일의 타입과 충돌 시 이 파일 우선.

src/schema/scene-catalog.json
  ← 씬 기본값 레지스트리.
  ← 읽기 전용. Claude Code 수정 불가.
  ← motionPreset 기본값, durationFramesDefault, layers, shortsAdaptation 보유.

src/schema/asset-manifest.json
  ← 에셋 레지스트리.
  ← 읽기 전용. Claude Code 수정 불가. 사람만 수동 추가.
  ← manifest ID ↔ 파일 경로 매핑.

src/design/tokens/design-tokens-draft.json
  ← 디자인 토큰 원본 (JSON).
  ← src/design/tokens/*.ts로 변환 후 .ts 파일이 런타임 기준.

src/design/tokens/motion-presets.json
  ← 모션 프리셋 원본 (JSON).
  ← src/design/tokens/motion.ts로 변환 후 .ts 파일이 런타임 기준.

src/schema/content-schema.json
  ← IDE 자동완성 전용. runtime validate.ts에서 실행 안 됨.
  ← 수정은 canonical spec 변경 후 사람이 수동 동기화.

assets/ 하위 디렉토리
  ← 렌더에 사용되는 실제 파일.
  ← remotion.config.ts에서 publicDir: 'assets' 설정.
```

---

## 3. Canonical Type Changes (types/index.ts에 반영)

아래 변경사항이 types/index.ts에 적용되어야 한다.

```typescript
// ✅ coverImageUrl: required (? 제거)
export interface CoverContent {
  title: string
  subtitle?: string
  author: string
  coverImageUrl: string    // required. NOT optional.
  brandLabel?: string
  backgroundVariant?: 'dark' | 'light'
}

// ✅ ShortsSceneConfig: enabled 제거, skipForShorts만
export interface ShortsSceneConfig {
  skipForShorts?: boolean          // default: false
  durationFramesOverride?: number
  // enabled 필드 없음 (폐기)
}

// ✅ SceneAssetRefs: coverImage 제거
export interface SceneAssetRefs {
  backgroundTexture?: string       // manifest ID
  icon?: string                    // manifest ID
  sfx?: string                     // manifest ID
  // coverImage 없음 → CoverContent.coverImageUrl 사용
  // bgm 없음 → AudioConfig.bgmTrack 사용
}

// ✅ Theme: surfaceMuted 포함 (기존 유지)
export interface Theme {
  mode: ThemeMode
  genre: GenreKey
  bg: string
  surface: string
  surfaceMuted: string    // ← 반드시 포함
  textStrong: string
  textMuted: string
  lineSubtle: string
  signal: string
  accent: string
  premium: string
}
```

---

## 4. Canonical Field Naming

```
TTS 텍스트 필드:  scene.narrationText   (flat field, string | undefined)
                  scene.narration.text  ← 폐기. 사용 금지.

커버 이미지:      CoverContent.coverImageUrl  ← 렌더에서 사용
                  BookMetadata.coverImageUrl  ← 외부 도구 전용, 렌더 비관여

Shorts 제외:      scene.shorts.skipForShorts  (boolean, default false)
                  scene.shorts.enabled        ← 폐기. 사용 금지.

에셋 참조:
  - 직접 파일 경로 필드: *ImageUrl, *Track, *Logo  → book.json에 상대경로 기재
  - manifest ID 필드: SceneAssetRefs.*              → resolveAssets()에서 경로 변환
```

---

## 5. Asset Path Convention

```
book.json 기재 방식:
  "coverImageUrl": "covers/influence.png"     ← assets/ 기준 상대경로

컴포넌트에서 사용:
  staticFile('covers/influence.png')          ← publicDir: 'assets' 설정 필요

파일시스템 실제 경로:
  assets/covers/influence.png

QA validate 파일 존재 확인:
  path.join('assets', scene.content.coverImageUrl)
  → assets/covers/influence.png

book.json에 "assets/covers/..." 전체경로 기재 금지.
```

**remotion.config.ts 필수 설정:**
```typescript
import { Config } from '@remotion/cli/config'
Config.setPublicDir('assets')
```

**asset-manifest.json 수정 권한:**
- Claude Code: 읽기 전용
- 신규 에셋 추가: 사람이 `status: "draft"` 항목 수동 추가 → 테스트 → `"ready"` 승격
- `license: "pending-check"` 에셋은 렌더에 포함 불가

**$schema 경로 (book.json 파일 내):**
```json
{
  "$schema": "../../src/schema/content-schema.json"
}
```

---

## 6. Scene Typing

**TypeScript:** Discriminated union (types/index.ts의 TypedScene)

```typescript
export type TypedScene =
  | (SceneBase & { type: 'cover'; content: CoverContent })
  | (SceneBase & { type: 'chapterDivider'; content: ChapterDividerContent })
  | (SceneBase & { type: 'keyInsight'; content: KeyInsightContent })
  | (SceneBase & { type: 'compareContrast'; content: CompareContrastContent })
  | (SceneBase & { type: 'quote'; content: QuoteContent })
  | (SceneBase & { type: 'framework'; content: FrameworkContent })
  | (SceneBase & { type: 'application'; content: ApplicationContent })
  | (SceneBase & { type: 'data'; content: DataContent })
  | (SceneBase & { type: 'closing'; content: ClosingContent })
```

**Zod:** validate.ts에서 types/index.ts 기반으로 파생. content-schema.json ajv 실행 없음.

---

## 7. Validation Rules by Format

```typescript
// validate.ts 구현 기준

const MIN_SCENES = { longform: 5, shorts: 1, both: 5 }

// Level 0 — BLOCKED (format별 분기)
function validateLevel0(book: BookContent): ValidationResult {
  const format = book.production?.format ?? 'both'
  const isLongform = format === 'longform' || format === 'both'

  return [
    // format 무관
    book.scenes.length >= MIN_SCENES[format],
    book.scenes.every(s => s.id),
    !hasDuplicateIds(book.scenes),

    // longform / both만 강제
    !isLongform || book.scenes[0]?.type === 'cover',
    !isLongform || book.scenes[book.scenes.length - 1]?.type === 'closing',
    // 검증 기준: CoverContent.coverImageUrl (content 필드). BookMetadata.coverImageUrl 사용 금지.
    !isLongform || (book.scenes[0]?.type === 'cover' && fileExists(path.join('assets', (book.scenes[0].content as CoverContent).coverImageUrl))),

    // 전체: license pending 에셋 포함 금지
    !hasLicensePendingAssets(book),
  ]
}

// Level 1 — WARN (렌더 가능)
function validateLevel1(book: BookContent): Warning[] {
  const warnings = []
  book.scenes.forEach(s => {
    if (s.narrationText && s.narrationText.length > 120) {
      warnings.push(`Scene ${s.id}: narrationText > 120자 (TTS 길이 주의)`)
    }
  })
  return warnings
}
```

**Shorts 씬 패턴:**

| 씬 수 | 가능 여부 | 비고 |
|-------|-----------|------|
| 1 | ✅ 허용 | cover/closing 강제 없음 |
| 2 | ✅ 허용 | |
| 3 | ✅ 권장 | keyInsight + quote + closing 패턴 |
| cover만 있는 shorts | ✅ 허용 | |
| closing 없는 shorts | ✅ 허용 | |

---

## 8. Duration Resolution

결정 트리 (planScenes.ts 구현 기준):

```
1. scene.durationFrames 명시됨
   → 사용. 끝.

2. scene.durationFrames 없음 + narrationText 있음 + TTS 성공
   a. TTS duration ≤ catalog.durationFramesDefault + 60f
      → durationFrames = TTS duration + 15f
   b. TTS duration > catalog.durationFramesDefault + 60f
      → throw Error(`Scene ${id}: TTS ${tts}f > max ${max}f. Shorten narrationText.`)
      → 렌더 중단.

3. scene.durationFrames 없음 + (narrationText 없음 OR TTS 실패)
   → durationFrames = catalog.durationFramesDefault
   → scene.tts = undefined (SubtitleLayer 미표시)

씬 삽입 없음. duration은 렌더 시작 전 전부 확정.
```

---

## 9. Motion Preset Helper API

`src/design/tokens/motion.ts`에 구현:

```typescript
export type MotionPresetKey = 'gentle' | 'smooth' | 'snappy' | 'heavy' | 'dramatic'

export interface ResolvedMotionConfig {
  type: 'spring' | 'interpolate'
  springConfig?: { stiffness: number; damping: number; mass: number }
  easingBezier?: [number, number, number, number]
  durationRange: [number, number]
  overshootClamping?: boolean
}

// preset key → config 반환
export function resolvePreset(key: MotionPresetKey): ResolvedMotionConfig

// frame → 0~1 progress 반환
export function applyPreset(
  key: MotionPresetKey,
  frame: number,
  fps: number,
  durationInFrames?: number,
): number

// shorts용 단축 duration 반환
export function shortsPresetDuration(key: MotionPresetKey): number
```

**'hybrid' 타입(dramatic) 처리:**  
spring 우선 적용. easingBezier는 interpolate fallback용.

**적용 레벨:**  
- element level: 각 컴포넌트가 `applyPreset()` 직접 호출
- shorts: scene 컴포넌트가 `format === 'shorts'`일 때 `shortsPresetDuration()` 반환값을 durationInFrames로 전달

---

## 10. Render Failure Policy

```
에셋 fallback (렌더 계속):
  - 이미지 파일 없음 → surfaceMuted placeholder-rect, 렌더 계속
  - manifest ID 없음 → asset-manifest fallback.strategy 적용, 렌더 계속
  - 폰트 로딩 실패 → Pretendard → Inter → system-ui 체인, 렌더 계속
  - TTS 실패 → durationFramesDefault, silent 모드, 렌더 계속
  - 텍스트 오버플로 → 폰트 1단계 축소 → bodyS 최소 → 말줄임표, 렌더 계속

렌더 실패 (FAIL_FAST):
  - React 컴포넌트 throw → 3회 재시도 → exit(1)
  - Remotion 렌더 내부 오류 → 3회 재시도 → exit(1)
  - 씬 skip: 절대 없음
  - 부분 성공 output 파일: 절대 없음
  - render-errors.log에 씬 ID + 스택 트레이스 기록

validate BLOCKED (렌더 시작 불가):
  - Level 0 항목 중 하나라도 실패
  - exit(1), 메시지 출력
```

---

## 11. Longform / Shorts Branching

**단일 코드베이스. format prop으로 분기.**

```typescript
// 모든 씬 컴포넌트 필수 시그니처
interface BaseSceneProps {
  format: 'longform' | 'shorts'
  theme: Theme
  from: number
  durationFrames: number
  tts?: TTSResult
  subtitles?: SubtitleEntry[]
}
```

**shorts composition 씬 필터:**
```typescript
function getScenesForFormat(scenes: TypedScene[], format: FormatKey): TypedScene[] {
  if (format === 'longform') return scenes
  const filtered = scenes.filter(s => !(s.shorts?.skipForShorts === true))
  if (filtered.length === 0) {
    console.warn('No shorts scenes found, using all scenes')
    return scenes
  }
  return filtered
}
```

**씬 내 shorts 분기 표준 패턴:**
```typescript
const { safeArea, typeScale } = useFormat(format)
const showSupportText = format === 'longform'
const maxItems = format === 'shorts' ? 3 : 5
const durationMs = format === 'shorts'
  ? shortsPresetDuration(motionPresetKey)
  : durationInFrames
```

---

## 12. Subtitle Rules

```
줄당 최대: 28자
최대 줄 수: 2줄
lead: VO 시작 3프레임 전
위치: SafeArea 하단 안쪽
architecture.md의 "40자": 오류. 무시.
```

---

## 13. 금지사항 요약

```
코딩:
  - hex 하드코딩
  - px 수치 하드코딩 (토큰 외)
  - spring config 임의 작성 (presets 외)
  - scene.narration.text 경로 사용
  - ShortsSceneConfig.enabled 사용
  - SceneAssetRefs.coverImage 사용

구조:
  - scenes/ → compositions/ import
  - primitives/ → scenes/ import
  - src/schema/*.json 수정 (Claude Code)
  - src/schema/asset-manifest.json 수정 (Claude Code)
  - content-schema.json을 runtime validate에서 실행

파이프라인:
  - 씬 skip (렌더 실패 시)
  - 부분 성공 output 파일 생성
  - duration 결정 시 씬 삽입
  - license: "pending-check" 에셋 렌더 포함
  - book.json에 "assets/covers/..." 전체경로 직접 기재
```
