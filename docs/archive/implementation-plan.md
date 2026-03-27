# Editorial Signal — Implementation Plan
**Version:** 1.0.0  
**Goal:** MVP로 첫 번째 실제 영상 출력까지의 최단 경로

---

## 단계별 빌드 순서

### Phase 0 — 기반 설정 (Day 1)
프로젝트 초기 설정. 이 단계 없이 이후 단계 진행 불가.

```bash
# 1. Remotion 프로젝트 초기화
npx create-video@latest editorial-signal --template blank

# 2. TypeScript + ESLint 설정
# tsconfig.json — strict mode on
# .eslintrc — no hardcoded hex colors rule

# 3. 폴더 구조 생성
mkdir -p src/{design/tokens,design/themes,components/{primitives,layout,motion,hud},scenes,compositions,schema,types,pipeline,tts}
mkdir -p content/books assets/{icons,textures,covers,sounds} scripts

# 4. 패키지 설치
npm install @remotion/player @remotion/renderer
npm install -D zod     # schema validation
```

**산출물:**
- [ ] 프로젝트 폴더 초기화
- [ ] `tsconfig.json` strict 설정
- [ ] `remotion.config.ts` 기본 설정

---

### Phase 1 — 토큰 & 테마 시스템 (Day 1~2)
모든 컴포넌트가 이 토큰을 참조한다. 먼저 만들어야 하드코딩을 막을 수 있다.

**파일 목록:**
```
src/design/tokens/colors.ts
src/design/tokens/typography.ts
src/design/tokens/spacing.ts
src/design/tokens/motion.ts
src/design/tokens/layout.ts
src/design/tokens/zIndex.ts
src/design/tokens/index.ts
src/design/themes/useTheme.ts
src/design/themes/useFormat.ts
```

**검증 기준:**
- [ ] 모든 토큰에 타입 명시
- [ ] `useTheme('dark', 'psychology')` → 올바른 컬러 반환 확인
- [ ] `useFormat('shorts')` → shorts safeArea 반환 확인

---

### Phase 2 — 프리미티브 컴포넌트 (Day 2~3)
씬 컴포넌트의 원자 단위. 토큰 없이 만들면 나중에 전부 리팩토링해야 한다.

**우선 제작 (MVP에서 필수):**
```
src/components/primitives/TextBlock.tsx      ← 헤드라인 / 바디 / 캡션
src/components/primitives/LabelChip.tsx      ← 챕터 라벨, 장르 태그
src/components/primitives/DividerLine.tsx    ← 수평/수직 구분선
src/components/primitives/SignalBar.tsx      ← cobalt 시그널 바
src/components/primitives/QuoteBlock.tsx     ← 인용문 래퍼
src/components/primitives/Counter.tsx        ← 숫자 카운트업
src/components/primitives/ImageMask.tsx      ← 책 표지 / 사진 프레임
src/components/primitives/IconWrapper.tsx    ← fallback 포함 아이콘 래퍼
```

**나중에 추가 (풀 프로덕션):**
```
src/components/primitives/PathConnector.tsx
src/components/primitives/CoverFrame.tsx
```

**각 컴포넌트 필수 지원:**
- `format: FormatKey` prop (longform / shorts 분기)
- `theme: Theme` prop (토큰 연결)
- enter / exit animation (선택)
- fallback 처리

---

### Phase 3 — 레이아웃 & 모션 컴포넌트 (Day 3~4)

```
src/components/layout/CanvasWrapper.tsx      ← 전체 캔버스 컨테이너
src/components/layout/BackgroundLayer.tsx    ← 배경 + 텍스처
src/components/layout/SafeArea.tsx           ← format별 safe zone 래퍼
src/components/layout/SplitPanel.tsx         ← split-compare 레이아웃

src/components/motion/ArchitecturalReveal.tsx← mask 기반 타이포 등장
src/components/motion/StaggerContainer.tsx   ← 순차 등장 래퍼
src/components/motion/ContinuousPan.tsx      ← 캔버스 pan 제어
src/components/motion/GridSplitWipe.tsx      ← 분할 전환
src/components/motion/DynamicCounter.tsx     ← 카운트업 애니메이션

src/components/hud/SubtitleLayer.tsx         ← 자막 렌더
```

