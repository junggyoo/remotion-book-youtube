#!/usr/bin/env bash
# Hook: 수동 호출 또는 PostToolUse
# 목적: mediaPlan 객체가 4필드(narration, caption, audio, asset) 모두 포함하는지 검증

set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# file_path가 없으면 통과
if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# mediaPlan 관련 파일만 검사
if [[ "$FILE_PATH" != *"mediaPlan"* ]] && [[ "$FILE_PATH" != *"blueprint"* ]] && [[ "$FILE_PATH" != *"Blueprint"* ]] && [[ "$FILE_PATH" != *".json" ]]; then
  exit 0
fi

CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // .tool_input.new_string // empty')

if [[ -z "$CONTENT" ]]; then
  exit 0
fi

# mediaPlan이 포함된 경우에만 검사
if echo "$CONTENT" | grep -qiE "mediaPlan"; then
  MISSING=""
  echo "$CONTENT" | grep -qiE "(narration|narrationPlan|narrationText)" || MISSING="${MISSING} narration"
  echo "$CONTENT" | grep -qiE "(caption|captionPlan)" || MISSING="${MISSING} caption"
  echo "$CONTENT" | grep -qiE "(audio|audioPlan)" || MISSING="${MISSING} audio"
  echo "$CONTENT" | grep -qiE "(asset|assetPlan)" || MISSING="${MISSING} asset"

  if [[ -n "$MISSING" ]]; then
    echo "BLOCKED: mediaPlan에 필수 필드가 누락되었습니다."
    echo "누락된 필드:${MISSING}"
    echo "mediaPlan은 narration, caption, audio, asset 4가지를 모두 포함해야 합니다."
    exit 2
  fi
fi

exit 0
