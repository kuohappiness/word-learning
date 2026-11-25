#!/usr/bin/env bash
# 檢查有沒有 API 金鑰或其他密碼被放進 repo。
#   scripts/check-secrets.sh          檢查所有已追蹤的檔案（CI 用）
#   scripts/check-secrets.sh --staged 只檢查這次要 commit 的內容（pre-commit 用）
# 找到就列出檔名和行號（金鑰本身會遮住），並以非零狀態結束。
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

# Claude、OpenAI、GitHub、AWS、Google、Cloudflare 常見的金鑰格式，以及私鑰
PATTERN='sk-ant-[A-Za-z0-9_-]{16,}|sk-(proj-|svcacct-|admin-)?[A-Za-z0-9_-]{32,}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}|-----BEGIN ([A-Z]+ )?PRIVATE KEY-----|xox[baprs]-[A-Za-z0-9-]{10,}'

# 不應該出現在 repo 的檔名
BAD_NAMES='(^|/)(\.env(\..*)?|\.dev\.vars|.*\.pem|.*\.key|secrets?\.json)$'

status=0

if [[ "${1:-}" == "--staged" ]]; then
  files=$(git diff --cached --name-only --diff-filter=ACMR)
  scan() { git grep --cached -nIE "$PATTERN" -- $files || true; }
else
  files=$(git ls-files)
  scan() { git grep -nIE "$PATTERN" -- "$@" || true; }
fi

if [[ -n "$files" ]]; then
  bad=$(printf '%s\n' "$files" | grep -E "$BAD_NAMES" | grep -v '\.example$' || true)
  if [[ -n "$bad" ]]; then
    echo "不可以 commit 這些檔案（可能含有金鑰）："
    printf '  %s\n' $bad
    status=1
  fi
  hits=$(scan . | sed -E "s/($PATTERN)/[已遮住的金鑰]/g")
  if [[ -n "$hits" ]]; then
    echo "找到看起來像 API 金鑰的內容："
    printf '%s\n' "$hits" | sed 's/^/  /'
    status=1
  fi
fi

if [[ $status -ne 0 ]]; then
  echo
  echo "API 金鑰只能貼在 App 的「我的」頁面，不能寫進任何檔案（SPEC 第 4 節）。"
  echo "請把金鑰移除後再 commit。如果已經推上 GitHub，請立刻到 Claude Console 或 OpenAI 後台刪掉這組金鑰。"
fi
exit $status
