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
| 系统配置 config | fetch/save/getEmailTemplate/getThemeTemplate/testSendMail/setTelegramWebhook | `ConfigPage`(站点/安全/订阅/邀请/节点/邮件/Telegram/APP/订阅模板) | ✅ 像素≤1.06% |
| 插件 plugin | getPlugins/types/config/install/uninstall/enable/disable/upgrade/upload/delete | `PluginPage` | ✅ |
| 主题 theme | getThemes + config | `ThemePage` | ✅ |
| 公告 notice | fetch/save/update/show/drop/sort | `NoticePage` | ✅ |
| 支付 payment | fetch/save/show/drop/sort/getPaymentMethods/getPaymentForm | `PaymentPage` | ✅ |
| 知识库 knowledge | fetch/save/show/drop/sort/getCategory | `KnowledgePage` | ✅ |
| 节点 server | manage/getNodes·save·update·sort·copy·batch*·generateEchKey; group/*; route/*; machine/* | `ServerManagePage`/`ServerGroupPage`/`ServerRoutePage`/`ServerMachinePage` | ✅ 列表✅;弹窗对齐进行中 |
| 套餐 plan | fetch/save/update/drop/sort | `PlanPage` | ✅ 列表✅;弹窗 width/grid 已对齐 |
| 订单 order | fetch/detail/assign/cancel/paid/update | `OrderPage` | ✅ |
| 优惠券 coupon | fetch/generate/show/update/drop | `CouponPage` | ✅ |
| 礼品卡 gift-card | templates/codes/usages/statistics/create-template/generate-codes/export-codes/toggle-code/... (13) | `GiftCardPage`(模板/卡密/使用记录/统计 Tabs) | ✅ |
| 用户 user | fetch/getUserInfoById/save/update/ban/... (11) | `UserPage` | ✅ 列表✅;创建/编辑弹窗对齐进行中 |
| 工单 ticket | fetch/reply/close | `TicketPage` | ✅ |
| 邮件模板 mail | template/list·get·save·reset·test | `MailTemplatePanel` | ✅ |
| 流量重置 traffic-reset | logs/stats/user/{id}/history | ⚠️ **需核对是否有独立页面** |
| 系统状态 system | getSystemStatus/getQueueStats/getQueueMasters/getQueueWorkload/getHorizonFailedJobs/getAuditLog | ⚠️ 队列/审计日志页面 **需核对** |
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
| 佣金划转 transfer | transfer | ⚠️ **需核对 Profile 内是否有划转入口** |
| 礼品卡兑换 gift-card | gift-card/* (5) | ⚠️ **需核对用户端兑换入口** |
| Telegram 绑定 telegram | telegram + getQuickLoginUrl | ⚠️ **需核对绑定入口** |

## 认证（passport, 8）

login / register / forget / loginWithMailLink / getQuickLoginUrl / comm.sendEmailVerify …
→ `LoginPage`/`RegisterPage`/`ForgetPasswordPage` ✅；邮箱链接登录/快捷登录 ⚠️ 需核对。

## 待核对/可能缺失的用户可见功能（下一步开发清单）

1. 管理端「流量重置」独立页面（traffic-reset/*）。
2. 管理端「队列/Horizon 失败任务/审计日志」系统页面（system/*）。
3. 用户端「佣金划转到余额」（transfer）入口。
4. 用户端「礼品卡兑换」入口（gift-card）。
5. 用户端「Telegram 绑定 / 快捷登录」入口。
6. 认证「邮箱链接登录 loginWithMailLink」。

> 以上为**功能存在性**核对清单；像素级对齐见 `IMITATION-PLAN-ROUND-35.md`。
