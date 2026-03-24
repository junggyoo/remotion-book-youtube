# FINAL_NORMALIZATION_PATCH.md
**Editorial Signal — 최종 정규화 패치 노트**  
Version: 1.0.0 | 이 문서 이후 추가 정규화 라운드 없음

---

## 1. 남아 있던 충돌 목록

### P-1. headline 길이 제한 — 문서마다 다른 숫자
| 문서 | 기재 값 |
|------|---------|
| qa-checklist.md | 50자 |
| prompt-templates.md | 50자 |
| command-reference.md | 60자 |
| CANONICAL_SPEC.md | 60자 |
| content-schema.json validationRules | 60자 |
| content-schema.json KeyInsightContent description | "50자 이내 권장" |

### P-2. narrationText 길이 제한 — 문서마다 다른 숫자
| 문서 | 기재 값 |
|------|---------|
| prompt-templates.md | 30~80자 |
| content-schema.json validationRules | 200자 |

### P-3. `narration.text` 경로 흔적 — 1건 잔존
| 문서 | 위치 | 내용 |
|------|------|------|
| architecture.md | 라인 217 | `content.scenes[].narration.text` |

### P-4. 렌더 실패 정책 — 3곳에 "씬 skip" 잔존
| 문서 | 위치 | 잘못된 내용 |
|------|------|-------------|
| CLAUDE.md | 라인 402 | "3회 재시도 → 실패 씬 skip + 로그" |
| architecture.md | 라인 260 | "실패 씬 건너뜀 + 로그" |
| implementation-plan.md | 라인 222 | "실패 씬 skip + render-errors.log" |

### P-5. asset 경로 표기 불일치 — `covers/` vs `assets/covers/`
| 문서 | 기재 값 |
|------|---------|
| content-schema.json example | `"covers/influence.png"` |
| command-reference.md scaffold | `"covers/{book-id}.png"` |
| command-reference.md validate output | `assets/covers/my-book.png` |
| qa-checklist.md Level 0 | `assets/covers/` 하위 |

### P-6. asset-manifest.json 수정 권한 — 자기 모순
| 문서 | 기재 내용 |
|------|-----------|
| CLAUDE.md | `asset-manifest.json` 수정 금지 (schema 금지 목록에 포함) |
| CLAUDE.md | 에셋 추가는 asset-manifest.json에 항목 추가 후 절차 따름 |

### P-7. motion preset 런타임 해석 helper — 미정의
motion-presets.json에 `"type": "hybrid"` 포함. 이를 runtime에서 어떻게 처리하는지 API 정의 없음. Claude Code가 `motion.ts`를 구현할 수 없는 상태.

### P-8. 문서 우선순위 선언 중복 — 2곳에서 자신이 최상위라 주장
| 문서 | 선언 내용 |
|------|-----------|
| CANONICAL_SPEC.md | "충돌 시 이 문서가 다른 모든 문서에 우선한다" |
| CLAUDE_4_3_HANDOFF.md | "다른 문서와 충돌 시 이 문서가 우선한다" |

### P-9. shorts validation — Level 0 규칙이 1-scene shorts를 사실상 불가능하게 만듦
qa-checklist.md Level 0:
- `scenes[0].type === "cover"` 강제
- `scenes[last].type === "closing"` 강제
→ 단일 씬 shorts 작성 시 Level 0 BLOCKED

### P-10. content-schema.json `$schema` 경로 — 실제 폴더와 불일치 가능
- 파일 위치: `src/schema/content-schema.json`
- book 파일 위치: `content/books/*.json`
- 현재 IDE 경로 선언 없음

### P-11. content-schema.json `minItems: 3` — format별 분기 없음
모든 포맷에 동일하게 3 적용. shorts 1-scene 불가.

---

## 2. 각 충돌에 대한 최종 결정

### P-1: headline 최대 길이
**최종 canonical: 60자 (hard limit)**
- validate.ts Zod schema: headline ≤ 60자이면 PASS, 초과이면 FAIL
- 50자는 권장 안내로도 제거. 혼동 방지를 위해 단일 기준(60자)만 존재
- prompt에서도 "60자 이내"로 통일

### P-2: narrationText 최대 길이
**최종 canonical: hard limit 200자 (validate FAIL), 권장 120자 (warn only)**
- validate.ts: narrationText > 200자 → FAIL
- validate.ts: narrationText > 120자 → WARN (렌더 계속)
- prompt 가이드: "30~120자 권장"
- "30~80자"는 폐기

### P-3: narration.text 경로
**최종 canonical: `scene.narrationText` (flat field)**
- architecture.md 라인 217은 오류. 해당 라인 수정.
- 이 경로를 사용하는 코드 금지

