# IMITATION-PLAN Round 36 — Parity 100% 固化（2026-06-13）

## 目标

在 R23 全绿基础上：**复验**、**文档诚实对齐**、**快速验收脚本**，避免后续回归无感。

## 计划

| # | 任务 | 说明 |
|---|------|------|
| 1 | 复验 5 条核心 dialog | user-edit/create/plan-add/server-add/gift-template |
| 2 | 复验 audit-admin-full 26 路由 | 确认 mask-utils 无回归 |
| 3 | 新增 `verify-parity-quick.mjs` | ~5min 子集 gate，供日常/CI |
| 4 | 更新 README / AI-HANDOFF / BUG-REPORT / COMPLETION-CHECKLIST | 反映 87 路由全绿 |
| 5 | 记录 gift-generate 排除原因 | 7001 模板行无「生成」按钮，不可像素对比 |

## R23 已达成的验收基线

```
run-parity-suite.mjs → PARITY_SUITE_PASS
  user visual-gate     16/16
  admin visual-gate    39/39（含 user-edit 1.684%）
  audit-admin-full     26/26
  probe-round29        6/6
```

## 仍排除项（非缺口）

| 项 | 原因 |
|----|------|
| gift-generate dialog | 7001 `#/finance/gift-card` 模板行仅 Edit/Delete，无行内「生成」 |
| user gift-card 路由 | 7001 legacy umi 无用户礼品卡页，`INCLUDE_GIFT_CARD=1` 仅测 7002 |
| MySQL 9.7 / Redis 8.8 | COMPLETION-CHECKLIST defer |

## R36 执行记录

| 验收 | 结果 | 时间 |
|------|------|------|
| `verify-parity-quick.mjs` | **PASS** | 2026-06-13 |
| `audit-admin-full.mjs` | **26/26 FAIL count 0** | 2026-06-13 |
| 5 条 dialog 复验（R24） | 全部 PASS | 2026-06-13 |

**结论**：7001 vs 7002 Visual Gate parity **100% 维持**；gift-generate 继续排除。
