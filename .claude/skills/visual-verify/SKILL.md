---
name: visual-verify
description: >
  구현 완료 후 Remotion Studio 비주얼 검증을 수행한다.
  3계층 구조: cmux 내장 브라우저(눈) + agent-browser(손) + Playwright MCP(현미경).
  "검증", "비주얼 확인", "렌더 확인", "studio 확인", "visual verify" 등에 자동 활성화.
context: main
metadata:
  filePattern:
    - "**/compositions/**"
    - "**/components/hud/**"
    - "**/scenes/**"
  bashPattern:
    - "remotion studio"
    - "npm run preview"
    - "agent-browser"
---

# Visual Verify — 3계층 비주얼 검증

## 역할 분담

| 역할               | 도구               | 용도                                              |
| ------------------ | ------------------ | ------------------------------------------------- |
| 눈 (실시간 모니터) | cmux 내장 브라우저 | localhost:3000 실시간 표시, 시각적 이상 즉시 발견 |
| 손 (자동화)        | agent-browser      | 스냅샷, 프레임 이동, 스크린샷 diff, 폼 입력       |
| 현미경 (정밀 검사) | Playwright MCP     | JS evaluate, 런타임 값 검사, 콘솔 에러 확인       |

## 전제 조건

- Remotion Studio가 실행 중 (`npx remotion studio` 또는 `npm run preview`)
- cmux 분할 패널에서 내장 브라우저로 localhost:3000 열기
- agent-browser 설치됨 (`npm i -g agent-browser`)

## 검증 순서

### Phase 1: 정적 검증 (코드 레벨)

```bash
tsc --noEmit              # 타입 에러 없음
npm run validate -- content/books/{book}.json   # 콘텐츠 검증 통과
```

### Phase 2: Studio 로드 검증 (agent-browser)

```bash
# Studio 접속 + 네트워크 안정 대기
agent-browser open http://localhost:3000 && agent-browser wait --load networkidle

# UI 요소 스냅샷 — 씬 목록, 타임라인 정상 확인
agent-browser snapshot -i

# 스크린샷 캡처
agent-browser screenshot studio-load.png
```

**확인 사항:**

- 씬 목록이 왼쪽 사이드바에 표시되는가
- 타임라인에 모든 씬이 나열되는가
- 콘솔 에러 없음 (Playwright MCP `browser_console_messages` 보조)

### Phase 3: 씬별 검증 (프레임 이동)

```bash
# 프레임 카운터 클릭 → 원하는 프레임 입력
agent-browser snapshot -i              # ref 획득
agent-browser click @eN                # 프레임 카운터 버튼 클릭
agent-browser fill @eM "{frame}"       # 프레임 번호 입력
agent-browser press Enter
agent-browser screenshot scene-{id}.png
```

**beat 씬 검증 포인트:**

- beat 전환 시 UI 요소 등장/퇴장이 자연스러운가
- emphasisTargets 키워드가 자막에서 signal 색상으로 하이라이트되는가
- beat 경계에서 타이밍이 TTS 오디오와 동기화되는가

**non-beat 씬 검증 포인트:**

- 기존과 동일하게 렌더링되는가
- 자막/오디오 동기화가 정상인가

### Phase 4: 변경 전후 비교 (diff)

```bash
# 수정 전 기준선 캡처
agent-browser screenshot before.png

# ... 코드 수정 ...

# 수정 후 비교
agent-browser open http://localhost:3000 && agent-browser wait --load networkidle
agent-browser diff screenshot --baseline before.png
```

mismatch percentage가 0%에 가까우면 회귀 없음.

### Phase 5: 정밀 검사 (필요시 — Playwright MCP)

JS 런타임 값 검사가 필요할 때만 사용:

```
# manifest에서 beatTimings 존재 확인
mcp: browser_evaluate → fetch manifest.json → beatTimings 필드 검사

# 콘솔 에러/경고 수집
mcp: browser_console_messages(level: "error")

# 특정 DOM 요소 스타일 검사 (color, font 등)
mcp: browser_evaluate → getComputedStyle 등
```

## 도구 선택 가이드

| 상황                        | 도구                                      |
| --------------------------- | ----------------------------------------- |
| 페이지 로드, 기본 UI 확인   | agent-browser                             |
| 스크린샷 전후 비교          | agent-browser diff                        |
| 실시간 시각적 모니터링      | cmux 내장 브라우저                        |
| JS 런타임 값 검사           | Playwright MCP (browser_evaluate)         |
| 콘솔 에러 확인              | Playwright MCP (browser_console_messages) |
| 프레임 단위 탐색 + 상호작용 | agent-browser (fill + press)              |
| 발견→수정→재검증 루프       | agent-browser CLI 파이프라인              |

## 자주 쓰는 프레임 위치 (miracle-morning 기준)

| 씬              | 타임라인 이름              | beats   |
| --------------- | -------------------------- | ------- |
| intro-01        | (확인 필요)                | 2 beats |
| framework-01    | framework-framework-01     | 6 beats |
| insight-silence | highlight-highlight-01     | 3 beats |
| compare-01      | compareContrast-compare-01 | 3 beats |

프레임 번호는 manifest.json의 durationFrames 누적으로 계산.
