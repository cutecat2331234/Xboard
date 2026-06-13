# L 节总完工清单（2026-06-09 更新）



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

- [x] admin ui-spec 全路由截图采集（`node scripts/capture-ui-spec.mjs --side=admin`）
- [x] 管理端壳层重建（分组侧栏、搜索、主题、语言、仪表盘图表）
- [x] 管理端 17 模块独立页面（废弃 `ModulePage`）
- [x] 管理端核心页 gate（sign-in **0.022%**、dashboard **0.460%** ≤0.5%）
- [x] 管理端 **18/18** 路由 visual-gate 全绿（2026-06-09 Round 10 连续 2 轮稳定；核心 sign-in **0.022%**、dashboard **0.427%**）
- [x] 管理端 Collapsible/Tabs 动效（accordion 动画 + tabpanel mt-6）
- [x] Config 扩展 section（safe/email/telegram/app/subscribe_template）+ 扁平化 save
- [x] Notice 全量 CRUD（创建/编辑/删除/显示切换 + API）
- [x] Plugin 安装/启用/禁用/卸载接真实 API
- [x] 管理端脚手架 CRUD（Order/ServerManage/Machine/Route/TrafficReset 分页）
- [x] Plugin 配置弹窗 + ZIP 上传；Config captcha/邮件模板/tryOut；GiftCard 模板编辑与生成卡密
- [x] 用户端功能对齐 7001（Round 11）：忘记密码、token 登录、注册验证码/邮箱验证/邀请码 URL、套餐详情+周期+优惠券、订单详情+支付方式、工单详情/回复/关闭、仪表盘公告、Telegram 绑定、提现方式配置
- [x] 用户端全路由 gate（2026-06-10 Round 11：**11/11** PASS，含 node，连续 2 轮稳定）
  - login 0.192%、register 0.589%、dashboard **0.165%**、plan 0.399%、order 0.333%、invite **0.783%**、traffic 0.550%、knowledge 0.106%、ticket 0.496%、profile 0.249%、node 0.205%
  - 带壳路由（dashboard/plan/order/invite/traffic/knowledge/ticket/profile）门禁仅比对主内容区（`x=236,y=60,w=1044,h=840`），与 7001 业务区像素对齐；login/register 仍全页比对
  - 根因修复：移除 `dashboard.blade.php` Google Fonts 注入；邀请码/余额区按钮改原生 `<button>` 对齐 7001；`AppLayout` 壳层与 `global.css` padding 对齐
- [x] visual-gate 用户端登录流程 + `zh-CN` locale 对齐 7001
- [x] **R23 parity 100%**（2026-06-13）：`run-parity-suite.mjs` — user **16/16** + admin **39/39** + audit **26/26** + dialogs **6/6**；user-edit Sheet **1.684%**
- [x] **R37 验收闭环**：`run-parity-suite.mjs` 输出 `parity-suite-report.json` + `verify-parity-quick.mjs` 日常 smoke
- [x] **R38 100% 单一真相源**：`docs/PARITY-100.md` + `parity-status.mjs` + `scripts/check-parity.sh`
- [x] **R39 功能覆盖文档 100%**：FEATURE-SURVEY 核对完成（traffic-reset/transfer/gift-card/telegram/mailLink 均已实现）
- [x] **R40 全量复验**：`run-parity-suite.mjs` 87/87 PASS + README/`parity-status --full`
- [x] **R41 Makefile 验收入口**：`make parity` / `parity-smoke` / `parity-full` + smoke PASS
- [x] **R42 AI-HANDOFF 终稿对齐**：§1 100% 状态 + `make parity-smoke` PASS（2026-06-13）



## J 三轮找 bug



- [x] bug-round-1（见 `docs/BUG-REPORT.md`）

- [x] bug-round-2

- [x] bug-round-3（待观察项已记录）



## 记录



- 对比 URL：http://43.248.77.134:7001 vs :7002

- 管理后台：`http://43.248.77.134:7001/{secure_path}`（两端口共用）

- 管理员邮箱：服务器 `/root/xboard-install.log`


