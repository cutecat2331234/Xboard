# AI 交接文档 — Xboard 双前端仿造项目

> **最后更新**：2026-06-13（R47 — CI parity-check）  
> **仓库**：GitHub `origin` · Gitea `http://https://github.com/cutecat2331234/Xboard`  
> **当前分支**：`master`

本文档供后续 AI / 开发者快速接手，无需重读全部对话历史。

---

## 1. 项目目标

在 **同一 Laravel 后端** 上维护两套前端：

| 端口 | 服务器路径 | 前端来源 | 角色 |
|------|-----------|----------|------|
| **7001** | `/opt/xboard-legacy` | **原作者编译产物**（冻结对照） | 视觉与交互的「金标准」 |
| **7002** | `/opt/xboard` | **仿造源码 build** | 可维护的开源替代实现 |

**目标**：7002 在功能、布局、弹窗、图标、 i18n 上与 7001 尽可能一致。

**当前状态（2026-06-13）**：**87/87 Visual Gate + 2/2 cmp-only + 功能覆盖 100%**（合计 **89 场景**）。  
单一真相源：`docs/PARITY-100.md` · 报告：`scripts/visual-gate/output/parity-suite-report.json`

parity 不可 1:1 的两项（7001 无 UI）已由 **cmp-only** 步骤覆盖：`gift-generate`、`user-gift-card`。

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
    ├── IMITATION-PLAN-ROUND-*.md  # 每轮仿造计划（最新 Round 47）
    ├── PARITY-100.md            # ★ Visual Gate 100% 定义与命令
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
- **Forgejo**：`your-gitea.example.com`（Gitea remote `gitea`）
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
make parity-check        # 严格校验报告（87+2，不发跑 gate）
make parity              # 读上次全量报告
make parity-smoke        # 日常 smoke ~15 min（含 cmp-only）
make parity-full         # 发版全量 ~65 min
```

等价：

```bash
node scripts/visual-gate/parity-status.mjs [--check|--smoke|--full]
node scripts/visual-gate/run-parity-suite.mjs   # 全量套件
```

**注意**：7002 在 Octane 重启或多路 Playwright 并发时可能白屏，需 `restart-dual.sh` 后等待 ~20s 再测。

---

## 5. 当前进度摘要（R44 终局）

### 100% 已达成（89 场景）

| 套件 | 结果 |
|------|------|
| user visual-gate | 16/16 |
| admin visual-gate | 39/39（含 user-edit ~1.68%） |
| audit-admin-full | 26/26 |
| probe-round29 dialogs | 6/6（每场景最多 3 次重试） |
| cmp-only（7002 独有） | 2/2（gift-generate + user-gift-card） |
| 功能覆盖（FEATURE-SURVEY） | 100% |

日常复验：`make parity-smoke` · 发版前：`make parity-full` · CI/快速：`make parity-check`  
GitHub Actions：`parity-check.yml` 校验已提交报告（push/PR 自动跑）。

### Parity 排除项 → cmp-only 覆盖

| 场景 | parity | cmp-only |
|------|--------|----------|
| gift-generate | 7001 无「生成」按钮 | ✅ `verify-cmp-only.mjs` |
| user gift-card | 7001 legacy 无页 | ✅ `verify-cmp-only.mjs` |

详见 `docs/PARITY-100.md`、`docs/IMITATION-PLAN-ROUND-43.md`。

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

**Parity 仿造线已完工。** 仅在以下情况继续开发：

1. 改动了 `frontend/admin` 或 `frontend/user` → `make parity-smoke`（或 `--full` 发版前）
2. dialog 回归 → `output/admin/*-diff.png` + `probe-user-edit-deep.mjs`
3. 7001 上游新增 UI → 扩展 `DIALOG_ROUTES` / cmp-only 后再 gate
4. 新功能（7002 独有）→ 单独规划，不破坏 87/87 parity（cmp-only 可扩展）

---

## 9. 相关文档索引

- `docs/FRONTEND-REPLICA.md` — 仿造 vs legacy 策略  
- `docs/FRONTEND-COMPARE.md` — 双端口说明（部分段落可能过时，以本文为准）  
- `docs/BUG-REPORT.md` — 历史 bug 与修复  
- `docs/COMPLETION-CHECKLIST.md` — 总完工清单  
- `legacy-dist/README.md` — 原版 dist 用途说明

---

## 10. Git 与发布

- **GitHub**：`origin` → `cutecat2331234/Xboard`  
- **Gitea**：`gitea` → `http://https://github.com/cutecat2331234/Xboard.git`  
- 提交前确认 **勿提交** `.env`、服务器密码、token（见 `.gitignore`）

改完 frontend 且用户未说「仅开发」时，应 deploy 到 **7002**（`python scripts/deploy-rewrite-frontend.py`）。
