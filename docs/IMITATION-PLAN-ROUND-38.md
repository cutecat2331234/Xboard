# IMITATION-PLAN Round 38 — Parity 100% 单一真相源（2026-06-13）

## 背景

R23–R37 已完成 **87/87 Visual Gate 全绿**。用户反复要求「百分百」→ R38 不再改 UI，而是：

1. 建立**单一文档**说明 100% 范围与排除项
2. 提供**一键状态检查**（读报告 + 可选 smoke）
3. 更新 FEATURE-SURVEY 中过时的「进行中」标记

## 计划

| # | 任务 |
|---|------|
| 1 | 新增 `docs/PARITY-100.md` |
| 2 | 新增 `scripts/visual-gate/parity-status.mjs` |
| 3 | 新增 `scripts/check-parity.sh` 根入口 |
| 4 | 更新 FEATURE-SURVEY / README |
| 5 | 复验 verify-parity-quick + 提交 master |

## 100% 定义

| 范围 | 标准 | 状态 |
|------|------|------|
| user visual-gate | 16/16 | ✅ |
| admin visual-gate | 39/39 | ✅ |
| audit-admin-full | 26/26 | ✅ |
| probe-round29 dialogs | 6/6 | ✅ |
| **合计** | **87/87** | ✅ |

## 排除（非缺口）

- gift-generate dialog（7001 无行内生成）
- user gift-card 路由（7001 legacy 无页）

## R38 执行记录

| 验收 | 结果 |
|------|------|
| verify-parity-quick | **PASS** |
| parity-status.mjs | **PASS**（读 report 87/87） |

**结论**：100% 状态已文档化 + 一键可查；无 UI 代码变更。
