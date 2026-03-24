# REVISED_CLAUDE_4_3_HANDOFF.md
**Editorial Signal — Claude Code 최종 구현 브리프**  
Version: 2.0.0 | CLAUDE_4_3_HANDOFF.md를 대체함

이 문서는 REVISED_CANONICAL_SPEC.md의 파생 문서다.  
충돌 시 REVISED_CANONICAL_SPEC.md가 우선한다.  
이 문서를 읽고 바로 구현을 시작하라.

---

## 1. 프로젝트 목표

한국어 책 요약 YouTube 채널용 Remotion 영상 자동화 시스템.  
`content/books/{book-id}.json`만 작성하면 longform + shorts 영상이 생산된다.

**스택:** React 18 + Remotion 4 + TypeScript 5 + Zod  
**포맷:** Longform 1920×1080 / Shorts 1080×1920 / baseFPS 30

---

## 2. Precedence Chain

```
REVISED_CANONICAL_SPEC.md > src/types/index.ts > scene-catalog.json
> asset-manifest.json > 이 문서 > CLAUDE.md > 나머지 모든 문서
```

---

## 3. 폴더 구조

```
editorial-signal/
├── CLAUDE.md
├── remotion.config.ts          ← publicDir: 'assets' 설정 필수
├── tsconfig.json               ← strict: true
├── package.json
│
├── src/
│   ├── types/
│   │   └── index.ts            ← 타입 단일 소스 (아래 4절 변경사항 반영 필수)
│   │
│   ├── design/
│   │   ├── tokens/
│   │   │   ├── colors.ts       ← design-tokens-draft.json 파생
│   │   │   ├── typography.ts
│   │   │   ├── spacing.ts
│   │   │   ├── radius.ts
│   │   │   ├── shadow.ts
│   │   │   ├── layout.ts
│   │   │   ├── motion.ts       ← motion-presets.json 파생 + resolvePreset/applyPreset 구현
│   │   │   ├── zIndex.ts
│   │   │   └── index.ts        ← 전체 re-export
│   │   └── themes/
│   │       ├── useTheme.ts     ← (mode, genre) → Theme 반환
│   │       └── useFormat.ts    ← format → safeArea, typeScale, gridCols 반환
│   │
│   ├── components/
│   │   ├── primitives/
│   │   │   ├── TextBlock.tsx       MVP
│   │   │   ├── LabelChip.tsx       MVP
│   │   │   ├── DividerLine.tsx     MVP
│   │   │   ├── SignalBar.tsx        MVP
│   │   │   ├── QuoteBlock.tsx      MVP
│   │   │   ├── Counter.tsx         MVP
│   │   │   ├── ImageMask.tsx       MVP  ← onError → surfaceMuted rect
│   │   │   ├── IconWrapper.tsx     MVP  ← onError → visibility:hidden
│   │   │   ├── PathConnector.tsx   이후
│   │   │   └── CoverFrame.tsx      이후
│   │   ├── layout/
│   │   │   ├── CanvasWrapper.tsx
│   │   │   ├── BackgroundLayer.tsx
│   │   │   ├── SafeArea.tsx        MVP
│   │   │   └── SplitPanel.tsx
│   │   ├── motion/
│   │   │   ├── ArchitecturalReveal.tsx  MVP
│   │   │   ├── StaggerContainer.tsx     MVP
│   │   │   ├── ContinuousPan.tsx
│   │   │   ├── GridSplitWipe.tsx
│   │   │   └── DynamicCounter.tsx
│   │   └── hud/
│   │       ├── SubtitleLayer.tsx   MVP  ← 28자/줄, 2줄 max
│   │       └── ChapterIndicator.tsx
│   │
│   ├── scenes/
│   │   ├── CoverScene.tsx          MVP
│   │   ├── KeyInsightScene.tsx     MVP
│   │   ├── ClosingScene.tsx        MVP
│   │   ├── ChapterDividerScene.tsx
│   │   ├── QuoteScene.tsx
│   │   ├── FrameworkScene.tsx
│   │   ├── CompareContrastScene.tsx
│   │   ├── ApplicationScene.tsx
│   │   └── DataScene.tsx
│   │
│   ├── compositions/
│   │   ├── LongformComposition.tsx
│   │   └── ShortsComposition.tsx
│   │
│   ├── pipeline/
│   │   ├── validate.ts         ← Zod 기반. content-schema.json ajv 실행 안 함.
│   │   ├── planScenes.ts       ← duration 결정 트리 구현
│   │   ├── resolveAssets.ts    ← manifest ID → 파일 경로 변환
│   │   ├── buildProps.ts
│   │   └── qa.ts               ← qa-checklist.md 자동화 항목 구현
│   │
│   ├── tts/
│   │   ├── ttsClient.ts        ← edge-tts (MVP)
│   │   ├── durationSync.ts     ← TTS duration → durationFrames
│   │   └── subtitleGen.ts      ← MAX_CHARS=28, MAX_LINES=2
│   │
│   └── Root.tsx
│
├── src/schema/                 ← 전체 읽기 전용. Claude Code 수정 불가.
│   ├── scene-catalog.json
│   ├── content-schema.json     ← IDE 자동완성 전용
│   └── asset-manifest.json
│
├── content/
│   └── books/
│       └── test-book.json
│
├── assets/                     ← remotion.config.ts의 publicDir
│   ├── covers/
│   ├── sounds/
│   ├── icons/
│   └── textures/
│
└── scripts/
    ├── new-book.ts
    ├── validate-content.ts
    ├── run-tts.ts
    ├── render-longform.ts
    ├── render-shorts.ts
    └── qa-report.ts
```