---

### Phase 4 — 씬 컴포넌트 MVP 3종 (Day 4~5)
커버 + 키인사이트 + 클로징만 먼저 만들면 최소 1개 완성 영상 가능.

```
src/scenes/CoverScene.tsx           ← 1순위
src/scenes/KeyInsightScene.tsx      ← 1순위
src/scenes/ClosingScene.tsx         ← 1순위
```

**이후 추가 (우선순위 순):**
```
src/scenes/ChapterDividerScene.tsx  ← 2순위
src/scenes/QuoteScene.tsx           ← 2순위
src/scenes/FrameworkScene.tsx       ← 3순위
src/scenes/CompareContrastScene.tsx ← 3순위
src/scenes/ApplicationScene.tsx     ← 4순위
src/scenes/DataScene.tsx            ← 4순위
```

---

### Phase 5 — 콘텐츠 파이프라인 (Day 5~7)
데이터만 바꾸면 새 영상이 나오는 구조의 핵심.

```
src/types/index.ts                  ← (Phase 0에서 이미 생성)
src/pipeline/validate.ts            ← Zod schema validation
src/pipeline/planScenes.ts          ← BookContent → ScenePlan[]
src/pipeline/resolveAssets.ts       ← asset 존재 확인 + fallback
src/pipeline/buildProps.ts          ← ScenePlan → Remotion props
src/pipeline/qa.ts                  ← 렌더 후 QA 체크
```

**validate.ts 핵심 체크:**
```typescript
// Zod schema from content-schema.json
const checks = [
  scenes[0].type === 'cover',
  scenes[scenes.length - 1].type === 'closing',
  scenes.length >= 3,
  every headline <= 60 chars,
  every frameworkItems.length <= 5,
]
```

---

### Phase 6 — TTS 파이프라인 (Day 7~8)

```
src/tts/ttsClient.ts     ← edge-tts wrapper (MVP) / ElevenLabs (풀)
src/tts/durationSync.ts  ← TTS duration → durationFrames 변환
src/tts/subtitleGen.ts   ← .srt / .vtt 생성
```

**TTS-Duration 처리 규칙:**
```
TTS duration ≤ scene default    → scene default 사용
TTS duration > scene default    → scene을 TTS duration + 15f로 연장
TTS duration > scene default + 60f → 경고 + 수동 확인 요청
TTS 실패                        → silent mode + 자막만
```

---

### Phase 7 — Composition & CLI (Day 8~9)

```
src/compositions/LongformComposition.tsx
src/compositions/ShortsComposition.tsx
src/Root.tsx

scripts/validate-content.ts
scripts/run-tts.ts
scripts/render-longform.ts
scripts/render-shorts.ts
scripts/new-book.ts
```

**package.json scripts:**
```json
{
  "scripts": {
    "preview": "npx remotion studio",
    "validate": "ts-node scripts/validate-content.ts",
    "tts": "ts-node scripts/run-tts.ts",
    "render:longform": "ts-node scripts/render-longform.ts",
    "render:shorts": "ts-node scripts/render-shorts.ts",
    "new-book": "ts-node scripts/new-book.ts"
  }
}
```

---

### Phase 8 — 첫 번째 실제 영상 (Day 9~10)

1. `content/books/test-book.json` 작성 (간단한 책 1권, 씬 5~7개)
2. `npm run validate -- content/books/test-book.json`
3. `npm run tts -- content/books/test-book.json`
4. `npm run preview` → Remotion Studio에서 확인
5. `npm run render:longform -- --book test-book`
6. QA 체크리스트 통과 확인

