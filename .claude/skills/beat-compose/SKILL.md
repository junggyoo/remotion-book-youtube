---
name: beat-compose
description: >
  씬의 시간 구조(beat 배열)를 설계한다. 나레이션 분절, 시각 요소 배치,
  emphasisTargets 선정, evidenceCard 적격성 판단을 수행한다.
  editorial heuristics에 기반하며, 모든 판단에 근거 문서를 참조한다.
  "beat", "리듬", "pacing", "시간 구조", "beat 나눠줘" 등에 자동 활성화.
context: fork
agent: beat-composer
---

# Beat Composer

## 입력
- 씬 배열 (scene-architect 출력): type, content, narrationText, durationFrames
- BookFingerprint: emotionalTone, urgencyLevel, contentMode
- VideoNarrativePlan: segments, emotionalCurve

## 출력
- 각 씬에 beats 배열이 추가된 씬 배열
- 각 씬에 BeatDesignRationale (설계 근거)
- evidenceCard가 추가된 keyInsight content (해당되는 경우)

## 근거 문서 (모든 판단의 기반)
- 씬 타입별 패턴: [beat-patterns.md](beat-patterns.md)
- 나레이션 분절: [narration-segmentation.md](narration-segmentation.md)
- Evidence 적격성: [evidence-rubric.md](evidence-rubric.md)
- Emphasis 선택: [emphasis-guide.md](emphasis-guide.md)
- 품질 검증: [beat-quality-checklist.md](beat-quality-checklist.md)

## 역할 분리 원칙 (v0.2 강화)

beat의 세 필드는 서로 다른 시스템에서 소비된다. 혼용하지 마라:

| 필드 | 역할 | 소비자 |
|------|------|--------|
| `activates` | 시각 요소 등장/활성화 | BeatElement (컴포넌트 마운트/entering 상태) |
| `deactivates` | 시각 요소 퇴장/약화 | BeatElement (exiting 상태) |
| `emphasisTargets` | 자막/텍스트 키워드 강조 | CaptionLayer (하이라이트 색상) |

잘못된 예: activates에 강조 단어를 넣는 것 → emphasisTargets에 넣어야 함
잘못된 예: emphasisTargets에 UI 요소 키를 넣는 것 → activates에 넣어야 함
