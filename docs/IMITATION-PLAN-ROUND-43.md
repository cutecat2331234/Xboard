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

（跑完填写）
