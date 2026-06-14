# R54 全方位审计报告（2026-06-14）

## 1. 技术栈版本

### 运行时（本机 / 7002 服务器）

| 组件 | 当前版本 | 状态 |
|------|----------|------|
| PHP | 8.5.7 | ✅ 最新稳定线 |
| Node.js | 22.14.0 | ✅ LTS 最新 |
| Composer | 2.10.1 | ✅ 最新 |
| Redis | 已运行 | ✅ |

### 后端核心（composer.lock）

| 包 | 锁定版本 | 说明 |
|----|----------|------|
| laravel/framework | v13.15.0 | ✅ Laravel 13 最新线 |
| laravel/octane | ^2.17 | ✅ |
| laravel/horizon | ^5.47 | ✅ |
| phpunit/phpunit | 12.5.29 | 有 v13 大版本可选，暂不升（破坏性） |

**有 major 更新但未升级（需专项迁移）：** stripe/stripe-php 7→20、symfony 7→8、google/cloud-storage 1→2、php-curl-class 8→13 等。

### 前端核心

| 包 | admin | user | 说明 |
|----|-------|------|------|
| React | 19.1 | — | ✅ 最新 |
| Vue | — | 3.5.38 | ✅ 已 patch 更新 |
| Vite | 6.4.3 | 6.4.3 | v8 可用，大版本暂不升 |
| TypeScript | 5.8–5.9 | 5.9 | v6 可选 |
| Tailwind | 4.3.1 | — | ✅ 已 patch 更新 |
| Naive UI | — | 2.44.1 | ✅ |

**结论：** 核心框架均为当前主流最新大版本；部分传递依赖存在 major 可选升级，需单独评估破坏性。

---

## 2. 自动化检测结果

| 检查项 | 结果 |
|--------|------|
| PHPUnit 13 tests | ✅ **13/13 PASS**（修复 ServerHandshakeTest 后） |
| PHPStan level 5 | ⚠️ 64 条（多为 Workerman 动态属性等既有噪音） |
| Visual Gate parity-check | ✅ **87/87 + 2/2 cmp-only = 89** |
| npm audit admin | ⚠️ 5 vulnerabilities（需 `npm audit` 逐项评估） |
| npm audit user | ⚠️ 3 high（同上） |

---

## 3. 后端 Bug 修复（本轮已改）

| 严重度 | 问题 | 修复 |
|--------|------|------|
| **Critical** | 支付 webhook：`handle()` 订单不存在时返回 JsonResponse（truthy），网关收到 success | 改为返回 `bool`，缺失订单记日志并返回 false |
| **High** | 订单 `paid()` 失败后卡在 PROCESSING | 捕获异常后回滚为 PENDING，允许 webhook 重试 |
| **High** | Ticket fetch：`first()->load()` 空指针 | 先 null 检查再 load |
| **High** | Ticket reply：`getLastMessage()` 可能 null | 加空值守卫 |
| **High** | Invite/Admin User：`User::find()->load()` 链式空指针 | 分离 find + 检查 |
| **High** | GiftCard 并发 + max_usage>1 首次即 USED | 事务内 `lockForUpdate`；仅满额才 STATUS_USED |
| **High** | Setting 测试环境误用 Redis cache | testing 环境改用 array cache |
| **Medium** | Order event match 误用 STATUS_PROCESSING | 改为 TYPE_NEW_PURCHASE |
| **Medium** | Order open 缺 plan/user 空检查 | 抛出明确 RuntimeException |

### 待后续专项（未改，已记录）

- `change_order_event_id` 同时控制 surplus 算法与升级后流量重置（业务逻辑耦合）
- CouponService 锁在事务外（并发超卖风险）
- 部分 API 响应 envelope 不统一
- Setting Redis 失败时静默空配置（已加日志，未改 fail-fast 策略）

---

## 4. 体验 / 动画审计

### 已修复（R53 + R54）

- AdminShell 主内容滚动链
- Sidebar memo + transition-none + contain:paint
- ThemeProvider 拆分 context
- PageToolbar 主题/语言/头像按钮 transition-none
- 用户端 cus-scroll-y、高度链、菜单 transition-none
- scrollbar-gutter: stable 防抖动

### 保留的合理动画

- Dialog/Sheet/Popover 打开关闭（Radix animate-in/out）
- Collapsible 手风琴展开
- Dashboard loading pulse、进度条 transition-all
- 表格行 hover（不影响侧栏）

### 建议人工复验

1. 管理端：主题/语言切换 → 侧栏是否仍闪
2. 长列表页：User/Config/Order 能否滚到底
3. 用户端：移动端 drawer + 滚动
4. Dialog 打开时背景是否锁滚动且无双重滚动条

---

## 5. 部署

本轮需同步 **PHP 后端 + 前端 build** 到 7002（`/opt/xboard`）。