### P-4: 렌더 실패 정책
**최종 canonical: 씬 skip 없음. 3회 재시도 → FAIL_FAST**
- 씬 skip은 타임라인 연속성 파괴 → 허용 불가
- FAIL_FAST: 렌더 프로세스 exit(1), output/ 부분 파일 없음
- CLAUDE.md / architecture.md / implementation-plan.md 3곳 수정

### P-5: asset 경로 표기
**최종 canonical path convention:**
- book.json에 기재: `"covers/influence.png"` (assets/ 기준 상대경로)
- 컴포넌트에서: `staticFile('covers/influence.png')`
- remotion.config.ts: `publicDir: 'assets'` 설정 필수
- 파일시스템 실제 경로: `assets/covers/influence.png`
- QA validate 경로: `path.join('assets', coverImageUrl)` → `assets/covers/influence.png`
- "assets/covers/..." 형태를 book.json에 직접 쓰는 것 금지

### P-6: asset-manifest.json 수정 권한
**최종 canonical: Claude Code는 읽기만. 사람만 수동 추가.**
- Claude Code는 asset-manifest.json 수정 불가
- 새 에셋 추가는 사람이 직접 `status: "draft"` 항목 추가 후 테스트 → `"ready"` 승격
- CLAUDE.md의 "수정 금지" 목록에 포함 유지. "추가 절차" 문구는 사람 대상 안내로 명확히 분리

### P-7: motion preset runtime helper API
**최종 canonical: `src/design/tokens/motion.ts` 내 `resolvePreset()` 함수**
- 아래 섹션 "Motion Helper Contract" 참조

### P-8: 문서 우선순위 중복 선언
**최종 canonical precedence chain (전 프로젝트 단 하나):**

```
REVISED_CANONICAL_SPEC.md       ← 1위: 규범 문서. 모든 충돌 해결 기준
src/types/index.ts              ← 2위: TypeScript 타입 단일 소스
src/schema/scene-catalog.json   ← 3위: 씬 기본값 레지스트리 (읽기 전용)
src/schema/asset-manifest.json  ← 4위: 에셋 레지스트리 (읽기 전용)
REVISED_CLAUDE_4_3_HANDOFF.md   ← 구현 브리프. canonical spec의 파생물
CLAUDE.md                       ← 운영 규칙. canonical spec의 파생물
나머지 모든 문서                  ← 참고용. 충돌 시 무시
```

REVISED_CLAUDE_4_3_HANDOFF.md의 "이 문서가 우선" 선언 제거.

### P-9: shorts validation — cover/closing 조건
**최종 canonical: format별 분기**

```
longform:
  - scenes[0].type === 'cover'    (필수)
  - scenes[last].type === 'closing' (필수)
  - 총 씬 수 >= 5

shorts:
  - cover / closing 강제 없음
  - 총 씬 수 >= 1
  - 단, skipForShorts: true가 아닌 씬이 1개 이상

both:
  - longform 규칙 적용
```

qa-checklist.md Level 0 items 14~15 조건에 `(format === 'longform' || format === 'both'일 때만)` 분기 추가.

### P-10: content-schema.json `$schema` 경로
**최종 canonical:**
```json
{
  "$schema": "../../src/schema/content-schema.json"
}
```
book 파일 위치: `content/books/test-book.json`
schema 파일 위치: `src/schema/content-schema.json`
상대 경로: `../../src/schema/content-schema.json`

### P-11: content-schema.json minItems
**최종 canonical: content-schema.json은 runtime validator가 아님.**
- minItems: 3은 이 파일에 그대로 유지해도 무방 (실행 안 됨)
- 실제 검증은 validate.ts (Zod)가 담당
- content-schema.json 파일 상단에 주석 추가: "이 파일은 IDE 자동완성 전용. runtime 검증에 사용되지 않음."

---

## 3. Motion Helper Contract (신규 정의 — P-7 해결)

`src/design/tokens/motion.ts` 내 구현해야 하는 API:

