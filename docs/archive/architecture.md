# Editorial Signal — Production Architecture
**Version:** 1.0.0  
**Stack:** React + Remotion + TypeScript  
**Core Metaphor:** Editorial Continuous Canvas

---

## 핵심 설계 원칙

1. **Data-Driven, Not Design-Driven** — 콘텐츠 JSON만 바꾸면 새 영상이 나온다
2. **Token-First** — 하드코딩 금지. 모든 색·크기·모션은 토큰에서만 참조
3. **Layout Archetype 중심 조립** — scene list가 아니라 canvas 위의 archetype 배치
4. **Longform / Shorts 단일 소스** — 포맷은 다르되 코드베이스는 하나
5. **Fallback은 설계 단계에서** — 런타임 에러가 아니라 graceful degradation
6. **Claude Code가 파싱 가능한 구조** — JSON schema가 구현 명세서 역할을 겸한다

---

## 시스템 4계층

```
┌─────────────────────────────────────────────────────────┐
│  1. Brand Layer      토큰 · 테마 · 장르 변주              │
├─────────────────────────────────────────────────────────┤
│  2. Design & Motion  컴포넌트 · 프리미티브 · 모션 프리셋  │
├─────────────────────────────────────────────────────────┤
│  3. Scene System     씬 템플릿 · 컴포지션 · 캔버스 조립  │
├─────────────────────────────────────────────────────────┤
│  4. Runtime Layer    콘텐츠 주입 · TTS · 렌더 · QA       │
└─────────────────────────────────────────────────────────┘
```

---

## 1. Brand Layer

### 1-1. 브랜드 톤
- Intellectual but accessible
- Trustworthy, modern, refined
- Editorial over cinematic
- Structure over spectacle

### 1-2. 장르별 변주 규칙
브랜드는 고정. 아래 4가지만 장르별로 다르게 설정한다.

| 항목 | 변주 방법 |
|------|-----------|
| 보조 accent 컬러 | `genreVariants[genre].accent` 토큰 참조 |
| 배경 보조 톤 | `genreVariants[genre].tint` 토큰 참조 |
| 데이터 시각화 스타일 우선순위 | `genre-variant-rules.json`에서 로드 |
| 씬 emphasis 방식 | `sceneDefaults[genre].emphasisPattern` |

장르 키: `selfHelp` | `psychology` | `business` | `philosophy` | `science` | `ai`

### 1-3. Visual Language 요약
- Deep Navy `#0F172A` + Ivory White `#F8F7F2` → 기본 다크/라이트 배경
- Cobalt Blue `#356DFF` → 브랜드 시그널. 씬당 최대 1~2회
- Sans-serif 기반. Serif는 quote · chapter · cover accent에만 허용
- 에디토리얼 지면처럼. 앱 카드처럼 보이면 안 됨

---

## 2. Design & Motion Layer

### 2-1. 토큰 파일 구조

```
src/design/tokens/
  index.ts          ← 전체 토큰 re-export
  colors.ts         ← brand / neutral / semantic / genreVariants / chart
  typography.ts     ← fontFamily / weights / tracking / lineHeight / scale
  spacing.ts        ← 0~40 단계 스케일 (4px base)
  radius.ts         ← none / sm / md / lg / xl / pill
  shadow.ts         ← soft1 / soft2 / float / focusRing
  layout.ts         ← safeArea / gridColumns / centerAxisWidth
  motion.ts         ← presets / roles / transitions / constraints
  zIndex.ts         ← background → globalOverlay (0~90)
```

**하드코딩 방지 규칙:**
- ESLint rule: `no-restricted-syntax` → 색상 hex 직접 사용 금지
- 모든 컴포넌트는 `useTokens()` hook 또는 `tokens.*` import로만 스타일 참조
- 예외: Remotion `staticFile()` 경로

### 2-2. Theme 구조

