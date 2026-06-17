.PHONY: parity parity-smoke parity-full parity-check parity-status parity-interaction imitation-done help

help:
	@echo "Xboard parity targets (7001 ref vs 7002 cmp):"
	@echo "  make imitation-done  - verify 89/89 complete (parity-check + banner)"
	@echo "  make parity        - show last full-suite report"
	@echo "  make parity-check  - strict validate 87 parity + 2 cmp-only"
	@echo "  make parity-smoke  - quick smoke (~15 min)"
	@echo "  make parity-full   - full suite (~65 min, 87 parity + 2 cmp-only)"
	@echo "  make parity-interaction - human-like UX audit (hover/dialog/tabs/animation)"
	@echo "  make parity-status - alias for parity"

parity parity-status:
	@node scripts/visual-gate/parity-status.mjs

parity-check:
	@node scripts/visual-gate/parity-status.mjs --check

parity-smoke:
	@node scripts/visual-gate/parity-status.mjs --smoke

parity-full:
	@node scripts/visual-gate/parity-status.mjs --full

parity-interaction:
	@node scripts/visual-gate/interaction-audit.mjs

imitation-done:
	@node scripts/visual-gate/parity-status.mjs --check
	@echo ""
	@echo "=========================================="
	@echo " IMITATION_LINE_COMPLETE"
	@echo " 87/87 Visual Gate + 2/2 cmp-only = 89"
	@echo " Feature API coverage: 100%"
	@echo " See docs/PARITY-100.md"
	@echo "=========================================="
