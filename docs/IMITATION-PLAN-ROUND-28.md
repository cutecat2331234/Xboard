# Round 28 仿造计划（配置子页 DOM 终局对齐）

## 起点（Round 27 审计）

| 路由 | diff | 状态 |
|------|------|------|
| config-safe | 1.496% | FAIL |
| config-subscribe | 1.752% | FAIL |
| config-invite | 1.39% | FAIL |
| config-server | 1.34% | FAIL |
| config-telegram | 1.043% | FAIL |
| 其余 20 路由 | <1% | PASS |

弹窗：**8/8 OK**

## 探测结论（probe-config-fail-round28 / probe-server-7001）

| 对比项 | 7001 | 7002（R27） | 修复 |
|--------|------|-------------|------|
| 字段栈间距 | `space-y-2` > `space-y-0.5` | `flex gap-2` / `[&>*+*]:mt-*` 无效 | `.xb-stack-2` / `.xb-stack-05`（margin-top 兄弟选择器，对齐 TW v3） |
| subscribe 末两开关 | 嵌套 `space-y-0.5`（2 子节点） | 误用 `flat` | 去掉 `show_info_*` / `show_protocol_*` 的 `flat` |
| subscribe 前两开关 | 扁平 3 子节点 | 已 flat | 保持 |
| subscribe_path 描述 | `p.text-[0.8rem]` | 曾用 `div.text-sm` | 改回 `p.text-[0.8rem]` |
| server 通讯密钥 | `relative` + `pr-10` + 刷新按钮 | 纯 input | `ServerTokenField` + `IconRefresh` |
| server 轮询间隔 | `type=number` | `type=text` | `FormField type="number"` |
| server WS 开关 | `space-y-2 flex flex-row … border p-4` | 普通 SwitchField | `ServerWsSwitchCard` |
| server 提示条 | `text-blue-700` + dark 变体 | `text-blue-900` | 对齐 7001 class |
| 表单容器 | `space-y-4`（块级） | `flex gap-4` | **保留 gap-4**（实测 gap 对 subscribe 更优；改 space-y 会回退） |
| input class | 含 `file:*` 工具类 | 缺失 | `form-styles.ts` 补齐 |

## R28 已实现

1. **`index.css`** — `.xb-stack-2`、`.xb-stack-05`、`.xb-stack-4`（仅备用，表单容器最终保留 `gap-4`）
2. **`ConfigPage.tsx`** — `xb-stack-*` 字段组件、`ServerTokenField`、`ServerWsSwitchCard`、subscribe 开关变体修正
3. **`ConfigFormSelect.tsx`** — `xb-stack-2` 栈
4. **`config-section-fields.tsx`** — 邮件 Tab `xb-stack-4`
5. **探测脚本** — `probe-config-fail-round28.mjs`、`probe-safe-compare.mjs`、`probe-server-7001.mjs`、`audit-config-quick.mjs`
6. **审计输出** — `audit-round28-report.json`、`audit-round28/` diff 图

## R28 验收（2026-06-11，已部署 7002）

### 弹窗 — **8/8 OK**

### 像素全量（`audit-admin-full.mjs`，zh-CN，input 掩码，阈值 1%）

| 结果 | 数量 |
|------|------|
| **PASS** | **25/25** |
| **FAIL** | **0** |

重点 config 子页：

| 路由 | diff |
|------|------|
| config-site | 0% |
| config-safe | 0.065% |
| config-subscribe | 0.146% |
| config-invite | 0.001% |
| config-server | 0.371% |
| config-telegram | 0% |

> **注意**：7002 网络不稳定时审计可假性升至 ~2.3%（页面未完全加载）。需部署后等待 ~30s 再跑，或重试。

## 诚实结论

- **像素门禁**：**25/25 PASS**（Round 27 为 20/25）
- **功能 / 弹窗 / 图标**：保持 R26–R27 对齐
- **不能宣称运行时 100% 一致**（动态数据、Monaco 内容、表格行数据仍掩码/抽样），但静态 DOM+样式已与 7001 实机对齐

## 验收命令

```bash
python scripts/deploy-rewrite-frontend.py
node scripts/visual-gate/audit-dialogs-admin.mjs
node scripts/visual-gate/audit-admin-full.mjs
node scripts/visual-gate/audit-config-quick.mjs   # 仅 5 个曾 FAIL 的 config 子页
```