---

## Fallback 구현 체크리스트

| 실패 상황 | 구현 위치 | 처리 방법 |
|-----------|-----------|-----------|
| 이미지 누락 | `ImageMask.tsx` | `onError` → `placeholder-rect` with `semantic.surfaceMuted` |
| 폰트 로딩 실패 | `typography.ts` | fontFamily fallback chain: `Pretendard → Inter → system-ui → sans-serif` |
| TTS 실패 | `ttsClient.ts` | silent mode flag → `SubtitleLayer` only |
| 텍스트 오버플로 | `TextBlock.tsx` | font-size 1단계 축소 → 최소 `bodyS`까지. 이후 말줄임표 |
| 아이콘 누락 | `IconWrapper.tsx` | `onError` → 컨테이너 `visibility: hidden` |
| 렌더 실패 | `render-longform.ts` | 3회 재시도 → FAIL_FAST (process.exit(1)) + render-errors.log |
| 자막 오버플로 | `subtitleGen.ts` | 강제 줄바꿈 28자 / 최대 2줄 |

---

## 실제 생성해야 할 파일 전체 목록 (27개)

```
# Phase 0
remotion.config.ts
tsconfig.json
package.json

# Phase 1 — Tokens
src/design/tokens/colors.ts
src/design/tokens/typography.ts
src/design/tokens/spacing.ts
src/design/tokens/motion.ts
src/design/tokens/layout.ts
src/design/tokens/zIndex.ts
src/design/tokens/index.ts
src/design/themes/useTheme.ts
src/design/themes/useFormat.ts

# Phase 2~3 — Components (필수 8개)
src/components/primitives/TextBlock.tsx
src/components/primitives/LabelChip.tsx
src/components/primitives/DividerLine.tsx
src/components/primitives/SignalBar.tsx
src/components/primitives/QuoteBlock.tsx
src/components/primitives/Counter.tsx
src/components/primitives/ImageMask.tsx
src/components/layout/SafeArea.tsx
src/components/motion/ArchitecturalReveal.tsx
src/components/motion/StaggerContainer.tsx
src/components/hud/SubtitleLayer.tsx

# Phase 4 — Scenes (MVP 3종)
src/scenes/CoverScene.tsx
src/scenes/KeyInsightScene.tsx
src/scenes/ClosingScene.tsx

# Phase 5~7
src/types/index.ts
src/pipeline/validate.ts
src/pipeline/planScenes.ts
src/pipeline/buildProps.ts
src/tts/ttsClient.ts
src/tts/durationSync.ts
src/compositions/LongformComposition.tsx
src/Root.tsx

# Content
content/books/test-book.json
```

---

## Claude Code 핸드오프 지시문

```
이 implementation-plan.md와 함께 전달된 파일들을 단일 소스 오브 트루스로 사용해서
Editorial Signal Remotion 프로젝트를 생성해줘.

참조 파일:
- architecture.md          ← 시스템 4계층 설계
- types/index.ts           ← 모든 TypeScript 타입
- schema/scene-catalog.json      ← 씬 시스템 규격
- schema/content-schema.json     ← 콘텐츠 JSON 스키마
- schema/asset-manifest.json     ← 에셋 목록 및 규칙
- docs/motion-presets.json       ← 모션 프리셋 (별도 전달)
- docs/design-tokens-draft.json  ← 디자인 토큰 초안 (별도 전달)

구현 규칙:
1. Phase 0 → Phase 1 → Phase 2 순서로 진행
2. 모든 색상/간격/모션은 tokens/ 에서만 참조. 하드코딩 금지.
3. 모든 씬 컴포넌트는 format prop(longform/shorts)을 받아야 함
4. 모든 에셋에 fallback 처리 포함
5. 불확실한 부분은 TODO 주석으로 표시하고 가장 안전한 버전 구현
6. Phase 4까지 완료 후 test-book.json으로 preview 가능한 상태 목표
```