```typescript
type ThemeMode = 'dark' | 'light'
type GenreKey = 'selfHelp' | 'psychology' | 'business' | 'philosophy' | 'science' | 'ai'

interface Theme {
  mode: ThemeMode
  genre: GenreKey
  bg: string
  surface: string
  textStrong: string
  textMuted: string
  lineSubtle: string
  accent: string        // genre-specific
  signal: string        // always cobaltBlue
  premium: string       // always softGold (rare use)
}
```

`useTheme(mode, genre)` hook이 토큰에서 computed theme을 반환한다.

### 2-3. Motion Preset 구조 (확정 5종)

| Preset | Type | Duration | 용도 |
|--------|------|----------|------|
| `gentle` | interpolate | 90~180f | ambient drift, texture |
| `smooth` | spring | 24~45f | body reveal, pan |
| `snappy` | spring | 12~24f | keyword, counter, chip |
| `heavy` | spring | 30~54f | chapter title, insight |
| `dramatic` | spring+interpolate | 45~75f | chapter shift, intro |

### 2-4. Safe Area / Grid

**Longform (1920×1080)**
- outerMarginX: 128px / outerMarginY: 80px
- bodyMaxWidth: 920px / contentColumnWidth: 760px
- gridColumns: 12 / gutter: 24px

**Shorts (1080×1920)**
- outerMarginX: 72px / outerMarginY: 120px
- bodyMaxWidth: 720px / contentColumnWidth: 640px
- gridColumns: 6 / gutter: 20px

---

## 3. Scene System Layer

### 3-1. Canvas 정의
씬은 독립 카드가 아니다.
모든 씬은 **하나의 연속 에디토리얼 캔버스 위의 layout archetype 배치**다.
전환은 "새 슬라이드 등장"이 아니라 **같은 캔버스 안에서 시선 이동**이다.

### 3-2. Layout Archetype 목록 (8종)

| Archetype | 주요 씬 | 핵심 Motion |
|-----------|---------|------------|
| `center-focus` | cover, keyInsight, closing | architecturalTypoReveal |
| `left-anchor` | chapterDivider, application | staggeredCascade |
| `split-compare` | compareContrast | gridSplitWipe |
| `grid-expand` | framework, data | staggeredCascade + dynamicCounter |
| `quote-hold` | quote, closing | heavy + long hold |
| `map-flow` | application, science | logicalPathConnect |
| `top-anchor` | keyInsight(alt), data | architecturalTypoReveal |
| `band-divider` | chapterDivider(alt) | gridSplitWipe |

### 3-3. Scene Types (9종)

```
cover          → center-focus
chapterDivider → left-anchor / band-divider
keyInsight     → center-focus / top-anchor
compareContrast→ split-compare
quote          → quote-hold
framework      → grid-expand
application    → map-flow / left-anchor
data           → grid-expand / top-anchor
closing        → center-focus / quote-hold
```

### 3-4. Composition 설계

```
Root Composition
  └── CanvasWrapper          ← 전체 캔버스 컨테이너 (translate 제어)
       ├── BackgroundLayer   ← 배경 + 텍스처 (z:0~5)
       ├── GridLayer         ← 가이드 그리드 (z:10, dev-only)
       ├── ContentLayer      ← 씬별 컴포넌트 마운트 (z:20~40)
       ├── OverlayLayer      ← 전환 효과 (z:80)
       └── HUDLayer          ← 자막 + 챕터 인디케이터 (z:70)
```

### 3-5. Longform / Shorts 공통화 전략

```typescript
// 씬 컴포넌트는 format prop 하나로 분기
interface SceneProps {
  format: 'longform' | 'shorts'
  // ... scene-specific props
}

// useFormat() hook
const { safeArea, typeScale, gridCols } = useFormat(format)
```

- 동일 컴포넌트 파일, `format` prop으로 분기
- `useFormat()` hook이 safe area · type scale · grid를 format에 맞게 반환
- Shorts: 레이어 수 축소, 타입 크기 확대, central-axis 강제

---

## 4. Runtime Layer

