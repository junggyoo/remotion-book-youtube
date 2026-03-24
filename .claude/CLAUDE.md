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
npm run preview          # Remotion Studio 미리보기
npm run validate         # content JSON 검증
npm run render:longform  # longform 렌더
npm run render:shorts    # shorts 렌더

## 파이프라인 순서 (반드시 이 순서)
1.BookAnalyzer → 2.NarrativePlanner → 3.OpeningComposer
→ 4.ScenePlanner → 5.GapDetector → 6.SceneSynthesizer
→ 6.5.AssetPlanner → 7.BlueprintValidator → 8.BlueprintRenderer
→ 9.ScenePromoter

## HITL 체크포인트 (review 모드)
A: Opening 승인 (3단계 후)
B: Signature Scene 승인 (6단계 후)
C: Final QA 승인 (8단계 후)

## 참조 (상세 내용은 skill 참조)
- 디자인 토큰: src/design/tokens/
- 모션 프리셋: src/design/tokens/motion-presets.json
- 씬 카탈로그: src/schema/scene-catalog.json
- DSGS 정규 스펙: docs/DSGS_CANONICAL_SPEC_v1.md
- 오케스트레이션: docs/DSGS_CLAUDE_CODE_ORCHESTRATION.md
