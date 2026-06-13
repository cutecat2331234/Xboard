# IMITATION-PLAN Round 39 — 功能覆盖 100% 文档对齐（2026-06-13）

## 背景

Visual Gate **87/87 已 100%**（R23–R38）。FEATURE-SURVEY 仍有多处 ⚠️「需核对」，实机代码审查显示**均已实现**。

## 计划

| # | 任务 |
|---|------|
| 1 | 核对 traffic-reset / system / transfer / gift-card / telegram / mailLink 源码 |
| 2 | 更新 FEATURE-SURVEY → ✅ |
| 3 | PARITY-100.md 增加「功能覆盖」章节 |
| 4 | parity-status `--smoke` 写入 lastSmokeAt |
| 5 | verify-parity-quick 复验 + 提交 master |

## R39 执行记录

| 项 | 结论 |
|----|------|
| traffic-reset | ✅ `TrafficResetPage` + `UserPage` 弹窗 |
| system/Horizon | ✅ `DashboardPage` 失败任务弹窗 |
| transfer | ✅ `InvitePage.vue` |
| user gift-card | ✅ `GiftCardPage.vue`（7001 无页，gate 排除） |
| telegram | ✅ `ProfilePage` + `AuthPage` widget |
| mailLink login | ✅ `AuthPage.vue` |

**结论**：仿写前端功能覆盖 **100%**（相对后端 API 清单）；Visual Gate 维持 87/87。
