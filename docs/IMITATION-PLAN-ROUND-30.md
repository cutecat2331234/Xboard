# Round 30 仿造计划 — 扩展弹窗像素 + 全局图标

## 对比结论（7001 vs 7002，Round 29 基线）

| 区域 | 7001 | 7002（修前） | 差距类型 |
|------|------|-------------|----------|
| user-edit Sheet | 右侧抽屉；到期时间为文本+日历图标；底部「提交」 | datetime-local；「保存」；number 步进器 | 控件形态 + 文案 |
| plan-add Dialog | 双列网格；标签；后缀 GB/Mbps/台/人；虚线价格区+基础价+清空 | 单列；缺标签/重置方式；i18n key 泄漏；8 价平铺 | 布局 + i18n |
| 表行操作图标 | Tabler IconDots | Lucide MoreHorizontal（9 页） | 图标 |
| 25 路由静态像素 | PASS | 25/25（偶发 7002 白屏假 FAIL） | 已达标 |
| gift 模板弹窗 | 可点编辑/生成 | 无种子数据 SKIP | 数据 |

## Round 30 实施项

### P0 — 已实施
1. **UserPage**：`ExpireDateInput`（文本+日历）；`SuffixInput` 去步进器；`提交` 文案；账户状态「封禁」；Sheet `p-6`
2. **PlanPage**：双列表单；`TagInput`；后缀输入；`reset_traffic_method`；虚线价格区+基础价+清空；修正 i18n key（`add_title`/`price.title`/`submit.submit`）
3. **全局 IconDots**：Notice/Payment/Coupon/Knowledge/ServerGroup/Route/Machine/Manage/Ticket

### P1 — 待验收/续作
4. 扩展弹窗像素 probe 重跑（阈值 2%）
5. GiftCard SSH 种子模板后补 gift 弹窗对比
6. server-add 弹窗布局对齐（若仍 >2%）
7. user-create / user-mail probe 截图尺寸统一

## 验收命令

```bash
python scripts/ssh-run.py scripts/restart-dual.sh
python scripts/deploy-rewrite-frontend.py
node scripts/visual-gate/audit-admin-full.mjs
node scripts/visual-gate/audit-dialogs-admin.mjs
node scripts/visual-gate/probe-round29-dialogs.mjs
```

## 诚实结论

静态 25 路由 ≠ 弹窗/交互 100% 一致；Round 30 聚焦扩展弹窗与图标，验收后更新 `BUG-REPORT.md`。
