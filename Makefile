.PHONY: parity parity-smoke parity-full parity-status help

help:
	@echo "Xboard parity targets (7001 ref vs 7002 cmp):"
	@echo "  make parity        - show last full-suite report"
	@echo "  make parity-smoke  - quick smoke (~13 min)"
	@echo "  make parity-full   - full suite (~65 min, 87 routes)"
	@echo "  make parity-status - alias for parity"

parity parity-status:
	@node scripts/visual-gate/parity-status.mjs

parity-smoke:
	@node scripts/visual-gate/parity-status.mjs --smoke

parity-full:
	@node scripts/visual-gate/parity-status.mjs --full
