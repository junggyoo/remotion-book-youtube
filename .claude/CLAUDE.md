# CLAUDE.md — Editorial Signal DSGS

## 프로젝트 개요

한국어 책 요약 YouTube 채널용 Remotion 영상 자동화 시스템.
스택: React 18 + Remotion 4 + TypeScript 5 + Zod

## 절대 규칙

- Opening preset은 일반 경로에서 사용 금지 (fallback-only)
- 모든 synthesized scene에 fallbackPreset 필수
- custom blueprint는 design token / motion preset 범위 밖 금지
- SceneBlueprint는 mediaPlan(narration + caption + audio + asset) 포함 필수
- render 전에 validator 통과 필수
- 하드코딩 색상/폰트/spring config 금지
- accent 색상 씬당 최대 2개

## 빌드 명령

npm run preview # Remotion Studio 미리보기
npm run validate # content JSON 검증
npm run render:longform # longform 렌더
npm run render:shorts # shorts 렌더

## 파이프라인 순서 (반드시 이 순서)

1.BookAnalyzer → 2.NarrativePlanner → 3.OpeningComposer
→ 4.ScenePlanner → 5.GapDetector → 6.SceneSynthesizer
→ 6.3.BeatComposer → 6.5.AssetPlanner → 7.BlueprintValidator → 8.BlueprintRenderer
→ 9.ScenePromoter

## HITL 체크포인트 (review 모드)

A: Opening 승인 (3단계 후)
B: Signature Scene 승인 (6단계 후)
C: Final QA 승인 (8단계 후)

## Beat 시스템 규칙

- 8초+ 씬에는 beats 배열 필수
- beat.activates = UI 요소 키, beat.emphasisTargets = 자막 하이라이트 단어 (혼용 금지)
- beat 최소 duration: endRatio - startRatio >= 0.12
- beat 간 overlap 금지 (beat[n].endRatio === beat[n+1].startRatio)
- evidenceCard는 evidence-rubric.md A/B등급만 사용 (C등급 금지)
- BeatDesignRationale 구조화된 근거 필수 출력
- beat가 있는 씬은 BeatElement + useBeatTimeline으로 렌더링

## 비주얼 검증 워크플로우 (agent-browser + Playwright MCP)

구현 완료 후 비주얼 검증은 두 도구를 조합한다.

### 1단계: agent-browser — 일반 검증 (기본)

Remotion Studio(localhost:3000)가 에러 없이 로드되는지 자동 확인.

```bash
# Studio 로드 + 에러 체크
agent-browser open http://localhost:3000 && agent-browser wait --load networkidle
agent-browser snapshot -i                    # UI 요소 확인
agent-browser screenshot verify-studio.png   # 스크린샷 캡처

# 특정 씬으로 이동 (프레임 입력)
agent-browser snapshot -i                    # ref 획득
agent-browser click @eN                      # 프레임 카운터 클릭
agent-browser fill @eM "380"                 # 프레임 번호 입력
agent-browser press Enter
agent-browser screenshot scene-check.png     # 결과 캡처

# 변경 전후 비교
agent-browser screenshot before.png
# ... 코드 수정 후 새로고침 ...
agent-browser diff screenshot --baseline before.png
```

### 2단계: Playwright MCP — 정밀 검증 (보조)

Remotion Studio 내부 상태 검사, JS evaluate가 필요할 때 사용.

```
# 내부 상태 검사 (manifest 데이터, beat timing 등)
mcp: browser_evaluate → document.querySelector 등으로 런타임 값 확인
mcp: browser_console_messages → 에러/경고 확인
mcp: browser_take_screenshot → 특정 시점 시각 캡처
```

### 검증 체크리스트 (코드 수정 후)

1. `tsc --noEmit` + `npm run validate` 통과
2. `agent-browser open http://localhost:3000 && agent-browser wait --load networkidle` — Studio 로드 확인
3. `agent-browser snapshot -i` — 콘솔 에러 없음, 씬 목록 정상
4. beat 씬 프레임 이동 → `agent-browser screenshot` — 시각적 이상 없음
5. 문제 발견 시: 수정 → Studio 새로고침 → `agent-browser diff screenshot` — 수정 확인

### 도구 선택 기준

| 상황                            | 도구                                             |
| ------------------------------- | ------------------------------------------------ |
| 페이지 로드, 에러 체크, 기본 UI | agent-browser                                    |
| 스크린샷 비교 (전후 diff)       | agent-browser diff                               |
| JS 런타임 값 검사               | Playwright MCP (browser_evaluate)                |
| 특정 프레임 탐색 + 상호작용     | agent-browser (fill + press) 또는 Playwright MCP |
| 발견→수정→재검증 루프           | agent-browser (CLI 파이프라인)                   |

## 참조 (상세 내용은 skill 참조)

- 디자인 토큰: src/design/tokens/
- 모션 프리셋: src/design/tokens/motion-presets.json
- 씬 카탈로그: src/schema/scene-catalog.json
- DSGS 정규 스펙: docs/DSGS_CANONICAL_SPEC_v1.md
- 오케스트레이션: docs/DSGS_CLAUDE_CODE_ORCHESTRATION.md
- Beat 시스템 설계: docs/BEAT_SYSTEM_DESIGN_SPEC_v0.2.md
- Beat Composer Agent/Skill: docs/BEAT_COMPOSER_AGENT_SKILL_DESIGN_v0.2.md