---

## 4. 구현 전 types/index.ts 수정사항 (Phase 1 시작 전 필수)

```typescript
// 변경 1: CoverContent.coverImageUrl required
interface CoverContent {
  coverImageUrl: string    // ? 제거
}

// 변경 2: ShortsSceneConfig.enabled 제거
interface ShortsSceneConfig {
  skipForShorts?: boolean  // default: false. enabled 없음.
  durationFramesOverride?: number
}

// 변경 3: SceneAssetRefs.coverImage 제거
interface SceneAssetRefs {
  backgroundTexture?: string
  icon?: string
  sfx?: string
  // coverImage 없음
  // bgm 없음
}

// 확인: Theme.surfaceMuted 존재 여부 확인 후 없으면 추가
interface Theme {
  surfaceMuted: string  // 반드시 있어야 함
}
```

---

## 5. 구현 순서

### Phase 0: 프로젝트 초기화
```bash
npx create-video@latest editorial-signal --template blank
npm install zod
npm install -D @types/node ts-node
```

`remotion.config.ts`:
```typescript
import { Config } from '@remotion/cli/config'
Config.setPublicDir('assets')
```

### Phase 1: types/index.ts 수정 (4절 변경사항 적용)

### Phase 2: 토큰 시스템
- design-tokens-draft.json → src/design/tokens/*.ts 변환
- motion-presets.json → src/design/tokens/motion.ts 변환 (아래 6절 API 포함)
- useTheme.ts, useFormat.ts 구현

### Phase 3: MVP 프리미티브 8종
TextBlock, LabelChip, DividerLine, SignalBar, QuoteBlock, Counter, ImageMask, IconWrapper

### Phase 4: 레이아웃/모션/HUD
SafeArea, ArchitecturalReveal, StaggerContainer, SubtitleLayer

### Phase 5: MVP 씬 3종
CoverScene, KeyInsightScene, ClosingScene

### Phase 6: 파이프라인
validate.ts → planScenes.ts → resolveAssets.ts → buildProps.ts

### Phase 7: TTS
ttsClient.ts → durationSync.ts → subtitleGen.ts

### Phase 8: Composition + CLI + Root.tsx

### Phase 9: 첫 번째 렌더
test-book.json (8씬 이상) → validate → tts → preview → render:longform

---

## 6. motion.ts — resolvePreset / applyPreset 구현 명세

```typescript
// src/design/tokens/motion.ts

import motionPresetsData from './motion-presets.json'
import { spring, interpolate, Easing } from 'remotion'

export type MotionPresetKey = 'gentle' | 'smooth' | 'snappy' | 'heavy' | 'dramatic'

export interface ResolvedMotionConfig {
  type: 'spring' | 'interpolate'
  springConfig?: { stiffness: number; damping: number; mass: number }
  easingBezier?: [number, number, number, number]
  durationRange: [number, number]
  overshootClamping: boolean
}

export function resolvePreset(key: MotionPresetKey): ResolvedMotionConfig {
  const p = motionPresetsData.presets[key]
  if (p.type === 'spring') {
    return {
      type: 'spring',
      springConfig: p.config,
      durationRange: p.durationRange as [number, number],
      overshootClamping: p.overshootClamping ?? false,
    }
  }
  if (p.type === 'interpolate') {
    return {
      type: 'interpolate',
      easingBezier: p.easing as [number, number, number, number],
      durationRange: p.durationRange as [number, number],
      overshootClamping: false,
    }
  }
  // hybrid (dramatic): spring 우선
  return {
    type: 'spring',
    springConfig: p.springConfig,
    easingBezier: p.easing as [number, number, number, number],
    durationRange: p.durationRange as [number, number],
    overshootClamping: false,
  }
}

export function applyPreset(
  key: MotionPresetKey,
  frame: number,
  fps: number,
  durationInFrames?: number,
): number {
  const config = resolvePreset(key)
  const dur = durationInFrames ?? config.durationRange[1]
  if (config.type === 'spring') {
    return spring({
      frame,
      fps,
      config: config.springConfig!,
      durationInFrames: dur,
      overshootClamping: config.overshootClamping,
    })
  }
  const [x1, y1, x2, y2] = config.easingBezier!
  return interpolate(frame, [0, dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(x1, y1, x2, y2),
  })
}

export function shortsPresetDuration(key: MotionPresetKey): number {
  const config = resolvePreset(key)
  return Math.floor(config.durationRange[0] * 1.2)
}
```

**사용 예시:**
```typescript
// 씬 컴포넌트에서
import { applyPreset, shortsPresetDuration } from '@/design/tokens/motion'

const dur = format === 'shorts' ? shortsPresetDuration('heavy') : 36
const progress = applyPreset('heavy', frame, fps, dur)
const translateY = interpolate(progress, [0, 1], [22, 0])
```

---

## 7. validate.ts — Pseudo-code

```typescript
// src/pipeline/validate.ts
import { z } from 'zod'
import path from 'path'
import fs from 'fs'

const MIN_SCENES = { longform: 5, shorts: 1, both: 5 } as const

// Zod schemas (types/index.ts 기반 파생)
const CoverContentSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  coverImageUrl: z.string().min(1),  // required
  subtitle: z.string().optional(),
  brandLabel: z.string().optional(),
  backgroundVariant: z.enum(['dark', 'light']).optional(),
})

// ... 나머지 9종 schema 동일 패턴

export async function validateBook(book: unknown): Promise<ValidationResult> {
  // 1. Zod 파싱
  const parsed = BookContentSchema.safeParse(book)
  if (!parsed.success) return { level: 'BLOCKED', errors: parsed.error.issues }

  const data = parsed.data
  const format = data.production?.format ?? 'both'
  const isLongform = format === 'longform' || format === 'both'
  const errors: string[] = []
  const warnings: string[] = []

  // Level 0 — BLOCKED
  if (data.scenes.length < MIN_SCENES[format]) {
    errors.push(`씬 수 부족: ${data.scenes.length} < ${MIN_SCENES[format]}`)
  }
  if (isLongform) {
    if (data.scenes[0]?.type !== 'cover') errors.push('첫 씬이 cover가 아님')
    if (data.scenes.at(-1)?.type !== 'closing') errors.push('마지막 씬이 closing이 아님')
    const coverScene = data.scenes[0]
    if (coverScene?.type === 'cover') {
      const imgPath = path.join('assets', coverScene.content.coverImageUrl)
      if (!fs.existsSync(imgPath)) errors.push(`커버 이미지 없음: ${imgPath}`)
    }
  }

  // Level 1 — WARN
  data.scenes.forEach(s => {
    if ((s.narrationText?.length ?? 0) > 200) {
      errors.push(`Scene ${s.id}: narrationText > 200자`)
    } else if ((s.narrationText?.length ?? 0) > 120) {
      warnings.push(`Scene ${s.id}: narrationText > 120자 (TTS 길이 주의)`)
    }
    if (s.type === 'keyInsight' && s.content.headline.length > 60) {
      errors.push(`Scene ${s.id}: headline > 60자`)
    }
  })

  return {
    level: errors.length > 0 ? 'BLOCKED' : 'PASS',
    errors,
    warnings,
  }
}
```

---

## 8. planScenes.ts — Duration 결정 트리

```typescript
// src/pipeline/planScenes.ts
import sceneCatalog from '@/schema/scene-catalog.json'

export function resolveDuration(
  scene: TypedScene,
  ttsResult: TTSResult | undefined,
): number {
  // 1. 명시적 durationFrames 최우선
  if (scene.durationFrames !== undefined) return scene.durationFrames

  const catalog = sceneCatalog.scenes[scene.type]
  const defaultDur = catalog.durationFramesDefault

  // 2. TTS 없음 / 실패
  if (!ttsResult) return defaultDur

  // 3. TTS 있음
  const maxAutoExtend = defaultDur + 60
  if (ttsResult.durationFrames <= maxAutoExtend) {
    return ttsResult.durationFrames + 15
  }

  // 4. TTS 너무 길음 → 렌더 중단
  throw new Error(
    `Scene "${scene.id}": TTS ${ttsResult.durationFrames}f > max ${maxAutoExtend}f. ` +
    `narrationText를 줄이거나 durationFrames를 명시하세요.`
  )
}

export function getScenesForFormat(
  scenes: TypedScene[],
  format: FormatKey,
): TypedScene[] {
  if (format === 'longform') return scenes
  const filtered = scenes.filter(s => !(s.shorts?.skipForShorts === true))
  if (filtered.length === 0) {
    console.warn('[planScenes] shorts 필터 결과 0개. 전체 씬 사용.')
    return scenes
  }
  return filtered
}
```

---

## 9. Asset Handling

```typescript
// CoverScene에서 coverImageUrl 사용법
import { staticFile } from 'remotion'

// ✅ content.coverImageUrl = "covers/influence.png"
const src = staticFile(content.coverImageUrl)
// → remotion.config.ts의 publicDir: 'assets' 설정으로
// → assets/covers/influence.png 로드

// ❌ 금지
const src = staticFile('assets/covers/influence.png')  // 전체경로 금지
```

```typescript
// resolveAssets.ts — manifest ID → 실제 경로 변환
import assetManifest from '@/schema/asset-manifest.json'

export async function resolveManifestAsset(id: string): Promise<ResolvedAsset> {
  const entry = assetManifest.assets.find(a => a.id === id)

  if (!entry) {
    return { id, usedFallback: true, resolvedPath: '', fallbackReason: 'manifest miss' }
  }
  if (entry.license.status === 'pending-check') {
    throw new Error(`Asset "${id}" license not confirmed. 렌더 포함 불가.`)
  }
  if (entry.source.path === 'code-generated') {
    return { id, usedFallback: false, resolvedPath: 'code-generated' }
  }
  const exists = fs.existsSync(path.join('assets', entry.source.path))
  if (!exists && entry.fallback) {
    return { id, usedFallback: true, resolvedPath: entry.fallback.strategy }
  }
  return { id, usedFallback: false, resolvedPath: entry.source.path }
}
```

---

## 10. Render Failure Policy

```typescript
// scripts/render-longform.ts

const MAX_RETRIES = 3
let attempt = 0

while (attempt < MAX_RETRIES) {
  try {
    await renderMedia({ /* ... */ })
    break  // 성공
  } catch (err) {
    attempt++
    console.error(`렌더 실패 (${attempt}/${MAX_RETRIES}):`, err.message)
    if (attempt === MAX_RETRIES) {
      fs.writeFileSync('render-errors.log', `${new Date().toISOString()}\n${err.stack}`)
      // output/ 에 부분 파일 생성 없음
      console.error('FAIL_FAST: 렌더 중단. render-errors.log 확인.')
      process.exit(1)
    }
  }
}

