# IMITATION-PLAN Round 41 — Makefile 验收入口 + smoke 复验（2026-06-13）

## 背景

R40 全量 87/87 已 PASS。用户反复要求「百分百」→ R41 固化**一条命令验收**，并 smoke 复验在线环境。

## 计划

| # | 任务 |
|---|------|
| 1 | 新增根目录 `Makefile`（parity / parity-smoke / parity-full） |
| 2 | `parity-status --smoke` 复验 7001/7002 |
| 3 | 更新 PARITY-100 / README |
| 4 | 尝试同步 Gitea remote |
| 5 | 提交 master |

## R41 执行记录

| 验收 | 结果 |
|------|------|
| `make parity-smoke` / `--smoke` | **PASS** |
| 根目录 `Makefile` | 已添加 |
| Gitea 同步 | 见 push 结果 |

**结论**：100% 维持；验收命令统一为 `make parity*`。
