#!/usr/bin/env bash
# Hook: PreToolUse (Write|Edit)
# 목적: src/ 내 파일에 하드코딩된 hex 색상이 있으면 차단 (exit 2)
# stdin으로 tool_input JSON이 들어온다.

set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# file_path가 없거나 src/ 밖이면 통과
if [[ -z "$FILE_PATH" ]] || [[ "$FILE_PATH" != *"src/"* ]]; then
  exit 0
fi

# 토큰 정의 파일 자체는 하드코딩 허용 (색상을 정의하는 곳이므로)
if [[ "$FILE_PATH" == *"design/tokens/"* ]]; then
  exit 0
fi

# Write의 경우 content, Edit의 경우 new_string에서 검사
CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // .tool_input.new_string // empty')

if [[ -z "$CONTENT" ]]; then
  exit 0
fi

# hex 색상 패턴 검사 (#RGB, #RRGGBB, #RRGGBBAA)
# CSS/디자인 관련 컨텍스트에서의 hex만 잡기 위해 color/background 등과 함께 나오는 패턴 우선
if echo "$CONTENT" | grep -qE "(#[0-9a-fA-F]{3,8})\b"; then
  # 주석 안의 hex는 무시
  MATCHES=$(echo "$CONTENT" | grep -nE "(#[0-9a-fA-F]{3,8})\b" | grep -v "^\s*//" | grep -v "^\s*\*" || true)
  if [[ -n "$MATCHES" ]]; then
    echo "BLOCKED: 하드코딩된 hex 색상이 발견되었습니다."
    echo "토큰을 사용하세요: theme.textStrong, theme.bg, tokens.colors.* 등"
    echo ""
    echo "발견된 위치:"
    echo "$MATCHES"
    exit 2
  fi
fi

exit 0
