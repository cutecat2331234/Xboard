# IMITATION-PLAN Round 47 — CI 防回归 + 终局标记（2026-06-13）

## 背景

89 场景 100% 已达成；需在 CI 中固化 `parity-check`，防止报告被误改导致「假 100%」。

## 计划

| # | 任务 |
|---|------|
| 1 | 新增 `.github/workflows/parity-check.yml` |
| 2 | README CI badge + PARITY-100 / AI-HANDOFF 补 CI 说明 |
| 3 | `make parity-check` 复验 |
| 4 | 提交 master + Gitea |

## R47 执行记录

| 项 | 结果 |
|---|---|
| `.github/workflows/parity-check.yml` | ✅ push/PR 跑 make parity-check |
| README badge + 文档 | ✅ PARITY-100 / AI-HANDOFF CI 说明 |
| `make parity-check` | ✅ PASS |
| commit | `master` → origin + gitea |

**结论**：**89/89 维持 100%**，CI 防回归已接入。