### 4-1. Content Schema 흐름

```
book.json
  └── BookContent
       ├── metadata (title, author, genre, isbn)
       ├── narration (tts source, voice config)
       ├── scenes[]
       │    ├── id, type, layoutArchetype
       │    ├── durationFrames (또는 tts-derived)
       │    ├── content (type별 다름)
       │    ├── motion (preset overrides)
       │    └── assets (refs to manifest)
       └── genreOverride (optional)
```

### 4-2. TTS / 자막 / 싱크

```
content.scenes[].narrationText
  → TTS Engine → .wav / .mp3
  → Duration 측정 → durationFrames 자동 계산
  → 자막 파일 생성 (.srt / .vtt)
  → Remotion <Audio> + <Subtitles> 싱크
```

**TTS-Duration 불일치 처리:**
- TTS duration > scene durationFrames → scene 자동 연장 (최대 +60f)
- TTS duration >> scene → 경고 로그 + fallback hold 씬 삽입
- TTS 실패 → silent placeholder + 자막만 표시

### 4-3. Render Pipeline

```
1. validate(book.json)          ← JSON schema 검증
2. planScenes(book.json)        ← scene plan 생성
3. runTTS(scenes)               ← 음성 파일 생성
4. generateSubtitles(tts)       ← 자막 파일 생성
5. resolveAssets(scenes)        ← 에셋 존재 확인 + fallback 적용
6. buildProps(scenes, assets)   ← Remotion props 조립
7. render(props)                ← npx remotion render
8. qa(output)                   ← 출력 파일 QA 체크
```

### 4-4. QA 체크포인트

- [ ] 총 durationFrames 합계 = 예상 영상 길이 ±5%
- [ ] 모든 씬에 narration 또는 silent 명시
- [ ] 자막 오버플로 없음 (최대 2줄 / 28자)
- [ ] 누락 에셋 0개 (fallback 포함 시 통과)
- [ ] 폰트 로딩 완료 확인
- [ ] 장르 accent 색상 씬당 최대 2개

### 4-5. Fallback 규칙

| 실패 상황 | Fallback 처리 |
|-----------|--------------|
| 이미지 누락 | 브랜드 컬러 placeholder rect |
| 폰트 로딩 실패 | system-ui → sans-serif 체인 |
| TTS 실패 | silent + 자막만 |
| 텍스트 오버플로 | font-size 단계 축소 → 최소 bodyS까지 |
| 아이콘 누락 | 빈 공간 (아이콘 컨테이너 숨김) |
| 렌더 실패 | 3회 재시도 → FAIL_FAST (process.exit(1)) + render-errors.log |

---

## 최종 폴더 구조

