# 前台 + 后台仿造源码策略

**目标**：`frontend/user` 与 `frontend/admin` 为可 `npm run dev` / `npm run build` 的源码树；7002 仅部署 build 产物，7001 永冻结原版 dist 作对照。

## 对照环境

| 端口 | 路径 | 前端 |
|------|------|------|
| **7001** | `/opt/xboard-legacy` | 冻结原版 dist（`legacy-dist/` 快照） |
| **7002** | `/opt/xboard` | **仿造源码 build** |

## 构建输出

| 工程 | 命令 | 产物 |
|------|------|------|
| 用户端 | `cd frontend/user && npm run build` | `theme/Xboard/assets/umi.js`（单文件，`inlineDynamicImports`） |
| 管理端 | `cd frontend/admin && npm run build` | `public/assets/admin/` + `manifest.json` |

## 部署（仅 7002）

```bash
python scripts/deploy-rewrite-frontend.py
python scripts/ssh-run.py scripts/restart-dual.sh
```

**不触碰** `/opt/xboard-legacy`。原版 dist 复制脚本（`deploy-original-frontend.py`）仅用于 7001 参照维护。

## 审计与门禁

- `decompiled/ui-spec/` — 每路由截图、computed-styles（含 box-shadow）、apis
- `decompiled/PAGES.md`、`API-INVENTORY.md`、`INTERACTIONS.md`
- `scripts/capture-ui-spec.mjs` — 从 7001 采集 ui-spec
- `scripts/visual-gate.mjs` — 7001 vs 7002 像素 diff + console 零错误

## 技术栈

- 用户端：Vue 3 + Vite + TS + Naive UI + pinia + vue-router（hash）
- 管理端：React 19 + Vite + Shadcn/Tailwind + react-router（hash `#/sign-in`）

样式与原版 **完全一致（含阴影）**，禁止「去阴影」策略。
