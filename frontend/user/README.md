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

- 认证：`/login`、`/register`
- 已登录壳层：顶栏 + 侧栏
  - 仪表盘 `/dashboard`
  - 订阅 `/subscribe`
  - 文档 `/knowledge`
  - 工单 `/ticket`
  - 个人中心 `/profile`

## 样式约定

全局覆盖 `.n-card`：不使用 `box-shadow`，统一使用边框，与 Xboard 用户端视觉一致。
