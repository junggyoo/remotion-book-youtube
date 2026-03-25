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

## 비주얼 검증 워크플로우 (cmux + agent-browser + Playwright MCP)

3계층 구조: cmux 내장 브라우저(눈) + agent-browser(손) + Playwright MCP(현미경).

### 환경 설정

cmux 분할 패널에서 내장 브라우저로 localhost:3000을 열어 실시간 모니터링.
agent-browser와 Playwright MCP는 같은 페이지를 자동화로 제어.

### 역할 분담

| 역할               | 도구               | 용도                                              |
| ------------------ | ------------------ | ------------------------------------------------- |
| 눈 (실시간 모니터) | cmux 내장 브라우저 | localhost:3000 실시간 표시, 시각적 이상 즉시 발견 |
| 손 (자동화)        | agent-browser      | 스냅샷, 프레임 이동, 스크린샷 diff, 폼 입력       |
| 현미경 (정밀 검사) | Playwright MCP     | JS evaluate, 런타임 값 검사, 콘솔 에러 확인       |

### agent-browser 명령 예시

```bash
# Studio 로드 + 에러 체크
agent-browser open http://localhost:3000 && agent-browser wait --load networkidle
agent-browser snapshot -i                    # UI 요소 확인
agent-browser screenshot verify-studio.png   # 스크린샷 캡처

# 특정 프레임으로 이동
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

### Playwright MCP 사용 시점

```
# JS 런타임 값 검사 (manifest 데이터, beat timing 등)
mcp: browser_evaluate → document.querySelector 등으로 내부 상태 확인
mcp: browser_console_messages → 에러/경고 수집
mcp: browser_take_screenshot → 특정 시점 정밀 캡처
```

### 검증 체크리스트 (코드 수정 후)

1. `tsc --noEmit` + `npm run validate` 통과
2. cmux 내장 브라우저에서 localhost:3000 실시간 확인
3. `agent-browser open + wait --load networkidle` — Studio 로드 정상
4. `agent-browser snapshot -i` — 씬 목록 정상, 에러 없음
5. beat 씬 프레임 이동 → `agent-browser screenshot` + cmux 브라우저로 시각 확인
6. 문제 발견 시: 수정 → `agent-browser diff screenshot` — 변경 확인

## 참조 (상세 내용은 skill 참조)

- 디자인 토큰: src/design/tokens/
- 모션 프리셋: src/design/tokens/motion-presets.json
- 씬 카탈로그: src/schema/scene-catalog.json
- DSGS 정규 스펙: docs/DSGS_CANONICAL_SPEC_v1.md
- 오케스트레이션: docs/DSGS_CLAUDE_CODE_ORCHESTRATION.md
- Beat 시스템 설계: docs/BEAT_SYSTEM_DESIGN_SPEC_v0.2.md
- Beat Composer Agent/Skill: docs/BEAT_COMPOSER_AGENT_SKILL_DESIGN_v0.2.md
