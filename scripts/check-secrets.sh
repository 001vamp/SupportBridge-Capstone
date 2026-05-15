#!/usr/bin/env bash
# Run before your first git push. Exits non-zero if likely secrets would be committed.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'
FAIL=0

echo "Checking for files that must not be committed..."

# 1) Env files with secrets (should be gitignored)
for f in server/.env client/.env .env; do
  if [[ -f "$f" ]]; then
    if git check-ignore -q "$f" 2>/dev/null || [[ ! -d .git ]]; then
      :
    else
      echo -e "${RED}BLOCKED:${NC} $f exists and is NOT ignored by git — add to .gitignore"
      FAIL=1
    fi
  fi
done

# 2) If git exists, ensure env/sqlite are not staged
if [[ -d .git ]]; then
  while IFS= read -r path; do
    case "$path" in
      server/.env|client/.env|.env|*/.env)
        echo -e "${RED}BLOCKED:${NC} staged secret file: $path"
        FAIL=1
        ;;
      *.sqlite|*.sqlite-shm|*.sqlite-wal)
        echo -e "${RED}BLOCKED:${NC} staged database: $path"
        FAIL=1
        ;;
    esac
  done < <(git diff --cached --name-only 2>/dev/null || true)
fi

# 3) Scan tracked + staged source (not node_modules) for long hex keys in env-like lines
if [[ -d .git ]]; then
  FILES=$(git ls-files 2>/dev/null | grep -Ev '^node_modules/|client/dist/|\.env$|/\.env$' || true)
else
  FILES=$(find . -type f \( -name '*.js' -o -name '*.jsx' -o -name '*.md' -o -name '*.json' -o -name '*.sql' \) \
    ! -path './node_modules/*' ! -path './client/dist/*' ! -path './client/node_modules/*' \
    ! -path './server/.env' ! -path './client/.env' ! -path './.env' 2>/dev/null || true)
fi

if [[ -n "${FILES:-}" ]]; then
  MATCHES=$(echo "$FILES" | xargs grep -nE 'HERMES_API_KEY=[0-9a-f]{20,}|HERMES_KEY=[0-9a-f]{20,}' 2>/dev/null | grep -v '\.env\.example' || true)
  if [[ -n "$MATCHES" ]]; then
    echo -e "${RED}BLOCKED:${NC} possible API key in files that would be committed:"
    echo "$MATCHES"
    FAIL=1
  fi
fi

# 4) Warn if server/.env exists (expected locally, must stay untracked)
if [[ -f server/.env ]]; then
  echo "Note: server/.env is present locally (OK) — it must stay out of git."
fi

if [[ "$FAIL" -ne 0 ]]; then
  echo -e "${RED}Secret check failed. Fix issues before pushing.${NC}"
  exit 1
fi

echo -e "${GREEN}OK:${NC} No obvious secrets staged for commit."
echo "Safe to commit: .env.example, client/.env.example (empty placeholders only)."
