# Content Generation Contract

Claude Code가 영상 콘텐츠 JSON을 생성할 때 반드시 따르는 절차.

## 영상 콘텐츠 생성 절차

### Step 1: Budget 계산

- `production.targetDurationSeconds` 확인
- `calculateBudget(targetDurationSeconds, sceneComposition)` 호출
- SceneBudgetPlan 출력 (씬별 minChars, recommendedChars, maxChars)

### Step 2: 씬 구성 결정

- 책의 핵심 구조 분석 (주요 프레임워크, 핵심 인사이트 수, 인용구 등)
- budget plan의 시간 비율에 맞춰 씬 타입과 개수 결정
- 각 씬의 targetSeconds와 minChars 확인

### Step 3: 나레이션 작성

- 각 씬의 narrationText를 **recommendedChars 이상** 목표로 작성
- 최소 minChars 이상 필수
- maxChars 초과 금지 (closing CTA 씬은 예외 허용)
- 한국어 유튜브 나레이션 톤 (구어체, 정보 밀도)
- 씬 타입별 가이드라인:
  - **framework**: 각 항목에 "설명 + 해석 + 연결문장" 포함
  - **application**: 각 step에 "구체적 예시 + 상황 맥락 + 마무리" 포함
  - **keyInsight**: headline 설명 + support 근거 + evidence 연결
  - **compareContrast**: 좌우 각각 상황 묘사 + 결과 대비
  - **quote**: 도입 + 인용 + 해석

### Step 4: Beat 분배

- narrationText를 beat별로 분배
- 각 beat.narrationText가 해당 beat의 activates 요소와 의미적으로 대응
- framework: items 개수 = reveal beat 수 (+ optional headline beat)
- application: steps 개수 = reveal beat 수 (+ optional headline beat)
- beat narrationText 합산 = scene narrationText (TTS 일관성)

### Step 5: 자체 검증

- 전체 narrationText 글자 수 합산
- estimatedNarrationChars 대비 ±25% 이내인지 확인
- 씬별 minChars 미달 항목 확인
- framework/application: 항목 수 vs beat 수 대응 확인
- 미달 시 Step 3으로 돌아가 보강

### Step 5.5: Thumbnail 설정

BookFingerprint에서 thumbnail 필드를 자동 생성한다.

- hookText: entryAngle에서 추출 (30자 이내)
- accentWord: coreFramework 또는 uniqueElements[0]에서 추출
- expression/gesture: hookStrategy에서 매핑
- mood: urgencyLevel에서 매핑
- backgroundStyle: genre에서 기본값 선택

thumbnail 필드가 이미 존재하면 이 단계를 건너뛴다.

### Step 6: JSON 생성

- 위 결과를 content/books/{book-id}.json으로 출력
- narration 있는 씬에 durationFrames 직접 명시 금지 (TTS가 결정)
- beat activates key는 0-indexed (item-0, step-0)

## 금지 규칙

- budget 계산 없이 JSON 작성 착수 금지
- targetDurationSeconds 없는 longform 생성 금지
- 씬별 최소 분량(minChars) 미달 상태로 JSON 완성 금지
- narration 있는 씬에 durationFrames 직접 명시 금지
- framework/application에서 항목 수와 beat narration 불일치 금지
- thumbnail 필드를 수동으로 작성하되 hookText가 entryAngle과 무관한 내용이면 금지

## CPS 참조

- Fish Audio S2-Pro 기준: ~7.5 chars/sec (실측 7.49)
- speed 변경 시 비례 조정 (speed=1.2 → CPS ≈ 9.0)
- QA-13A가 pre-TTS 글자수 검증, QA-13B가 post-TTS 실제 시간 검증
