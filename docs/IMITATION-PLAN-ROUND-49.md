# IMITATION-PLAN Round 49 — lastSmoke 保留 + smoke 复验（2026-06-13）

## 背景

R48 全量复验 PASS，但 `run-parity-suite.mjs` 覆盖报告时丢失 `lastSmokeAt`；AI-HANDOFF 仍标 R47。

## 计划

| # | 任务 |
|---|------|
| 1 | `run-parity-suite` 写入时保留 `lastSmokeAt` |
| 2 | AI-HANDOFF 同步 R48 全量 timestamp |
| 3 | `make parity-smoke` 复验 |
| 4 | 提交 master + Gitea |

## R49 执行记录

（跑完填写）
