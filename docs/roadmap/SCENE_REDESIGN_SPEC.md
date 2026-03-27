# 씬 컴포넌트 재설계 스펙 — P1.5 Visual Overhaul
## WLDO + 체인지그라운드 스타일 기반, Remotion 구현

> Date: 2026-03-27
> 선행 조건: P1 파이프라인 연결 수정 완료 (커밋 45d363a)
> 목표: "PPT 슬라이드"에서 "모션 그래픽 영상"으로 비주얼 전환

---

## 디자인 시스템 원칙 (모든 씬 공통)

### 1. 카드/박스 제거
텍스트를 사각형 컨테이너 안에 가두지 않는다.
텍스트는 화면 전체를 캔버스로 사용한다.
반투명 카드 배경은 제거하고, 텍스트 가독성은 배경 딤 + 텍스트 shadow로 확보.

### 2. 타이포그래피 3단계 계층
```
headlineXL: 64~80px, weight 800, 화면의 주인공
headlineM:  36~44px, weight 700, 보조 설명
bodyM:      20~24px, weight 400, 세부 텍스트/자막
```
한 씬에서 이 3단계가 명확히 구분되어야 한다.
현재 문제: headline과 body의 크기 차이가 너무 작아서 계층이 안 보임.

### 3. 1씬 1accent 규칙
한 씬에서 accent 색상은 딱 1개 요소에만 적용.
- 핵심 키워드 1개 = accent 색
- 나머지 텍스트 = 흰색 또는 회색
- 동시에 여러 요소가 accent이면 시선이 분산됨

### 4. 단어/구절 단위 stagger
텍스트가 한 번에 나타나지 않는다.
- headline: 단어별 0.1초 간격 순차 등장
- 등장 방식: opacity 0→1 + translateY 20px→0px
- easing: spring (stiffness: 80, damping: 12)

### 5. 배경 시스템
```
base:     #0A0A0F (거의 순수 블랙)
surface:  #111318 (카드 대체용 미세 영역 구분)
gradient: 씬별 accent 색이 극미량 섞인 radial gradient (opacity 0.08~0.15)
```
SceneWrapper가 씬별 accent 기반 subtle gradient를 렌더.
art direction의 palette.primary가 gradient에 반영됨.

### 6. 요소 등장 방향성
모든 요소는 방향을 가지고 등장한다:
- headline: 아래→위 (translateY: 30→0)
- support text: 아래→위 (headline보다 0.3초 늦게)
- 좌측 요소: 왼→오 (translateX: -40→0)
- 우측 요소: 오→왼 (translateX: 40→0)
- accent 장식: scale 0→1 (spring)

갑자기 "뿅" 나타나는 것 금지. linear easing 금지.

### 7. 빈 공간은 의도적
화면의 30~40%는 비워둔다. 빈 공간이 있어야:
- 시선이 텍스트로 집중됨
- "답답한 PPT" 느낌이 사라짐
- 나중에 실사 이미지 레이어 추가 시 공간 확보

---

## 씬별 재설계 상세

---

### 1. HookScene (HighlightScene 대체)

**현재 문제**: 사각형 카드 안에 텍스트. 정적. PPT 느낌.

**목표 레이아웃**:
```
┌─────────────────────────────────┐
│                                 │
│                                 │
│      [핵심 문구]                │  ← headlineXL, 64~80px
│      accent 색 키워드            │     화면 중앙~좌상단
│                                 │
│            [보조 설명]          │  ← bodyM, 20~24px
│                                 │     headline 아래 0.5초 후 등장
│                                 │
│                                 │
│   ┌─[자막 바]──────────────┐   │  ← 하단 고정
│   └────────────────────────┘   │
└─────────────────────────────────┘
```

**연출**:
1. 배경: accent 색 기반 미세 radial gradient (중앙 밝음)
2. headline 단어별 stagger (spring, 3프레임 간격)
3. accent 키워드만 색상 다름 + scale 1.05
4. support text는 headline 완전 등장 후 0.5초 뒤 fade-in
5. 하단 accent underline이 왼→오로 draw-on

