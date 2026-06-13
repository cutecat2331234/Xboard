# AI 交接文档 — Xboard 双前端仿造项目

> **最后更新**：2026-06-10  
> **仓库**：`cutecat2331234/Xboard`（GitHub）/ Forgejo `ookkyys/Xboard`（origin）  
> **当前分支**：`master`

本文档供后续 AI / 开发者快速接手，无需重读全部对话历史。

---

## 1. 项目目标

在 **同一 Laravel 后端** 上维护两套前端：

| 端口 | 服务器路径 | 前端来源 | 角色 |
|------|-----------|----------|------|
| **7001** | `/opt/xboard-legacy` | **原作者编译产物**（冻结对照） | 视觉与交互的「金标准」 |
| **7002** | `/opt/xboard` | **仿造源码 build** | 可维护的开源替代实现 |

**目标**：7002 在功能、布局、弹窗、图标、i18n 上与 7001 尽可能一致。  
**诚实状态（2026-06-10）**：管理端 **25 路由静态像素 25/25 PASS**；**深层弹窗像素仍约 3.3%–4.9%**（阈值 2%），**不能宣称 100% 一致**。

---

## 2. 仓库目录地图

```
Xboard/
├── legacy-dist/              # ★ 原作者编译后前端快照（闭源 dist，非源码）
│   ├── public/assets/admin/  # 管理端 build + locales + 部分反编译 chunk
│   ├── public/theme/Xboard/  # 用户端 umi.js / umi.css
│   └── theme/Xboard/         # blade 模板
├── frontend/
│   ├── user/                 # ★ 仿造用户端源码 Vue3 + Naive UI
│   └── admin/                # ★ 仿造管理端源码 React19 + Tailwind + shadcn
├── public/assets/admin/      # 管理端 build 产物（deploy 后同步）
├── theme/Xboard/assets/      # 用户端 build 产物
├── decompiled/
│   └── ui-spec/admin/        # 从 7001 采集的每路由 spec（截图、tokens、apis）
├── scripts/
│   ├── deploy-rewrite-frontend.py   # 构建并部署仿造版到 7002
│   ├── pull-legacy-frontend.py      # 从 7001 拉原版 dist → legacy-dist
│   ├── ssh-run.py                   # SSH 到 127.0.0.1 执行脚本
│   └── visual-gate/                 # 像素 diff / 弹窗审计 / 各类 probe
└── docs/
    ├── AI-HANDOFF.md         # 本文件
    ├── FRONTEND-REPLICA.md   # 仿造策略
    ├── BUG-REPORT.md         # 各轮 bug 记录
    ├── IMITATION-PLAN-ROUND-*.md  # 每轮仿造计划（最新 Round 34）
    └── COMPLETION-CHECKLIST.md
```

### 两套「前端」不要混淆

| 名称 | 是什么 | 能否改 UI 逻辑 |
|------|--------|----------------|
| `legacy-dist/` | 官方 **minified** 产物 + 备份 | 仅作对照，勿当可维护源码 |
| `frontend/user` + `frontend/admin` | **仿写源码** | 主要开发位置 |

`decompiled/` 是从 7001 页面/网络抓取的 **规格说明**，不是可编译源码。

---

## 3. 线上环境与账号

- **服务器**：`127.0.0.1`（root，业务与 7002 部署）
- **Forgejo**：`your-gitea.example.com:3000`（git origin）
- **管理后台**：`http://127.0.0.1:700{1,2}/#/`
- **测试账号**：`admin@example.com` / `your-password`
- **默认行为**：用户未说「仅开发」时，改完 frontend 应 **自动 deploy 到 7002**

```bash
python scripts/deploy-rewrite-frontend.py
python scripts/ssh-run.py scripts/restart-dual.sh
```

网络不稳时对 SSH/部署 **至少重试 3 次**。

---

## 4. 验收命令（必跑）

```bash
# 管理端 25 路由静态像素（阈值约 1%）
node scripts/visual-gate/audit-admin-full.mjs

# 8 个核心弹窗能否打开
node scripts/visual-gate/audit-dialogs-admin.mjs

# 扩展弹窗像素（user-edit / plan-add / server-add 等，阈值 2%）
node scripts/visual-gate/probe-round29-dialogs.mjs

# 弹窗结构指标（label 数、宽高、gap）
node scripts/visual-gate/probe-round31-styles.mjs
node scripts/visual-gate/probe-round34-deep.mjs
```

**注意**：7002 在 Octane 重启或多路 Playwright 并发时可能白屏，需 `restart-dual.sh` 后等待 ~20s 再测。

