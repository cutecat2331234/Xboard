# Round 26 仿造计划（深度对比 + 关键缺陷修复）

## 对比方法

- 实机 Playwright：`probe-round26-deep.mjs`、`probe-round26-icons.mjs`、`probe-field-metrics.mjs`
- 像素门禁：`audit-admin-full.mjs`（CONFIG_CLIP y=64）
- 弹窗门禁：`audit-dialogs-admin.mjs`
- 参照：7001 原作者版 + legacy-dist 侧栏图标类名

## R25 → R26 发现的根因

| # | 区域 | 7001 | 7002（修复前） | 严重度 |
|---|------|------|----------------|--------|
| 1 | 邮件设置 | 7 字段 + 2 Tab 正常 | **整页白屏**（Radix Select `value=""` 抛错） | P0 |
| 2 | Dashboard 失败任务 | `<span class="text-destructive">` | `<button class="text-destructive">` → 弹窗审计 GAP | P0 |
| 3 | 侧栏图标 | `device-desktop/news/server-cog/...` 等 25 个 tabler | 错误图标集 + 缺 `menu-2`（24 vs 25） | P1 |
| 4 | Switch 表单项 | `label → desc → switch` 同级 `space-y-2` | 多包一层 `space-y-0.5`（高度差 ~4–8px/项） | P1 |
| 5 | 站点设置 | 无「试用时长」当未选试用套餐 | 始终显示 `try_out_hour` | P1 |
| 6 | 邮件加密顺序 | 端口后紧跟「加密方式」 | 用户名/密码在加密前 | P2 |
| 7 | 邮件发件人 | 仅「发件人地址」 | 多「发件人名称」字段 | P2 |

## R26 已实现修复

1. **ConfigFormSelect** — 空字符串映射 `__none__`，修复邮件页崩溃
2. **SwitchField** — 扁平 DOM 对齐 7001（`space-y-2` 直接子级）
3. **tabler-nav-icons.tsx** — 全量替换为 7001 图标名（`device-desktop`、`news`、`server-cog`、`cash`、`building-store` 等）
4. **Sidebar** — 增加 `tabler-icon-menu-2`
5. **DashboardPage** — 失败任务计数改 `span[role=button]`
6. **ConfigPage** — `try_out_hour` 条件渲染；`subscribe_path` 用 `space-y-2`
7. **config-section-fields** — 邮件字段顺序；移除 7001 无 UI 的 `email_from_name`
8. **audit-dialogs** — dashboard 触发器改 `span.text-destructive`
9. **audit-admin-full** — `ensureZhPage` 重登；config 等 `h3`；输出 `audit-round26-report.json`

## R26 验收结果（2026-06-11 部署后）

### 弹窗审计 — **8/8 OK**

```
user / order / server_manage / plugin / gift-card / plan / coupon / dashboard 全部 OK
```

### 全量像素审计 — **22/25 PASS**（阈值 1%）

| 路由 | diff% | 状态 |
|------|-------|------|
| config-safe | 1.398% | FAIL |
| config-subscribe | 2.144% | FAIL |
| config-invite | 1.096% | FAIL |
| 其余 22 路由 | <1% | PASS |

结构元数据（tabs、asideTabler 35、asideLucide 1）三页均已对齐，剩余为表单区亚像素/行高累积偏差。

## R27 待办（诚实剩余）

1. **config-invite**（1.096%）— 微调表单项行高或 `space-y-*`，优先攻克（最接近通过）
2. **config-safe**（1.398%）— 条件字段（验证码/密码限制）与 7001 开关默认态同步验证
3. **config-subscribe**（2.144%）— 事件 Select 宽度 140px 已对齐；复查 `reset_traffic` 全宽 700px 与描述换行
4. **User/Order/GiftCard** — 弹窗审计触发器未覆盖 DropdownMenu 内编辑（功能已存在，门禁待扩展）
5. **已知非缺口** — Telegram Webhook locale 有但 7001 无 UI；traffic-reset 7001 为 404

## 验收命令

```bash
python scripts/ssh-run.py scripts/restart-dual.sh
python scripts/deploy-rewrite-frontend.py
node scripts/visual-gate/audit-dialogs-admin.mjs
node scripts/visual-gate/audit-admin-full.mjs
```