**Remotion 구현**:
```typescript
// 단어별 stagger 핵심 로직
words.map((word, i) => {
  const delay = i * 3; // 3프레임 간격
  const progress = spring({ frame: frame - delay, fps, config: { stiffness: 80, damping: 12 } });
  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const translateY = interpolate(progress, [0, 1], [30, 0]);
  return <span style={{ opacity, transform: `translateY(${translateY}px)` }}>{word}</span>;
});
```

**제거할 것**: 반투명 카드 배경, BeatElement의 기존 motion wrapper (KineticText가 대체)

---

### 2. KeyInsightScene

**현재 문제**: 작은 카드 안에 headline+support+evidenceCard가 빽빽. 답답함.

**목표 레이아웃**:
```
┌─────────────────────────────────┐
│  ── [accent bar]                │  ← 좌상단 짧은 수평선 (accent 색)
│                                 │
│  [headline]                     │  ← headlineXL, 화면 상단 40%
│  큰 글씨로 넓게                  │     좌측 정렬, 여백 충분
│                                 │
│  [support text]                 │  ← headlineM, 회색, headline 아래
│  작은 글씨                       │
│                                 │
│                                 │
│  ┌──────────────────────────┐  │
│  │ [evidence card]          │  │  ← 하단에 accent 배경 바
│  │ 수치/출처 한 줄           │  │     카드가 아니라 full-width 바
│  └──────────────────────────┘  │
│                                 │
│   ┌─[자막 바]──────────────┐   │
│   └────────────────────────┘   │
└─────────────────────────────────┘
```

**연출**:
1. accent bar가 먼저 왼→오 draw-on (0.3초)
2. headline 단어별 stagger 등장 (0.5초)
3. underlineKeyword만 accent 색
4. support text fade-in (headline 후 0.3초)
5. evidence bar가 하단에서 slide-up (support 후 0.5초)

**핵심 변경**:
- 카드 컨테이너 제거
- headline 크기 대폭 확대 (현재 ~40px → 64px)
- evidence는 별도 카드가 아니라 하단 full-width 바
- 화면의 40%는 빈 공간

---

### 3. FrameworkScene

**현재 문제**: 그리드 배치는 OK, 현재 항목 강조 없음.

**목표 레이아웃**:
```
[프레임워크 라벨]                    ← headlineM, accent 색
                                     
  ① [항목 1 제목]                   ← beat 등장 순서에 따라
     [설명]                            한 줄씩 아래로 쌓임

  ② [항목 2 제목]                   ← 현재 나레이션 중인 항목만
     [설명]                            accent 색 + 나머지 dim

  ③ [항목 3 제목]                    
     [설명]                          

  ④ [항목 4 제목]                    
     [설명]                          
```

**연출**:
1. 프레임워크 라벨이 먼저 등장 (accent 색)
2. 각 항목이 나레이션 타이밍에 맞춰 순차 등장 (위→아래)
3. 번호 원형(①②③)이 등장 시 scale 0→1 spring 효과
4. **현재 나레이션 중인 항목**: 전체 opacity 1.0, accent 색 번호
5. **이미 등장한 항목**: opacity 0.4로 dim
6. **아직 등장 안 한 항목**: 보이지 않음
7. 항목 간 연결선은 P2 (AnimatedPath)에서 추가

**핵심 변경**:
- 그리드(2x3)가 아니라 **수직 리스트** (위→아래)
- 현재 항목 강조 (나머지 dim)
- 번호 원형에 accent 색 + spring 등장

---

### 4. CompareContrastScene

**현재 문제**: 좌우 동시 등장, 레이아웃 깨짐, 카드 안에 갇힘.

