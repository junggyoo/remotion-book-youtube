#!/usr/bin/env bash
# Hook: 수동 호출 또는 PostToolUse
# 목적: 합성 씬(synthesized scene) 파일에 fallbackPreset이 있는지 검증
# 없으면 exit 2로 차단

set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# file_path가 없거나 씬 관련이 아니면 통과
if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# scenes/ 또는 blueprint 관련 파일만 검사
if [[ "$FILE_PATH" != *"/scenes/"* ]] && [[ "$FILE_PATH" != *"blueprint"* ]] && [[ "$FILE_PATH" != *"Blueprint"* ]]; then
  exit 0
fi

CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // .tool_input.new_string // empty')

if [[ -z "$CONTENT" ]]; then
  exit 0
fi

# synthesized/custom 씬인지 확인 (SceneBlueprint 또는 synthesized 키워드 포함)
if echo "$CONTENT" | grep -qiE "(synthesized|SceneBlueprint|customBlueprint|sceneSynthesizer)"; then
  # fallbackPreset이 있는지 확인
  if ! echo "$CONTENT" | grep -qiE "fallbackPreset"; then
    echo "BLOCKED: 합성 씬에 fallbackPreset이 없습니다."
    echo "모든 synthesized scene에는 반드시 fallbackPreset을 지정해야 합니다."
    exit 2
  fi
fi

exit 0
