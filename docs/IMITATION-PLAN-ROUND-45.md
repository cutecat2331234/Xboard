# IMITATION-PLAN Round 45 — 验收固化 + smoke 复验（2026-06-13）

## 背景

89 场景 100% 已达成（R43–R44），缺严格 `--check` 入口与 README 89 场景表述。

## 计划

| # | 任务 |
|---|------|
| 1 | `parity-status.mjs --check` 严格校验 87+2 |
| 2 | Makefile 增加 `parity-check` |
| 3 | README 维护状态 / 验收表 89 场景 |
| 4 | `make parity-smoke` 复验 |
| 5 | 提交 master + Gitea |

## R45 执行记录

| 项 | 结果 |
|---|---|
| `parity-status --check` | ✅ 87 parity + 2 cmp-only |
| `make parity-check` | ✅ Makefile 新目标 |
| README / PARITY-100 | ✅ 89 场景 + 维护状态 |
| `make parity-smoke` | ✅ PASS |
| commit | `master` → origin + gitea |

**结论**：验收入口固化，**89/89 维持 100%**。
