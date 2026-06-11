# Round 24 仿造计划（DOM 级对比与配置页收尾）

基准：7001 实机 DOM 探测 + `audit-config-quick.mjs` + `legacy-dist` locale。

## R24 对比方法

1. **Playwright DOM 探测**（`scripts/visual-gate/probe-*.mjs`）
   - 字段顺序、Switch/Select 结构、条件显示、文案、combobox 数量
2. **像素审计**（`audit-admin-full.mjs` zh-CN 25 路由）
3. **弹窗清点**（`audit-dialogs-admin.mjs`）

## 已确认根因（7001 vs 7002）

| 区域 | 7001 | 7002（修复前） | 处理 |
|------|------|----------------|------|
| safe 条件字段 | 开关关闭时隐藏子字段 | 始终显示 captcha/白名单/注册限制字段 | ✅ `config-section-fields.tsx` 按开关条件渲染 |
| subscribe 下拉 | Radix `role=combobox` ×5 | 原生 `<select>` ×4 | ✅ `ConfigFormSelect` + `@radix-ui/react-select` |
| captcha 类型 | combobox | 原生 select | ✅ 同上 |
| telegram | 仅 3 项（token/启用/群链接） | 多 Webhook 区块 | ✅ 移除 Webhook UI，对齐 7001 实机 |
| 表单间距 | `space-y-*` | `gap-*` | ✅ `ConfigPage` FormField/SwitchField/布局 |
| 配置页行布局 | `space-y-8 lg:space-x-12` | `gap-8 lg:gap-12` | ✅ 已改 |
| subscribe_path 描述 | `div.text-sm` + `<br>` 三行 | 单行 `p.text-[0.8rem]` | ✅ 已改 |
| 侧栏 tabler 计数 | 35 | 34 | ✅ `tabler-nav-icons.tsx` 补 `tabler-icon` class |

## R24 修复文件

- `frontend/admin/src/components/ui/select.tsx`（新建）
- `frontend/admin/src/components/shared/ConfigFormSelect.tsx`（新建）
- `frontend/admin/src/pages/ConfigPage.tsx`
- `frontend/admin/src/pages/config-section-fields.tsx`
- `frontend/admin/src/pages/TelegramConfigFields.tsx`
- `frontend/admin/src/lib/tabler-nav-icons.tsx`
- `scripts/visual-gate/audit-admin-full.mjs`（round24 输出、去掉 networkidle 挂起）

## 审计结果（修复后 quick audit，clip x=256）

| 路由 | diff% | 结构 |
|------|-------|------|
| config-safe | ~1.50 | labels/combobox/switches 与 7001 一致 |
| config-subscribe | ~2.03→待复验 | combobox=5, selects=0 |
| config-invite | ~1.58 | 10 labels 一致 |
| config-telegram | ~1.46 | 3 labels 一致 |

**结构已对齐**；剩余 ~1.5% 像素差主要来自：顶栏/header 抗锯齿、Switch 子像素、配置区截图含页眉噪声。文案经探测与 7001 一致。

## R24-P1 弹窗（待稳定跑完）

`audit-dialogs-admin.mjs` 覆盖：user/order/server_manage/plugin/gift-card/plan/coupon/dashboard。

服务器偶发 502/登录超时会导致脚本中断，需 `restart-dual.sh` 后重跑。

## R24-P2 仍无法宣称 100% 的项

- 配置子页像素阈值 1% 尚未全绿（~1.5% 余量）
- 弹窗逐页交互审计未完整跑通
- legacy locale 含 Telegram Webhook 文案，但 **7001 实机不展示**（以实机为准）
- 用户端 login/register 分路由等已知非缺口

## 验收命令

```bash
python scripts/deploy-rewrite-frontend.py
python scripts/ssh-run.py scripts/restart-dual.sh
node scripts/visual-gate/audit-config-quick.mjs
node scripts/visual-gate/audit-admin-full.mjs
node scripts/visual-gate/audit-dialogs-admin.mjs
```
