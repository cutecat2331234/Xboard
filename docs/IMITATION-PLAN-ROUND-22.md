# Round 22 仿造验收（7001 legacy vs 7002 仿写）

基准：`legacy-dist/public/assets/admin`、`audit-round22-report.json`（**zh-CN** 全量 25 路由）。

## 执行摘要

| 项 | Round 21 末 | Round 22 末 |
|----|-------------|-------------|
| 部署 | 本地 build 未上机 | admin 已部署至 7002 |
| 结构 gate | monaco/tabs/侧栏多项 FAIL | **25/25 结构对齐**（gaps 数组全空） |
| 像素 audit | 5 FAIL + order 1.95% | **22/25 PASS**（3 个 config 子页略超 1%） |
| visual-gate zh-CN | 未完整跑 | 部分跑通（网关抖动中断） |
| dashboard tables | 7002 多 2 个 `<table>` | **已修** → 0 vs 0 |

## 全量 Pass/Fail 表（`audit-admin-full.mjs`，1280×800，zh-CN）

| 路由 | diff% | limit | 像素 | 结构 gaps |
|------|-------|-------|------|-----------|
| dashboard | 0.451 | 0.5% | **PASS** | — |
| config-site | 0.164 | 1% | PASS | — |
| config-safe | **1.183** | 1% | **FAIL** | — |
| config-subscribe | **1.681** | 1% | **FAIL** | — |
| config-invite | 0.962 | 1% | PASS | — |
| config-server | 0.604 | 1% | PASS | — |
| config-email | 0.796 | 1% | PASS | — |
| config-telegram | **1.296** | 1% | **FAIL** | — |
| config-app | 0.167 | 1% | PASS | — |
| config-subscribe-template | 0.534 | 1% | PASS | monaco×1 tabs×6 ✓ |
| plugin | 0.812 | 1% | PASS | tabs×3 ✓ |
| theme | 0.265 | 1% | PASS | — |
| notice | 0.503 | 1% | PASS | — |
| payment | 0.606 | 1% | PASS | — |
| knowledge | 0.509 | 1% | PASS | — |
| server_manage | 0.714 | 1% | PASS | — |
| server_machine | 0.907 | 1% | PASS | — |
| server_group | 0.472 | 1% | PASS | — |
| server_route | 0.434 | 1% | PASS | — |
| plan | 0.682 | 1% | PASS | — |
| order | 0.570 | 1% | PASS | 表格数据已 mask |
| coupon | 0.727 | 1% | PASS | — |
| gift-card | 0.509 | 1% | PASS | tabs×4 ✓ |
| user | 0.833 | 1% | PASS | — |
| ticket | 0.700 | 1% | PASS | tabs×2 ✓ |

**统计：22 PASS / 3 FAIL（均为 config 表单子页像素微差，无 DOM 结构项）**

报告路径：`scripts/visual-gate/output/audit-round22-report.json`  
差异图：`scripts/visual-gate/output/audit-round22/*-diff.png`

## Round 21 → 22 已关闭项（P0 结构）

| ID | 页面 | Round 21 | Round 22 |
|----|------|----------|----------|
| R21-01 | subscribe-template | monaco 0 tabs 0 | **monaco 1 tabs 6** ✓ |
| R21-02 | config/email | tabs 0 | **tabs 2** ✓ |
| R21-03 | 侧栏 lucide | asideLucide 4 | **asideLucide 1** ✓ |
| R21-08 | ticket | tabs 0 | **tabs 2** ✓ |
| R21-04 | order | 1.95% FAIL | **0.57% PASS**（+ tbody mask） |
| R22-01 | dashboard tables | tables 2 vs 0 | **tables 0 vs 0** ✓ |

## 仍存差距（诚实清单）

### P1 — 像素（audit 未绿）

| 路由 | diff% | 可能原因 |
|------|-------|----------|
| config-safe | 1.183% | 安全设置表单项纵向间距 / 验证码条件区块微布局 |
| config-subscribe | 1.681% | 订阅路径说明文案换行、select 高度 |
| config-telegram | 1.296% | Telegram 字段组间距 |

### P2 — 微结构（未计入 gaps 数组，但探针可见）

| 项 | 7001 | 7002 | 说明 |
|----|------|------|------|
| asideTabler | 25（或 config 35） | 24（或 34） | 全站稳定少 1 个 `tabler-icon` 计数，不影响功能 |
| dashboard 流量排行 | `h-[400px]` 列表区 | 已对齐 div 网格 | Round 22 修复 |

### P2 — 弹窗 live 扫（未在本轮逐页执行）

- ServerManage 编辑 / ECH / 批量
- UserPage 编辑 / 分配订单 / 邮件 / 封禁
- Order 详情 Dialog
- Plugin 配置 / 上传 ZIP
- GiftCard 模板 / 生成

### P3 — 基础设施

- `deploy-rewrite-frontend.py` 在 Windows 上因 `theme/Xboard/assets/umi.js` EPERM 失败 → 本轮改用 **admin-only SFTP 部署**
- 长跑 audit 期间 7002 偶发 **502/504** → 需 `restart-dual.sh` 后重跑
- `visual-gate.mjs` zh-CN 全量：sign-in PASS；dashboard 首轮 1.92% FAIL；后续路由因 gateway 中断

## Round 22 代码变更

| 文件 | 变更 |
|------|------|
| `frontend/admin/src/pages/DashboardPage.tsx` | `RankCard` 由 `<table>` 改为 div 网格 + `h-[400px]`，对齐 7001 |
| `scripts/visual-gate/audit-admin-full.mjs` | 登录态复用、表格 volatile mask、monaco 等待（Round 21 末已有） |
| `scripts/visual-gate/probe-round22-quick.mjs` | 7001/7002 DOM 快探 |
| `scripts/visual-gate/probe-dashboard-dom.mjs` | dashboard 结构探针 |
| `scripts/visual-gate/probe-traffic-rank-html.mjs` | 7001 流量排行 HTML 采样 |

## 建议 Round 23

1. 定位 asideTabler 24 vs 25 的单一缺失图标（侧栏或 config 子导航）
2. config-safe / subscribe / telegram 表单项 padding/gap 对照 `decompiled/ui-spec/admin/config/*`
3. visual-gate zh-CN 全 26 路由在稳定网络下双轮 `run-admin-gate-stable.mjs`
4. P2 弹窗 live-sweep 补录

## 命令

```powershell
cd frontend/admin; npm run build
python scripts/deploy-rewrite-frontend.py   # 或 admin-only SFTP
python scripts/ssh-run.py scripts/restart-dual.sh
node scripts/visual-gate/audit-admin-full.mjs
cd scripts/visual-gate
$env:SIDE='admin'; $env:ADMIN_LOCALE='zh-CN'; node visual-gate.mjs
```
