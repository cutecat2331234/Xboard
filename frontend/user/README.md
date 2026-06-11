# Xboard User Frontend

Vue 3 + Vite 8 + TypeScript + Naive UI 用户端，用于替换 `theme/Xboard/assets/umi.js`。

## 技术栈

- Vue 3.5
- Vite 8
- TypeScript
- Naive UI 2.44
- Vue Router (hash 模式)
- Pinia
- Axios (`/api/v1`)

## 开发

```bash
cd frontend/user
npm install
npm run dev
```

本地开发通过 `public/env.js` 模拟 `dashboard.blade.php` 注入的 `window.settings` 与 `window.routerBase`。API 请求由 Vite 代理到 `http://127.0.0.1:8000`。

## 构建

```bash
npm run build
```

构建产物输出到 `theme/Xboard/assets/`：

- 入口脚本：`umi.js`
- 静态资源：`assets/`、`chunks/`
- `index.html`（与主题目录结构一致，供独立预览）

生产环境由 `theme/Xboard/dashboard.blade.php` 注入配置并加载 `/theme/Xboard/assets/umi.js`。

## 配置注入

`dashboard.blade.php` 在页面中注入：

- `window.routerBase`
- `window.settings`（`title`、`assets_path`、`theme.color`、`logo`、`background_url`、`i18n` 等）

主题色映射：`default`（绿）、`blue`（蓝，默认）、`black`（深色）、`darkblue`（暗蓝）。

## 页面结构

Hash 路由（`createWebHashHistory`），路径不含 `#` 前缀。

- 认证（无壳层）：`/login`、`/register`、`/forgetpassword`
- 已登录壳层（`AppLayout`：Naive UI 侧栏 + 顶栏）
  - `/dashboard` — 仪表盘
  - `/knowledge` — 文档
  - 账单：`/order`、`/order/:trade_no`（订单详情）
  - `/invite` — 邀请返利
  - 订阅：`/plan`、`/plan/:id`（套餐详情）、`/node`（节点）
  - 账户：`/profile`（个人中心）、`/ticket`、`/ticket/:id`（工单详情）、`/traffic`（流量明细）

## 样式约定

全局覆盖 `.n-card`：不使用 `box-shadow`，统一使用边框，与 Xboard 用户端视觉一致。