---

## 5. 当前进度摘要（Round 28–34）

### 已完成

- 管理端壳层：侧栏分组、CommandMenu、DataTable、PageToolbar、Tabler 图标
- 17+ 独立模块页（废弃 `ModulePage.tsx`）
- 用户编辑：**右侧 Sheet**、19 字段、Radix `FormSelect`、`ExpireDateInput` 为 outline 按钮
- 套餐/节点弹窗：字段数与 7001 对齐；Dialog 改为 **固定高度 + 中间滚动**
- 主题色 `--color-primary` 对齐 7001（slate，非 `#2d6565`）
- `SuffixInput` 后缀改为 `<div>`；Sheet 去掉 `sr-only Close`
- 礼品卡：7002 可 `scripts/seed-gift-template.php` 种子数据

### 仍未达标（Round 36 更新）

**Visual Gate parity 已于 R23 全绿**（`run-parity-suite.mjs` exit 0）：

| 套件 | 结果 |
|------|------|
| user visual-gate | 16/16 |
| admin visual-gate | 39/39（user-edit **1.684%**） |
| audit-admin-full | 26/26 |
| probe-round29 dialogs | 6/6 |

日常复验：`node scripts/visual-gate/verify-parity-quick.mjs`（~5–8 min）。

### 仍排除（非缺口）

| 场景 | 状态 | 原因 |
|------|------|------|
| gift-generate | 不可 gate | 7001 模板行无「生成」按钮（仅 Edit/Delete） |
| user gift-card | 默认 SKIP | 7001 legacy 无用户礼品卡页 |

详见 `docs/IMITATION-PLAN-ROUND-36.md`。

---

## 6. 关键源码文件

| 区域 | 路径 |
|------|------|
| 用户页 | `frontend/admin/src/pages/modules/UserPage.tsx` |
| 套餐页 | `frontend/admin/src/pages/modules/PlanPage.tsx` |
| 节点管理 | `frontend/admin/src/pages/modules/ServerManagePage.tsx` |
| 表单控件 | `FormSelect.tsx`, `SuffixInput.tsx`, `ExpireDateInput.tsx`, `TagInput.tsx` |
| 弹窗 | `components/ui/dialog.tsx`, `sheet.tsx` |
| 间距 | `index.css` → `.xb-stack-2/3/4` |
| i18n | `frontend/admin/public/locales/zh-CN.js` |
| 路由 | `frontend/admin/src/lib/admin-routes.ts` |

---

## 7. 开发原则（血泪教训）

1. **不要**用掩码造假 25/25；input 日期掩码可接受，整页掩码不行  
2. **不要**全局改 `gap` 或强行全站 `space-y`（曾恶化其他页）  
3. 7001 用户编辑有 **19 个 label**，勿误以为止于「账户状态」  
4. 7001 plan **添加模式**也有「套餐说明」区（17 label）  
5. 7001 到期时间是 **Button**，不是 `datetime-local` input  
6. 7001 弹窗多为 **固定高度 + 内滚动**，勿让 Dialog 随内容无限增高  
7. 对照优先：**实机 7001** > `legacy-dist` locales > `decompiled/ui-spec`

---

## 8. 给下一个 AI 的推荐任务顺序

1. 日常：`node scripts/visual-gate/verify-parity-quick.mjs`；发版前：`node scripts/visual-gate/run-parity-suite.mjs`
2. 若 dialog 回归：读 `probe-user-edit-deep.mjs` / `output/admin/*-diff.png`
3. gift-generate 仅当 7001 上游加入行内「生成」后再纳入 gate
4. 每轮更新 `IMITATION-PLAN-ROUND-*.md` + `BUG-REPORT.md`

---

## 9. 相关文档索引

- `docs/FRONTEND-REPLICA.md` — 仿造 vs legacy 策略  
- `docs/FRONTEND-COMPARE.md` — 双端口说明（部分段落可能过时，以本文为准）  
- `docs/BUG-REPORT.md` — 历史 bug 与修复  
- `docs/COMPLETION-CHECKLIST.md` — 总完工清单  
- `legacy-dist/README.md` — 原版 dist 用途说明

---

## 10. Git 与发布

- **GitHub**：`github` remote → `cutecat2331234/Xboard`  
- **Forgejo**：`origin` remote（主开发推送习惯因团队而异）  
- 提交前确认 **勿提交** `.env`、服务器密码、token（见 `.gitignore`）

若用户要求「上传到 GitHub」，应包含：`legacy-dist/`、`frontend/`、`decompiled/`、`scripts/visual-gate/`、build 产物与本文档。
