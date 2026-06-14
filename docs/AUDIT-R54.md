# R54/R55 全方位审计与全量升级报告（2026-06-14）

## 1. 技术栈（升级后）

| 组件 | 版本 | 说明 |
|------|------|------|
| PHP | 8.5.7 | 最新 |
| Laravel | 13.15.0 | 最新 |
| PHPUnit | **13.2.0** | 从 12 升级 |
| Vite (admin/user) | **8.0.16** | 从 6 升级 |
| React | 19.1 | 最新 |
| Vue | **3.5.38** | patch |
| vue-router | **5.1.0** | major |
| react-i18next | **17.0.8** | major |
| i18next | **26.3.1** | major |
| recharts | **3.8.1** | major |
| lucide-react | **1.18.0** | major |
| zod | **4.4.3** | major |
| stripe/stripe-php | **17.6.0** | 从 7 升级 |
| bacon/bacon-qr-code | **3.1.1** | major |
| ip2region | **3.0.15** | major |
| php-curl-class | **13.x** | major |

Symfony 仍为 7.x（Laravel 13 约束，无法升到 8）。

## 2. 自动化检测

| 检查 | 结果 |
|------|------|
| PHPUnit 13 tests | ✅ 13/13 PASS |
| parity-check | ✅ 89/89 PASS |
| admin build (Vite 8) | ✅ |
| user build (Vite 8) | ✅ |
| composer audit | ✅ 0 vulnerabilities |

## 3. 后端 Bug 修复（含 R54 遗留项）

| 项 | 修复 |
|----|------|
| 支付 webhook 误报 success | `handle()` 返回 bool |
| 订单卡在 PROCESSING | 失败回滚 PENDING |
| Ticket/Invite/User 空指针 | null 守卫 |
| GiftCard 并发 + 多次使用 | lockForUpdate + 满额才 USED |
| Coupon 锁在事务外 | `lockByCode()` 在 createFromRequest 事务内 |
| change_order_event_id 耦合 surplus | 新键 `surplus_traffic_ratio_enable` + 管理端开关 |
| Setting Redis 失败静默空配置 | 回退读 DB + 表不存在时返回 [] |
| paid() 重复 webhook | 事务 + lockForUpdate |
| Ticket 邮件通知 user null | 早退 |
| Admin Ticket/Plan/Payment sort | null 检查 |
| Order event match 常量 | TYPE_NEW_PURCHASE |

## 4. 前端体验（R53 已合并）

- AdminShell 滚动链、Sidebar 防闪烁、ThemeProvider 拆分
- 用户端 cus-scroll-y、菜单 transition-none
- PageToolbar 头部按钮 transition-none
- Vite 8 user：`codeSplitting: false` 替代 deprecated `inlineDynamicImports`

## 5. 部署

全量同步至 7002：`app/` + composer vendor + 前后端 build。
