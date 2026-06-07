# L 节总完工清单（2026-06-08 更新）



## A–G 部署



- [x] PHP 8.5.7 + Laravel 13.14 原生运行

- [x] `/opt/xboard` 安装 + `xboard:install`

- [x] Nginx + Supervisor Octane/Horizon

- [x] 7001 / 7002 对外可访问

- [x] 旧 Docker `xboard-master` 已 down

- [ ] MySQL 9.7（当前 8.0.46，defer）

- [ ] Redis 8.8（当前 6380 既有实例，defer）



## 双前端对比



- [x] **7001** 旧版：`/opt/xboard-legacy`（umi.js ≈ 1.42MB）

- [x] **7002** 新版：`/opt/xboard`（仿造源码 build，`umi.js` hash ≠ 7001）

- [x] `scripts/setup-dual-frontend.sh` + `restart-dual.sh`

- [x] 文档：`docs/FRONTEND-COMPARE.md`



## H 前端仿写



- [x] `frontend/user` Vue3 + NaiveUI

- [x] `frontend/admin` React19 + Tailwind

- [x] build 并部署到 7002（`scripts/deploy-rewrite-frontend.py`）

- [x] 用户 10 路由 + 管理 17 模块源码仿写

- [x] `decompiled/ui-spec/` 脚手架 + `scripts/capture-ui-spec.mjs`

- [x] `scripts/visual-gate/` 像素 diff 门禁（含 box-shadow）

- [x] 语言切换（用户端 locale 下拉；管理端 locales 自 `public/locales`）

- [ ] 全页面像素 diff ≤1% 签字（需 Playwright 安装完成后跑 gate）



## J 三轮找 bug



- [x] bug-round-1（见 `docs/BUG-REPORT.md`）

- [x] bug-round-2

- [x] bug-round-3（待观察项已记录）



## 记录



- 对比 URL：http://43.248.77.134:7001 vs :7002

- 管理后台：`http://43.248.77.134:7001/{secure_path}`（两端口共用）

- 管理员邮箱：服务器 `/root/xboard-install.log`


