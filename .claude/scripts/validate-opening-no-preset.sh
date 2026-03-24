#!/usr/bin/env bash
# Hook: PreToolUse (Write|Edit)
# 목적: Opening 관련 코드에서 프리셋을 직접 사용하면 차단 (exit 2)
# Opening은 반드시 동적 생성해야 한다. fallback 경로만 예외.

set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# file_path가 없으면 통과
if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# Opening 관련 파일이 아니면 통과
IS_OPENING=false
if [[ "$FILE_PATH" == *"openingComposer"* ]] || \
   [[ "$FILE_PATH" == *"openingValidator"* ]] || \
   [[ "$FILE_PATH" == *"OpeningScene"* ]] || \
   [[ "$FILE_PATH" == *"HookScene"* ]] || \
   [[ "$FILE_PATH" == *"IntroScene"* ]]; then
  IS_OPENING=true
fi

if [[ "$IS_OPENING" != "true" ]]; then
  exit 0
fi

# fallback 디렉토리 내 파일은 프리셋 사용 허용
if [[ "$FILE_PATH" == *"/fallback/"* ]]; then
  exit 0
fi

CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // .tool_input.new_string // empty')

if [[ -z "$CONTENT" ]]; then
  exit 0
fi

# 프리셋 직접 import/사용 패턴 검사
if echo "$CONTENT" | grep -qiE "(openingPreset|presetOpening|usePreset.*opening|import.*preset.*opening)"; then
  echo "BLOCKED: Opening 코드에서 프리셋을 직접 사용하고 있습니다."
  echo "Opening(Hook + Intro)은 반드시 동적 생성해야 합니다."
  echo "동적 생성 실패 시에만 fallback/ 프리셋을 사용할 수 있습니다."
  exit 2
fi

exit 0
