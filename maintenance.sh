#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Usage: [SKIP_PRECOMMIT=1] ./maintenance.sh
# - Searches for legacy worker deployment references.
# - Cleans Python cache artifacts.
# - Installs dev tooling and runs pre-commit (unless SKIP_PRECOMMIT is set).

echo "🔍 Searching for legacy worker deployment references..."
LEGACY_PATTERNS="deployment/worker|build: ./worker|python main.py"
if command -v rg >/dev/null 2>&1; then
  rg --color=never --hidden --no-heading --glob '!.git/**' --glob '!maintenance.sh' -n "${LEGACY_PATTERNS}" "${ROOT_DIR}" || true
else
  grep -R -nE --binary-files=without-match \
    --exclude-dir={.git,.ruff_cache,.venv,env,venv,__pycache__} \
    --exclude=maintenance.sh \
    "${LEGACY_PATTERNS}" "${ROOT_DIR}" || true
fi

echo "🧹 Cleaning Python cache artifacts..."
find "${ROOT_DIR}" -type d -name "__pycache__" -prune -exec rm -rf {} +
find "${ROOT_DIR}" -type f -name "*.py[co]" -delete
rm -rf "${ROOT_DIR}/.ruff_cache"

echo "📦 Installing development tooling and validating hooks..."
python -m pip install --upgrade pip
python -m pip install pre-commit ruff
if [[ "${SKIP_PRECOMMIT:-0}" == "1" ]]; then
  echo "SKIP_PRECOMMIT=1 set; skipping hook execution."
else
  (cd "${ROOT_DIR}" && pre-commit install && pre-commit run --all-files)
fi

echo "✅ Maintenance complete."