**목표 레이아웃**:
```
Phase 1: 왼쪽만 등장
┌─────────────────────────────────┐
│                                 │
│  [wrong] 태그                   │ ← 빨간 계열 accent
│  ─────────────                  │
│  [왼쪽 라벨]                    │ ← headlineM
│  [왼쪽 내용]                    │ ← bodyM, 2~3줄
│                                 │
│           (오른쪽은 아직 없음)    │
│                                 │
└─────────────────────────────────┘

Phase 2: 분할선 등장 + 오른쪽 등장
┌────────────────┬────────────────┐
│                │                │
│  [wrong]       │  [right]       │ ← 초록 계열 accent
│  ──────        │  ──────        │
│  [왼쪽 라벨]   │  [오른쪽 라벨]  │
│  [왼쪽 내용]   │  [오른쪽 내용]  │
│                │                │
│  dim 처리      │  밝게 강조      │
│                │                │
└────────────────┴────────────────┘
```

**연출**:
1. 왼쪽이 먼저 slide-in from left (0.8초)
2. 나레이션이 왼쪽을 설명하는 동안 왼쪽만 보임
3. 중앙 분할선이 위→아래 draw-on (0.3초)
4. 오른쪽이 slide-in from right (0.8초)
5. 오른쪽 등장 시 왼쪽은 opacity 0.5로 dim
6. 색상 대비: wrong = 차가운 톤 (회색/빨강), right = 따뜻한 톤 (accent/초록)

**핵심 변경**:
- 동시 등장 → **순차 등장**
- 카드 제거, 분할선으로 구분
- 색상 대비로 wrong/right 즉시 인식

---

### 5. QuoteScene

**현재 문제**: 카드 안 인용구, 등장이 끊김.

**목표 레이아웃**:
```
┌─────────────────────────────────┐
│                                 │
│         ❝                       │  ← 대형 따옴표 (accent 색, 반투명)
│                                 │     scale 0→1 spring 등장
│    [인용 텍스트]                 │  ← headlineM~XL
│    단어별 순차 fade-in            │     화면 중앙, 넓게
│                                 │
│         ❞                       │
│                                 │
│           — [저자명]             │  ← bodyM, 인용 완료 후 fade-in
│                                 │
│   ┌─[자막 바]──────────────┐   │
│   └────────────────────────┘   │
└─────────────────────────────────┘
```

**연출**:
1. 배경이 미세하게 어두워짐 (spotlight 느낌)
2. 여는 따옴표 ❝가 scale 0→1 spring (0.3초)
3. 인용 텍스트가 줄 단위로 fade-in (줄당 0.5초 간격)
4. 핵심 단어만 accent 색
5. 닫는 따옴표 ❞ 등장 (0.2초)
6. 저자명이 마지막에 fade-in
7. 전체적으로 "고요하고 감성적인" 템포

**핵심 변경**:
- 카드 제거
- 따옴표가 장식이 아니라 씬의 시각적 앵커
- 줄 단위 등장 (단어 단위가 아님 — quote는 천천히)

---

### 6. CoverScene

**현재 문제**: 작은 카드에 제목/저자. 임팩트 없음.

**목표 레이아웃**:
```
┌─────────────────────────────────┐
│                                 │
│                                 │
│                                 │
│   [책 제목]                      │  ← headlineXL, 80px
│   ────────── (accent underline)  │     왼쪽 정렬 또는 중앙
│                                 │
│   [부제 또는 한 줄 소개]          │  ← headlineM, 회색
│                                 │
│   [저자명]                       │  ← bodyM, 밝은 회색
│                                 │
│   ── [브랜드 바] ──              │  ← accent 색 수평선
│                                 │
│   ┌─[자막 바]──────────────┐   │
│   └────────────────────────┘   │
└─────────────────────────────────┘
```

**연출**:
1. 배경: accent 색 기반 radial gradient (중앙에서 퍼짐)
2. 책 제목 단어별 stagger (spring)
3. accent underline이 왼→오 draw-on
4. 부제 fade-in (0.5초 후)
5. 저자명 fade-in (0.3초 후)
6. 하단 브랜드 바 slide-in

---

### 7. ClosingScene

**목표 레이아웃**:
```
┌─────────────────────────────────┐
│                                 │
│                                 │
│   [핵심 한 줄 메시지]            │  ← headlineXL
│                                 │     큰 글씨, 중앙
│                                 │
│   [CTA 텍스트]                   │  ← bodyM, 하단에서 slide-up
│   구독과 좋아요 ...              │
│                                 │
│   ── [accent bar] ──            │
│                                 │
└─────────────────────────────────┘
```

