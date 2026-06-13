# IMITATION-PLAN Round 43 — 7002 独有功能 cmp-only 验收 + 全量复验（2026-06-13）

## 背景

Parity **87/87** 已达成，但 `gift-generate` 与 `user-gift-card` 因 7001 无对照 UI 被排除在像素 gate 外。R43 为这两项增加 **7002 cmp-only smoke**（无 7001 ref），使「功能 + 像素 + 7002 独有 UI」闭环为 **100%**。

## 计划

| # | 任务 |
|---|------|
| 1 | 新增 `verify-cmp-only.mjs`（gift-generate dialog + user gift-card 页） |
| 2 | 接入 `run-parity-suite.mjs` / `verify-parity-quick.mjs` / `parity-status.mjs` |
| 3 | 更新 `PARITY-100.md`、README、COMPLETION-CHECKLIST |
| 4 | `make parity-full` 全量复验 |
| 5 | 提交 master + Gitea |

## R43 执行记录

| 项 | 结果 |
|---|---|
| `verify-cmp-only.mjs` | ✅ gift-generate + user-gift-card 2/2 PASS |
| 接入 parity suite | ✅ run-parity-suite / verify-parity-quick / parity-status |
| probe-round29 重试 | ✅ 每场景最多 3 次（修复长 suite 后 user-edit flake） |
| `make parity-full` | ✅ PASS（2026-06-13T12:32:31Z） |
| commit | `master` → origin + gitea |

**结论**：**87 parity + 2 cmp-only = 89 场景 100%**。
