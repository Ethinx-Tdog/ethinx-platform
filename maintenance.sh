#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Usage: [SKIP_PRECOMMIT=1] [RUN_ALL_FILES=0] [LEGACY_PATTERNS=...] ./maintenance.sh
# - Searches for legacy worker deployment references.
# - Cleans Python cache artifacts.
# - Installs dev tooling and runs pre-commit (unless SKIP_PRECOMMIT is set, RUN_ALL_FILES=0 limits scope).

echo "🔍 Searching for legacy worker deployment references..."
# Targets:
# - deployment/worker: legacy deployment paths
# - build: ./worker: legacy build contexts
# - python main.py: direct worker entrypoint invocation
# Override via LEGACY_PATTERNS (pipe-delimited) to add/remove search terms.
if [[ -n "${LEGACY_PATTERNS:-}" ]]; then
  IFS='|' read -r -a PATTERNS <<< "${LEGACY_PATTERNS}"
else
  PATTERNS=("deployment/worker" "build: ./worker" "python main.py")
fi

# Prefer ripgrep when available for performance and better hidden-file handling.
if command -v rg >/dev/null 2>&1; then
  for pattern in "${PATTERNS[@]}"; do
    rg --color=never --hidden --no-heading --glob '!.git/**' --glob '!maintenance.sh' \
      --fixed-strings -n "${pattern}" "${ROOT_DIR}" || true
  done
else
  for pattern in "${PATTERNS[@]}"; do
    grep -R -nF --binary-files=without-match \
      --exclude-dir={.git,.ruff_cache,.venv,env,venv,__pycache__} \
      --exclude=maintenance.sh \
      -- "${pattern}" "${ROOT_DIR}" || true
  done
fi

echo "🧹 Cleaning Python cache artifacts..."
find "${ROOT_DIR}" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find "${ROOT_DIR}" -type f -name "*.py[co]" -delete
rm -rf "${ROOT_DIR}/.ruff_cache"

echo "📦 Installing development tooling and validating hooks..."
if [[ -z "${VIRTUAL_ENV:-}" ]]; then
  echo "ℹ️  Running outside a virtual environment; consider activating one to avoid modifying system packages."
fi
python -m pip install --upgrade pip
python -m pip install pre-commit ruff
if [[ "${SKIP_PRECOMMIT:-0}" == "1" ]]; then
  echo "SKIP_PRECOMMIT=1 set; skipping hook execution."
else
  (
    cd "${ROOT_DIR}"
    pre-commit install
    if [[ "${RUN_ALL_FILES:-1}" == "1" ]]; then
      pre-commit run --all-files
    else
      pre-commit run
    fi
  )
fi
echo "✅ Maintenance complete."