```
editorial-signal/
├── src/
│   ├── design/
│   │   ├── tokens/
│   │   │   ├── index.ts
│   │   │   ├── colors.ts
│   │   │   ├── typography.ts
│   │   │   ├── spacing.ts
│   │   │   ├── radius.ts
│   │   │   ├── shadow.ts
│   │   │   ├── layout.ts
│   │   │   ├── motion.ts
│   │   │   └── zIndex.ts
│   │   └── themes/
│   │       ├── useTheme.ts
│   │       └── useFormat.ts
│   │
│   ├── components/
│   │   ├── primitives/
│   │   │   ├── TextBlock.tsx
│   │   │   ├── LabelChip.tsx
│   │   │   ├── DividerLine.tsx
│   │   │   ├── QuoteBlock.tsx
│   │   │   ├── CoverFrame.tsx
│   │   │   ├── Counter.tsx
│   │   │   ├── PathConnector.tsx
│   │   │   ├── SignalBar.tsx
│   │   │   ├── ImageMask.tsx
│   │   │   └── IconWrapper.tsx
│   │   ├── layout/
│   │   │   ├── CanvasWrapper.tsx
│   │   │   ├── BackgroundLayer.tsx
│   │   │   ├── GridLayer.tsx
│   │   │   ├── SafeArea.tsx
│   │   │   └── SplitPanel.tsx
│   │   ├── motion/
│   │   │   ├── ArchitecturalReveal.tsx
│   │   │   ├── StaggerContainer.tsx
│   │   │   ├── ContinuousPan.tsx
│   │   │   ├── GridSplitWipe.tsx
│   │   │   └── DynamicCounter.tsx
│   │   └── hud/
│   │       ├── SubtitleLayer.tsx
│   │       └── ChapterIndicator.tsx
│   │
│   ├── scenes/
│   │   ├── CoverScene.tsx
│   │   ├── ChapterDividerScene.tsx
│   │   ├── KeyInsightScene.tsx
│   │   ├── CompareContrastScene.tsx
│   │   ├── QuoteScene.tsx
│   │   ├── FrameworkScene.tsx
│   │   ├── ApplicationScene.tsx
│   │   ├── DataScene.tsx
│   │   └── ClosingScene.tsx
│   │
│   ├── compositions/
│   │   ├── LongformComposition.tsx
│   │   └── ShortsComposition.tsx
│   │
│   ├── schema/
│   │   ├── content-schema.json
│   │   ├── scene-catalog.json
│   │   └── asset-manifest.json
│   │
│   ├── types/
│   │   ├── content.ts
│   │   ├── scene.ts
│   │   ├── asset.ts
│   │   └── motion.ts
│   │
│   ├── pipeline/
│   │   ├── validate.ts
│   │   ├── planScenes.ts
│   │   ├── resolveAssets.ts
│   │   ├── buildProps.ts
│   │   └── qa.ts
│   │
│   ├── tts/
│   │   ├── ttsClient.ts
│   │   ├── durationSync.ts
│   │   └── subtitleGen.ts
│   │
│   └── Root.tsx
│
├── content/
│   └── books/
│       └── example-book.json
│
├── assets/
│   ├── icons/
│   ├── textures/
│   ├── covers/
│   ├── photos/
│   └── sounds/
│
├── scripts/
│   ├── new-book.ts         ← CLI: 새 책 콘텐츠 scaffold
│   ├── render-longform.ts  ← CLI: longform 렌더
│   ├── render-shorts.ts    ← CLI: shorts 렌더
│   ├── run-tts.ts          ← CLI: TTS 생성
│   └── validate-content.ts ← CLI: 콘텐츠 JSON 검증
│
├── remotion.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## CLI 명령 체계

```bash
# 새 책 콘텐츠 scaffold 생성
npm run new-book -- --title "책 제목" --author "저자" --genre business

# 콘텐츠 JSON 유효성 검증
npm run validate -- content/books/my-book.json

# TTS 음성 생성
npm run tts -- content/books/my-book.json

# 미리보기 (Remotion Studio)
npm run preview

# Longform 렌더
npm run render:longform -- --book my-book --out output/my-book-longform.mp4

# Shorts 렌더
npm run render:shorts -- --book my-book --scene keyInsight-01 --out output/short-01.mp4

# 전체 QA 체크
npm run qa -- output/my-book-longform.mp4
```

---

## Decision Log

| 결정 | 선택 | 이유 |
|------|------|------|
| Scene 단위 | layout archetype | scene list가 아니라 연속 캔버스 위 배치 |
| 포맷 분기 | format prop | 단일 코드베이스 유지 |
| 토큰 구조 | TS + JSON 병행 | Claude Code 파싱 + 런타임 참조 모두 지원 |
| TTS | Edge TTS (MVP) → ElevenLabs (풀) | 무료 시작, 품질 업그레이드 경로 확보 |
| 자막 | Remotion 자체 렌더 | 외부 의존 최소화 |
| 에셋 관리 | role-based manifest | scene 단위가 아닌 role 단위 재사용 |
| 장르 변주 | 토큰 오버라이드 1단계 | 시스템 붕괴 방지 |
| Fallback | 설계 단계에서 명시 | 런타임 crash 방지 |
