# Content Authoring Rules

## Duration 규칙

- narrationText가 있는 씬에 durationFrames를 직접 명시하지 않는다
- TTS 결과가 duration의 source of truth (자동으로 TTS + 15f 적용)
- narrationText가 없는 씬(transition 등)만 durationFrames 명시 허용
- minDurationFrames로 최소 보장 가능 (optional)

## Beat Activates Key 규칙

- framework 씬: item-0, item-1, item-2... (0-indexed, items[] 배열 인덱스와 일치)
- application 씬: step-0, step-1, step-2... (0-indexed, steps[] 배열 인덱스와 일치)
- timeline 씬: event-0, event-1... (0-indexed)
- listReveal 씬: item-0, item-1... (0-indexed)
- 기타 씬: 고정 키 사용 (headline, supportText 등)
- '\*'는 wildcard — 모든 요소 자동 stagger

## Cover Asset 규칙

- coverImageUrl은 assets/ 기준 상대경로 (예: "covers/book.png")
- 파일 미존재 시 fallback 동작하지만 QA warning 발생
- 에셋은 수동 배치 (자동 수집 파이프라인 없음)

## Narration 규칙

- beat.narrationText의 합 = scene.narrationText (TTS 일관성)
- 모든 beat에 narrationText가 있어야 TTS-beat 타이밍 싱크 정상 동작
- visual-only beat(narrationText 없음)은 ratio 기반 타이밍 사용

## 오디오북 화법 규칙

narrationText는 "읽히는 글"이 아니라 "들리는 말"로 작성한다.
TTS 엔진이 감정을 실을 수 있는 문체적 장치를 활용한다.

### 필수 장치 (beat당 최소 1개 사용)

1. **질문형 전환**: "~일까요?", "~해보신 적 있으신가요?"
   - 청자의 주의를 환기하고 TTS가 올라가는 억양을 생성
2. **감탄/강조 어미**: "~입니다!", "무려 ~", "바로 ~"
   - TTS가 에너지를 실을 수 있는 발판
3. **말줄임표 (...)**: "그런데... 반대로 생각해보면"
   - 자연스러운 pause 생성, 극적 긴장감
4. **짧은 문장 + 긴 문장 교차**: 리듬감
   - "핵심은 간단합니다. 복잡하게 생각할 필요 없어요."
5. **2인칭 청자 호출**: "여러분", "한번 생각해보세요"
   - 대화체 느낌, TTS의 자연스러운 톤 유도
6. **대조/반전 구문**: "~라고 생각하시죠? 하지만 실제로는..."
   - 감정 전환점 생성

### 금지 사항

- 논문체/보고서체 평서문 나열 ("~이다", "~것이다" 연속)
- 모든 문장을 같은 어미로 끝내기 ("~합니다" 5회 연속)
- 감정 없는 사실 나열 ("A는 B이고, C는 D이며, E는 F입니다")
- 한 beat에 4문장 이상 비권장 (soft limit — beat 분절 구조에 따라 초과 허용)

### 씬 타입별 문체 톤

| 씬 타입         | 문체 톤                      | 예시                                                      |
| --------------- | ---------------------------- | --------------------------------------------------------- |
| hook            | 도발적 질문, 직접 호칭, 반전 | "목표를 세우지 마세요. 이게 무슨 말일까요?"               |
| keyInsight      | 놀라움 → 설명 → 의미 부여    | "무려 37배입니다! 어떻게 가능할까요?"                     |
| framework       | 명확한 구조화, 번호 강조     | "첫째, 분명하게 만들어라. 핵심은 이겁니다."               |
| quote           | 도입 → 인용 → 여운           | "그는 이렇게 말했습니다... '변화는 정체성에서 시작된다.'" |
| application     | 격려, 구체적 상황 묘사       | "지금 당장 해볼 수 있는 게 있습니다."                     |
| compareContrast | 대비 강조, 반전              | "A 그룹은 성공했습니다. 그런데 B 그룹은? 완전히 달랐죠."  |
| closing         | 따뜻한 정리, 행동 촉구       | "오늘 딱 하나만 기억하세요."                              |

## Beat 감정 태그 (emotionTag) 규칙

Fish Audio S2의 [bracket] 문법으로 beat별 감정을 지정한다.
태그는 보조 수단이며, narration 문체가 감정의 본체다.
Fish Audio 경로에서만 적용되며, edge-tts/qwen3 경로에서는 무시된다.

### 작성 원칙

1. **문체와 일치할 때만 태그를 붙인다**
   - 질문형 문장 → [호기심 어린 톤으로] ✅
   - 평서문 → [호기심 어린 톤으로] ❌ (불일치)

2. **모든 beat에 태그를 넣지 않아도 된다**
   - 태그 없음은 허용. 문체만으로 충분한 beat는 emotionTag를 생략.
   - 감정 전환이 필요한 포인트에만 전략적으로 배치.

3. **한국어 자연어 + paralinguistic 태그 혼용 가능**
   - 감정 톤: [호기심 어린 톤으로], [따뜻하고 격려하는 톤으로]
   - Paralinguistic: [pause], [emphasis], [whisper], [sigh]
   - S2는 둘 다 같은 메커니즘으로 처리

4. **한 beat에 태그 1개만**
   - 여러 감정을 섞지 않는다 (Fish Audio 공식: "Don't mix conflicting emotions")
