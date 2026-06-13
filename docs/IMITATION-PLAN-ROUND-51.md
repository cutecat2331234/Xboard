# IMITATION-PLAN Round 51 — 验收入口 imitation-done + smoke（2026-06-13）

## 背景

89 场景 100% 已达成（R50 完工声明）。R51 增加一键 `make imitation-done` 并 smoke 复验维持。

## 计划

| # | 任务 |
|---|------|
| 1 | Makefile 新增 `imitation-done`（= parity-check + 完工 banner） |
| 2 | README / AI-HANDOFF 补命令 |
| 3 | `make parity-smoke` 复验 |
| 4 | 提交 master + Gitea |

## R51 执行记录

| 项 | 结果 |
|---|---|
| `make imitation-done` | ✅ parity-check + 完工 banner |
| `make parity-smoke` | ✅ PASS |
| commit | `master` → origin + gitea |

**结论**：**89/89 维持 100%**。
