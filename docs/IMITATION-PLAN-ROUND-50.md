# IMITATION-PLAN Round 50 — Gitea CI + 文档收口（2026-06-13）

## 背景

89 场景 100% 已达成；GitHub 已有 `parity-check.yml`，Gitea 主仓需同步 CI。

## 计划

| # | 任务 |
|---|------|
| 1 | 新增 `.gitea/workflows/parity-check.yml` |
| 2 | AI-HANDOFF / PARITY-100 补 Gitea CI |
| 3 | `make parity-check` 复验 |
| 4 | 提交 master + Gitea |

## R50 执行记录

| 项 | 结果 |
|---|---|
| `.gitea/workflows/parity-check.yml` | ✅ |
| AI-HANDOFF §8 完工声明 + Gitea CI | ✅ |
| `make parity-check` | ✅ PASS |
| commit | `master` → origin + gitea |

**结论**：**89/89 维持 100%**，双远程 CI 已对齐。
