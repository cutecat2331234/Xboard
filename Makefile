.PHONY: parity parity-smoke parity-full parity-check parity-status help

help:
	@echo "Xboard parity targets (7001 ref vs 7002 cmp):"
	@echo "  make parity        - show last full-suite report"
	@echo "  make parity-check  - strict validate 87 parity + 2 cmp-only"
	@echo "  make parity-smoke  - quick smoke (~15 min)"
	@echo "  make parity-full   - full suite (~65 min, 87 parity + 2 cmp-only)"
	@echo "  make parity-status - alias for parity"

parity parity-status:
	@node scripts/visual-gate/parity-status.mjs

parity-check:
	@node scripts/visual-gate/parity-status.mjs --check

parity-smoke:
	@node scripts/visual-gate/parity-status.mjs --smoke

parity-full:
	@node scripts/visual-gate/parity-status.mjs --full
