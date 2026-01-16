SHELL := /bin/bash
.DEFAULT_GOAL := help

.PHONY: help
help:
@echo "ETHINX Ops Commands"
@echo
@echo "Usage:"
@echo "  make live-check ETHINX_BASE_URL=https://api.example.com STRIPE_SECRET_KEY=sk_live_..."
@echo
@echo "Targets:"
@echo "  live-check      Run LIVE readiness orchestration (no charges; optional manual payment gate)"
@echo "  live-check-pay  Same as live-check, but ENFORCES manual real-payment gate"
@echo
@echo "Env vars:"
@echo "  ETHINX_BASE_URL                 Required. Base URL"
@echo "  STRIPE_SECRET_KEY               Required. Stripe LIVE secret key (sk_live_...)"
@echo "  CHECK_TLS                       Optional. 1/0. Default 1"
@echo "  CHECK_HOST                      Optional. 1/0. Default 1"
@echo "  REPORT_DIR                      Optional. Default ./ops/reports"
@echo "  REQUIRE_REAL_PAYMENT            Optional. 1/0. Default 0"
@echo "  ETHINX_LIVE_PAYMENT_CONFIRMED   Required if REQUIRE_REAL_PAYMENT=1. Set to YES after manual purchase."
@echo

.PHONY: live-check
live-check:
@bash scripts/live_check.sh

.PHONY: live-check-pay
live-check-pay:
@REQUIRE_REAL_PAYMENT=1 bash scripts/live_check.sh
