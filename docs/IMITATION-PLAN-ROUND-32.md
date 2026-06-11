# Round 32 仿造计划 — 弹窗像素压差

## 探测结论（Round 31 基线 + diff 分析）

| 差异点 | 7001 | 7002 问题 | 修复方向 |
|--------|------|----------|----------|
| 到期时间控件 | **Button** + 占位文案 + 日历图标 | `input` 文本框 | `ExpireDateInput` 改 outline button |
| 表单间距 | `space-y-2` 字段内 + `space-y-4` 行间 | 混用 `gap-2`（TW v4 语义偏差） | 全量 `xb-stack-2` / `xb-stack-4` |
| Sheet 页脚 | 流式布局，无 `mt-auto` 顶底分离 | `mt-auto` + `border-t` | 去掉顶边框与 `mt-auto` |
| 创建用户 | 含 **到期时间** 字段 | 缺失 | 补 `ExpireDateInput` |
| plan-add 高度 | ~774px | ~855px（textarea 过高） | `min-h-[72px]` |
| gift 弹窗 | 有模板数据 | 无数据 SKIP | SSH/API 种子（P1） |

## Round 32 实施

1. `ExpireDateInput` → button 形态
2. `UserPage` 统一 stack；创建表单补到期；页脚对齐
3. `PlanPage` 说明 textarea 高度
4. `probe` 掩码跳过 date button

## 验收

```bash
node scripts/visual-gate/probe-round29-dialogs.mjs
node scripts/visual-gate/probe-round31-styles.mjs
node scripts/visual-gate/audit-admin-full.mjs
```