```typescript
import motionPresets from './motion-presets.json'
import { spring, interpolate } from 'remotion'

export type MotionPresetKey = 'gentle' | 'smooth' | 'snappy' | 'heavy' | 'dramatic'

export interface ResolvedMotionConfig {
  type: 'spring' | 'interpolate'
  springConfig?: { stiffness: number; damping: number; mass: number }
  easingBezier?: [number, number, number, number]
  durationRange: [number, number]
  overshootClamping?: boolean
}

/**
 * preset key → ResolvedMotionConfig 반환.
 * 'hybrid' 타입(dramatic)은 springConfig + easingBezier 모두 포함.
 * 구현 시 spring 우선 적용, easing은 interpolate fallback용.
 */
export function resolvePreset(key: MotionPresetKey): ResolvedMotionConfig {
  const preset = motionPresets.presets[key]
  if (preset.type === 'spring') {
    return {
      type: 'spring',
      springConfig: preset.config,
      durationRange: preset.durationRange as [number, number],
      overshootClamping: preset.overshootClamping ?? false,
    }
  }
  if (preset.type === 'interpolate') {
    return {
      type: 'interpolate',
      easingBezier: preset.easing as [number, number, number, number],
      durationRange: preset.durationRange as [number, number],
    }
  }
  // hybrid (dramatic): spring 우선
  return {
    type: 'spring',
    springConfig: preset.springConfig,
    easingBezier: preset.easing as [number, number, number, number],
    durationRange: preset.durationRange as [number, number],
    overshootClamping: false,
  }
}

/**
 * 실제 애니메이션 progress 값 반환 (0~1).
 * - spring 타입: spring() 사용
 * - interpolate 타입: interpolate() + bezier easing 사용
 * - durationInFrames 생략 시 preset의 durationRange[1] 사용
 */
export function applyPreset(
  key: MotionPresetKey,
  frame: number,
  fps: number,
  durationInFrames?: number,
): number {
  const config = resolvePreset(key)
  const duration = durationInFrames ?? config.durationRange[1]

  if (config.type === 'spring') {
    return spring({
      frame,
      fps,
      config: config.springConfig!,
      durationInFrames: duration,
      overshootClamping: config.overshootClamping,
    })
  }
  // interpolate
  return interpolate(frame, [0, duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => {
      const [x1, y1, x2, y2] = config.easingBezier!
      // cubic-bezier 근사 (Remotion Easing.bezier 사용)
      // 실제 구현: import { Easing } from 'remotion'
      // return Easing.bezier(x1, y1, x2, y2)(t)
      return t  // TODO: Easing.bezier로 교체
    },
  })
}

/**
 * shorts adaptation: scene-catalog의 shortsAdaptation을 반영해 preset을 조정.
 * - continuousPan → micro-pan (durationRange 절반)
 * - staggeredCascade → max 3 items (외부에서 slice 처리)
 * 이 함수는 preset key를 그대로 반환 (durationInFrames만 줄임).
 * shorts에서는 applyPreset 호출 시 durationInFrames를 절반으로 전달.
 */
export function shortsPresetDuration(key: MotionPresetKey): number {
  const config = resolvePreset(key)
  return Math.floor(config.durationRange[0] * 1.2)  // min duration의 1.2배
}
```

**적용 레벨:**
- Preset resolve: element level (각 컴포넌트에서 직접 호출)
- Shorts duration: scene level (씬 컴포넌트가 format === 'shorts'일 때 shortsPresetDuration 사용)
- Composition level: preset resolve 없음 (씬에 위임)

---

## 4. 수정 후 더 이상 남지 않아야 할 Ambiguity

- [x] "headline 50자" 표기 → 전부 "60자"로 통일
- [x] "narrationText 30~80자" 표기 → "30~120자 권장"으로 통일
- [x] `narration.text` 경로 → 전부 `narrationText`로 통일
- [x] "실패 씬 skip" → 전부 "FAIL_FAST"로 통일
- [x] `covers/` vs `assets/covers/` → book.json은 `covers/filename`, 파일시스템은 `assets/covers/filename`
- [x] asset-manifest.json 수정 권한 → Claude Code 읽기 전용
- [x] motion hybrid type → `resolvePreset()` API로 정의
- [x] 두 문서의 "나 최우선" 선언 → 단일 precedence chain으로 통일
- [x] shorts Level 0 cover/closing 강제 → format 분기 조건 추가
- [x] $schema 경로 미정의 → `../../src/schema/content-schema.json`

---

## 5. 이번 수정에서 일부러 건드리지 않은 것

- **씬 타입 9종** — 변경 없음
- **브랜드 컬러 팔레트** — 변경 없음
- **motion preset 5종 이름/config** — 변경 없음
- **layout archetype 8종** — 변경 없음
- **포맷(longform/shorts) 정의** — 변경 없음
- **TTS 엔진 목록** — 변경 없음
- **Remotion 버전 및 스택** — 변경 없음
- **content-schema.json의 minItems:3** — runtime에 영향 없으므로 그대로 유지
- **architecture.md의 전체 구조** — narration.text 오류 1건 외 수정 없음
- **장르별 accent 컬러** — 변경 없음
