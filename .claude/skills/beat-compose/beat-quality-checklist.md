# Beat 품질 자가 검증 체크리스트

## 필수 통과 (실패 시 재설계)

□ 각 beat.narrationText를 이어붙이면 원본 narrationText와 글자 수 일치 (±5자)
□ 모든 beat의 endRatio - startRatio >= 0.12
□ beat 간 overlap 없음
□ 각 beat.activates가 해당 씬 content의 실제 필드명
□ 각 beat.emphasisTargets가 해당 beat.narrationText에 존재
□ activates에 강조 단어가 들어있지 않음 (emphasisTargets와 혼용 금지)
□ emphasisTargets에 UI 요소 키가 들어있지 않음 (activates와 혼용 금지)

## 리듬/시간 품질 (v0.2 추가)

□ hook 씬에서 3초 이상 시각 변화 없는 구간이 없는가?
  (activates도 deactivates도 없는 beat가 3초 이상이면 경고)
□ 8초 이상 씬에서 단일 beat만 있지 않은가?
□ emphasisTargets가 있는데 시각 요소 변화(activates/deactivates)가
  전혀 없는 beat가 없는가? (emphasis만 있고 화면 변화가 없으면 시청자 혼란)
□ 모든 beat가 동일한 길이가 아닌가? (균등 분배는 단조롭다)
□ 첫 beat가 전체의 20% 미만이 아닌가?
□ evidence beat가 전체의 35% 이상이 아닌가?
□ 모든 beat의 transition이 "enter"이면 변화가 단조롭지 않은가?

## 콘텐츠 품질

□ evidenceCard가 있다면 evidence-rubric.md 기준 A/B등급인가?
□ evidenceCard.source가 날조되지 않았는가?
□ emphasisTargets가 beat당 1~3개인가?

## 시청자 경험 시뮬레이션

beat를 처음부터 끝까지 머릿속으로 재생한다.
"어색하다", "급하다", "지루하다"가 느껴지면 재설계한다.
