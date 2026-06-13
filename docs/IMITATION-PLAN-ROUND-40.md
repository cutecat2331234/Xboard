# IMITATION-PLAN Round 40 — 全量复验 + 根 README 验收入口（2026-06-13）

## 目标

Visual Gate / 功能覆盖已在 R39 声明 100%。R40 **实跑全量 suite 刷新报告**，并在根 README 暴露验收命令。

## 计划

| # | 任务 |
|---|------|
| 1 | `run-parity-suite.mjs` 全量复验（87 routes） |
| 2 | `parity-status.mjs --full` / `check-parity.sh --full` |
| 3 | 根 README 增加「7001 vs 7002 仿写验收」 |
| 4 | 提交 master |

## R40 执行记录

| 验收 | 结果 | 时间 |
|------|------|------|
| `run-parity-suite.mjs` 全量 | **PASS 87/87** | 2026-06-13 |
| `parity-status.mjs --full` | 已实现 | — |
| 根 README 验收入口 | 已添加 | — |

**结论**：全量报告已刷新（`parity-suite-report.json` timestamp 2026-06-13）；100% 维持。