---

### 8. ChapterDividerScene

**목표**: 챕터 전환 시 숨 쉬는 순간.

```
┌─────────────────────────────────┐
│                                 │
│                                 │
│                                 │
│        [챕터 제목]               │  ← headlineXL, accent 색
│                                 │     scale 0.8→1 spring
│        ── (짧은 선) ──           │     중앙 정렬
│                                 │
│                                 │
│                                 │
└─────────────────────────────────┘
```

배경: 다른 씬보다 약간 더 어둡게. 2~3초 짧은 씬.

---

### 9. ApplicationScene

**목표**: 실천 단계를 명확하게.

FrameworkScene과 비슷하지만:
- 번호 대신 bullet point (accent 색 원형)
- 각 항목에 서브 설명이 있음
- 수직 리스트, 순차 등장, 현재 항목 강조

---

### 10. DataScene

기존 DataScene은 차트(bar, line, matrix) 렌더링이 있어서 큰 변경 없이 유지.
배경 gradient + 카드 제거만 적용.

---

## 공통 컴포넌트 변경

### AccentUnderline (새로 만들기)
키워드 아래에 왼→오로 그려지는 accent 색 밑줄.
SVG `line` + `strokeDashoffset` 애니메이션.

### AccentBar (새로 만들기)
화면 상단 또는 좌측에 짧은 accent 색 수평/수직선.
씬의 시작을 알리는 시각적 앵커.

### DimmedText (TextBlock 확장)
이미 등장한 텍스트를 dim 처리 (opacity 0.4).
FrameworkScene에서 이전 항목에 사용.

### WordStagger (KineticText 개선)
현재 KineticText의 "물결" 효과를 제거하고,
순수 opacity + translateY stagger로 교체.
spring easing 사용.

---

## 제거할 것

1. **반투명 카드 배경** (모든 씬에서)
2. **세로 accent line** (insight-recap의 왼쪽 줄)
3. **동시 등장** (CompareContrast 좌우 동시)
4. **linear easing** (모든 애니메이션에서)
5. **작은 폰트 크기** (headline 40px 이하)
6. **중앙 정렬 일변도** (씬마다 다른 정렬)

---

## 구현 순서

```
Phase 1: 공통 기반 (1~2일)
  - WordStagger 개선 (spring 기반)
  - AccentUnderline 컴포넌트
  - AccentBar 컴포넌트
  - 타이포그래피 3단계 토큰 정의
  - 배경 gradient 강화 (opacity 0.15+)
  - 카드 배경 제거

Phase 2: 핵심 씬 3개 재설계 (2~3일)
  - HookScene (가장 중요, 첫 인상)
  - KeyInsightScene (가장 자주 나옴)
  - CompareContrastScene (가장 깨져 있음)

Phase 3: 나머지 씬 재설계 (2~3일)
  - QuoteScene
  - FrameworkScene
  - CoverScene
  - ClosingScene
  - ChapterDividerScene
  - ApplicationScene
```

---

## 성공 기준

story-brand-2025로 영상을 렌더하고:

1. Hook 씬: 텍스트가 단어별로 spring 등장, accent 키워드 1개만 색상 다름
2. KeyInsight 씬: 카드 없음, headline이 화면의 40% 차지, 빈 공간 충분
3. CompareContrast 씬: 왼쪽 먼저 등장 → 분할선 → 오른쪽 등장
4. Quote 씬: 따옴표가 먼저 등장, 인용문이 줄 단위 fade-in
5. Framework 씬: 현재 항목만 밝고 나머지 dim
6. 전체 영상: "PPT"가 아니라 "영상"으로 느껴짐

atomic-habits와 story-brand 영상을 나란히 비교해서:
- 배경 그라데이션 색상이 다른지 (genre 차별화)
- 전체 톤이 다르면서도 같은 브랜드로 느껴지는지