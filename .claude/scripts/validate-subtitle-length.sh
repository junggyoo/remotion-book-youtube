#!/usr/bin/env bash
# Hook: 수동 호출 또는 PostToolUse
# 목적: 자막 텍스트가 28자/줄, 2줄 제한을 초과하면 차단

set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# file_path가 없으면 통과
if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# 자막 관련 파일만 검사
if [[ "$FILE_PATH" != *"subtitle"* ]] && [[ "$FILE_PATH" != *"Subtitle"* ]] && [[ "$FILE_PATH" != *"caption"* ]] && [[ "$FILE_PATH" != *"Caption"* ]]; then
  exit 0
fi

CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // .tool_input.new_string // empty')

if [[ -z "$CONTENT" ]]; then
  exit 0
fi

# 자막 텍스트 문자열 리터럴에서 28자 초과 검사 (한글 기준)
# 따옴표 안의 한글 텍스트를 추출하여 길이 확인
HAS_VIOLATION=false
while IFS= read -r line; do
  # 문자열 리터럴 추출 (작은따옴표 또는 큰따옴표)
  TEXTS=$(echo "$line" | grep -oE "['\"]([^'\"]{29,})['\"]" || true)
  if [[ -n "$TEXTS" ]]; then
    # 한글이 포함된 경우만
    if echo "$TEXTS" | grep -qP '[\x{AC00}-\x{D7AF}]' 2>/dev/null || echo "$TEXTS" | grep -q '[가-힣]' 2>/dev/null; then
      HAS_VIOLATION=true
      echo "WARNING: 28자 초과 자막 발견 — $line"
    fi
  fi
done <<< "$CONTENT"

if [[ "$HAS_VIOLATION" == "true" ]]; then
  echo ""
  echo "BLOCKED: 자막 텍스트가 28자/줄 제한을 초과했습니다."
  echo "28자 이내로 줄바꿈하고, 최대 2줄까지만 표시하세요."
  exit 2
fi

exit 0
