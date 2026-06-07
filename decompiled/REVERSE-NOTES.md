# 反编译与 API 摘录

## 用户端 umi.js

- 源：`legacy-dist/public/theme/Xboard/assets/umi.js`
- 仿写：`frontend/user` → `theme/Xboard/assets/umi.js` + `umi.css`
- webcrack 输出：`decompiled/user/`（Linux 上运行 `node scripts/decompile-frontends.mjs`）
- Windows 回退：`node scripts/decompile-fallback.mjs` → `routes.json` / `apis-grep.json`

## 管理端

- 源：`legacy-dist/public/assets/admin/assets/index-*.js`
- 仿写：`frontend/admin` → `public/assets/admin/` + `manifest.json`
- 反编译：`decompiled/admin/`

## API 前缀

- 用户：`/api/v1/*`，鉴权 `localStorage.xboard_auth_data` → `Authorization`
- 管理：`/api/v2/{secure_path}/*`，登录 `/api/v2/passport/auth/login`

## 用户 hash 路由（10 页）

`#/login` · `#/register` · `#/dashboard` · `#/plan` · `#/order` · `#/invite` · `#/traffic` · `#/knowledge` · `#/ticket` · `#/profile`

无独立 `#/subscribe`（订阅走 `user/getSubscribe`）。

## 管理端侧栏

见 `decompiled/PAGES.md` 与 `legacy-dist/.../locales/en-US.js` 的 `nav.*` 键。
