# Round 31 仿造计划 — 实测结构对齐

## 探测结论（probe-round31-styles.mjs）

| 场景 | 7001 实测 | 7002 修前 | 根因 |
|------|----------|----------|------|
| user-edit | gap **16px**；**19** 个 label（含佣金/限速等） | gap **24px**；仅 11 label | 误删字段 + Sheet gap 偏大 |
| plan-add | 宽 **550px**；价格区有 **label**；含说明+模板/预览按钮 | 宽 672px；placeholder 价；缺说明区 | 布局/i18n/宽度 |
| server-add | 标题「**新建节点**」；13 字段；`rate.label`/`port.label` | i18n 对象泄漏；6 字段；「保存」 | 表单未仿造 + 错误 t() key |

## Round 31 实施

### P0 已完成
1. **UserPage**：恢复佣金/折扣/限速/设备/备注/管理员字段；Sheet `gap-4` + `overflow-y-scroll`
2. **PlanPage**：`max-w-[550px]`、`p-0` 分区；价格 **Label+输入**；流量包/重置包；说明区+模板/预览
3. **ServerManagePage**：按 7001 重建新建节点表单（协议选择、动态倍率、标签、路由、父节点、绑定服务器等）；修正 `server.form.rate.label` 等 i18n；「提交」

### P1 待验收
4. 扩展弹窗像素 probe <2%
5. GiftCard 种子数据
6. user-create / user-mail 弹窗结构

## 验收

```bash
python scripts/ssh-run.py scripts/restart-dual.sh
python scripts/deploy-rewrite-frontend.py
node scripts/visual-gate/audit-admin-full.mjs
node scripts/visual-gate/audit-dialogs-admin.mjs
node scripts/visual-gate/probe-round29-dialogs.mjs
node scripts/visual-gate/probe-round31-styles.mjs
```