// 씬 skip 로직: 없음. 절대 구현하지 않음.
```

---

## 11. subtitleGen.ts 핵심 규칙

```typescript
// src/tts/subtitleGen.ts
const MAX_CHARS_PER_LINE = 28   // architecture.md의 40은 오류. 28이 canonical.
const MAX_LINES = 2
const LEAD_FRAMES = 3           // motion-presets.json defaults.subtitleLeadFrames

function splitToLines(text: string): string[] {
  const lines: string[] = []
  let remaining = text
  while (remaining.length > 0) {
    lines.push(remaining.slice(0, MAX_CHARS_PER_LINE))
    remaining = remaining.slice(MAX_CHARS_PER_LINE)
    if (lines.length >= MAX_LINES) break  // 초과분 잘림
  }
  return lines
}
```

---

## 12. book.json 작성 규칙

```json
{
  "$schema": "../../src/schema/content-schema.json",
  "metadata": {
    "id": "influence-2024",
    "title": "설득의 심리학",
    "author": "로버트 치알디니",
    "genre": "psychology",
    "coverImageUrl": "covers/influence.png"
  },
  "production": {
    "format": "both",
    "themeMode": "dark"
  },
  "narration": {
    "voice": "ko-KR-InJoonNeural",
    "ttsEngine": "edge-tts"
  },
  "scenes": [
    {
      "id": "cover-01",
      "type": "cover",
      "narrationText": "로버트 치알디니의 설득의 심리학.",
      "content": {
        "title": "설득의 심리학",
        "author": "로버트 치알디니",
        "coverImageUrl": "covers/influence.png"
      }
    }
  ]
}
```

**규칙:**
- `coverImageUrl`: `"covers/파일명.png"` 형식. `assets/` prefix 없음.
- `$schema`: `"../../src/schema/content-schema.json"` (IDE 자동완성용)
- `narrationText`: 120자 이하 권장, 200자 초과 시 validate FAIL
- `scenes[0].type`: longform은 반드시 `"cover"`
- `scenes[last].type`: longform은 반드시 `"closing"`

---

## 13. Implementation Checklist

### Phase 1 완료 기준
- [ ] `CoverContent.coverImageUrl: string` (`?` 없음)
- [ ] `ShortsSceneConfig`에 `enabled` 없음
- [ ] `SceneAssetRefs`에 `coverImage` 없음
- [ ] `Theme`에 `surfaceMuted: string` 있음

### Phase 2 완료 기준
- [ ] `remotion.config.ts`에 `Config.setPublicDir('assets')` 있음
- [ ] `motion.ts`에 `resolvePreset`, `applyPreset`, `shortsPresetDuration` 구현됨
- [ ] `useTheme('dark', 'psychology')` → 11개 필드 모두 반환
- [ ] `useFormat('shorts')` → shorts safeArea 반환

### Phase 3~4 완료 기준
- [ ] 모든 컴포넌트: `format: FormatKey` prop
- [ ] 모든 컴포넌트: `theme: Theme` prop
- [ ] ImageMask: `onError` → surfaceMuted placeholder
- [ ] IconWrapper: `onError` → `visibility: hidden`
- [ ] 토큰 하드코딩 없음

### Phase 5 완료 기준 (씬 컴포넌트)
- [ ] CoverScene: `staticFile(content.coverImageUrl)` 사용
- [ ] 모든 씬: scene-catalog.json의 zIndex 준수
- [ ] 모든 씬: `format === 'shorts'` 분기 처리
- [ ] 모든 씬: `durationFrames` props로 받음 (내부 하드코딩 없음)
- [ ] 모든 씬: `applyPreset()` 으로 motion 적용

### Phase 6 완료 기준 (파이프라인)
- [ ] validate.ts: Zod 사용, content-schema.json ajv 없음
- [ ] validate.ts: longform minScenes=5, shorts minScenes=1
- [ ] validate.ts: longform cover/closing 강제, shorts 강제 없음
- [ ] validate.ts: headline > 60자 → FAIL
- [ ] validate.ts: narrationText > 200자 → FAIL
- [ ] validate.ts: narrationText > 120자 → WARN
- [ ] planScenes.ts: duration 결정 트리 구현
- [ ] planScenes.ts: TTS 초과 시 throw (씬 삽입 없음)
- [ ] resolveAssets.ts: pending-check 에셋 → throw

### Phase 7 완료 기준
- [ ] `scene.narrationText` 참조 (`narration.text` 아님)
- [ ] subtitleGen.ts: `MAX_CHARS_PER_LINE = 28`
- [ ] subtitleGen.ts: `MAX_LINES = 2`

### Phase 9 완료 기준
- [ ] test-book.json: longform, 8씬 이상, cover + closing 있음
- [ ] `npm run validate` → PASS
- [ ] Remotion preview 씬 전환 정상
- [ ] `npm run render:longform` → 성공
- [ ] 렌더 실패 시 `process.exit(1)` 확인 (씬 skip 없음)
