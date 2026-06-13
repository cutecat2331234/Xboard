# Xboard 全功能调研（结合后端 API）

> 数据来源：`php artisan route:list`（本仓库后端,共 **250** 条路由）。
> 用途：列举原版全部功能 → 核对 replica 前端覆盖 → 指导开发到 100%。
> 生成日期：2026-06-11。

## 路由总览

| 区块 | 路由数 | 说明 |
|------|--------|------|
| `api/v2/{secure}/*` 管理端 | 119 | 后台全部功能 |
| `api/v1/user/*` 用户端 | 41 | 用户中心全部功能 |
| `api/v2/server/*` + `api/v1/server/*` 节点通信 | 35 + 11 | 节点上报/握手(无前端) |
| `api/v1/passport/*` 认证 | 8 | 登录/注册/找回/邮箱验证 |
| `api/v1/client/*` 订阅下发 | 3 | 订阅链接(无前端页面) |
| `api/v1/guest/*` | 4 | 访客(支付通知/comm) |
| web/其他 | 29 | 主题/订阅/后台壳 |

## 管理端模块（119 端点）→ replica 覆盖

| 模块 | 关键端点 | replica 页面 | 状态 |
|------|----------|--------------|------|
| 仪表盘 stat | getOverride/getStats/getOrder/getRanking/getTrafficRank/getServerLastRank/getStatUser | `DashboardPage` | ✅ |
| 系统配置 config | fetch/save/getEmailTemplate/getThemeTemplate/testSendMail/setTelegramWebhook | `ConfigPage`(站点/安全/订阅/邀请/节点/邮件/Telegram/APP/订阅模板) | ✅ audit 26/26 PASS |
| 插件 plugin | getPlugins/types/config/install/uninstall/enable/disable/upgrade/upload/delete | `PluginPage` | ✅ |
| 主题 theme | getThemes + config | `ThemePage` | ✅ |
| 公告 notice | fetch/save/update/show/drop/sort | `NoticePage` | ✅ |
| 支付 payment | fetch/save/show/drop/sort/getPaymentMethods/getPaymentForm | `PaymentPage` | ✅ |
| 知识库 knowledge | fetch/save/show/drop/sort/getCategory | `KnowledgePage` | ✅ |
| 节点 server | manage/getNodes·save·update·sort·copy·batch*·generateEchKey; group/*; route/*; machine/* | `ServerManagePage`/`ServerGroupPage`/`ServerRoutePage`/`ServerMachinePage` | ✅ gate PASS；server-add dialog ~1.81% |
| 套餐 plan | fetch/save/update/drop/sort | `PlanPage` | ✅ gate PASS；plan-add dialog ~1.02% |
| 订单 order | fetch/detail/assign/cancel/paid/update | `OrderPage` | ✅ |
| 优惠券 coupon | fetch/generate/show/update/drop | `CouponPage` | ✅ |
| 礼品卡 gift-card | templates/codes/usages/statistics/create-template/generate-codes/export-codes/toggle-code/... (13) | `GiftCardPage`(模板/卡密/使用记录/统计 Tabs) | ✅ |
| 用户 user | fetch/getUserInfoById/save/update/ban/... (11) | `UserPage` | ✅ gate PASS；user-edit Sheet ~1.68% |
| 工单 ticket | fetch/reply/close | `TicketPage` | ✅ |
| 邮件模板 mail | template/list·get·save·reset·test | `MailTemplatePanel` | ✅ |
| 流量重置 traffic-reset | logs/stats/user/{id}/history | `TrafficResetPage` + `UserPage` 行内重置/历史 Dialog | ✅ gate PASS（`traffic-reset` 路由） |
| 系统状态 system | getSystemStatus/getQueueStats/.../getHorizonFailedJobs/getAuditLog | `DashboardPage` 失败任务弹窗 + API 封装 | ✅ |
| APP 配置 app | getConfig/getVersion | (客户端用) | n/a |

## 用户端模块（41 端点）→ replica 覆盖

| 模块 | 关键端点 | replica 页面 | 状态 |
|------|----------|--------------|------|
| 仪表盘 | info/getStat/getSubscribe/comm/config | `DashboardPage` | ✅ |
| 套餐 plan | plan/fetch | `PlanPage`/`PlanDetailPage` | ✅ |
| 订单 order | order/fetch·detail·save·checkout·check·cancel (7) | `OrderPage`/`OrderDetailPage` | ✅ 退款字段已修 |
| 邀请 invite | invite/fetch·save·details (3) | `InvitePage` | ✅ |
| 节点 server | server/fetch | `NodePage` | ✅ |
| 流量 stat | stat/getTrafficLog | `TrafficPage` | ✅ |
| 知识库 knowledge | knowledge/fetch·{id} | `KnowledgePage` | ✅ |
| 工单 ticket | ticket/fetch·save·reply·close·withdraw (5) | `TicketPage`/`TicketDetailPage` | ✅ |
| 个人资料 | info/update/changePassword/resetSecurity/getActiveSession/removeActiveSession | `ProfilePage` | ✅ |
| 佣金划转 transfer | transfer | `InvitePage.vue` 划转弹窗 | ✅ |
| 礼品卡兑换 gift-card | gift-card/* (5) | `GiftCardPage.vue` | ✅（7001 legacy 无页 → visual-gate 默认排除） |
| Telegram 绑定 telegram | telegram + getQuickLoginUrl | `ProfilePage.vue` + `AuthPage`/`TelegramLoginWidget` | ✅（需 Bot 配置） |

## 认证（passport, 8）

login / register / forget / loginWithMailLink / getQuickLoginUrl / comm.sendEmailVerify …
→ `LoginPage`/`RegisterPage`/`ForgetPasswordPage` ✅；邮箱链接登录 `AuthPage` mailLinkMode ✅；token 快捷登录 `token2Login` ✅。

## 功能覆盖结论（2026-06-13 R39）

仿写前端相对本仓库 **250 条后端路由** 的用户/管理可见功能已 **100% 覆盖**（节点通信、支付 webhook 等无 UI 端点除外）。

仍与 7001 **刻意不对齐**（为 pixel parity）：

1. 用户端 gift-card 页面（7001 legacy 无 → gate 排除 `INCLUDE_GIFT_CARD=1` 可选测 7002）
2. gift-generate 行内按钮（7001 模板行无「生成」）

> 像素级对齐见 `docs/PARITY-100.md`（**87/87 Visual Gate PASS**）。
