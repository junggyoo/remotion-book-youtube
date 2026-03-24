#!/usr/bin/env bash
# Hook: 수동 호출
# 목적: content JSON 파일에 대해 Zod schema 검증 실행
# npm run validate를 래핑하여 exit code로 결과 전달

set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# 인자로 특정 파일이 들어오면 그 파일만, 아니면 전체 validate
if [[ $# -gt 0 ]]; then
  TARGET_FILE="$1"
  echo "Zod 검증 실행: $TARGET_FILE"
  cd "$PROJECT_DIR" && npx ts-node scripts/validate-content.ts "$TARGET_FILE"
else
  # stdin에서 tool_input 읽기 시도
  INPUT=$(cat 2>/dev/null || echo "{}")
  FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null || echo "")

  if [[ -n "$FILE_PATH" ]] && [[ "$FILE_PATH" == *".json" ]] && [[ "$FILE_PATH" == *"content/books/"* ]]; then
    echo "Zod 검증 실행: $FILE_PATH"
    cd "$PROJECT_DIR" && npx ts-node scripts/validate-content.ts "$FILE_PATH"
  else
    echo "Zod 전체 검증 실행"
    cd "$PROJECT_DIR" && npm run validate
  fi
fi

RESULT=$?
if [[ $RESULT -ne 0 ]]; then
  echo "BLOCKED: Zod schema 검증 실패."
  exit 2
fi

echo "Zod 검증 통과."
exit 0
