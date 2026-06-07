# 前端功能复刻审计（2026-06-08）

## 结论（诚实表述）

| 层级 | 是否 100% | 说明 |
|------|-----------|------|
| **用户端 dist 文件** | ✅ 是 | `umi.js`、图片、`dashboard.blade.php` 字节级一致 |
| **管理端 dist 文件** | ✅ 是 | `manifest.json` 及 admin assets 一致 |
| **入口 HTML** | ✅ 是 | `curl 7001/` 与 `curl 7002/` diff 无差异 |
| **前端 JS 逻辑/路由** | ✅ 是 | 同一 `umi.js` → 同一套路由与组件 |
| **核心 API 联调** | ✅ 已测 | 登录、`user/info`、`getSubscribe`、`plan/fetch` 两端口均 success |
| **全站逐页 E2E** | ⚠️ 未做完 | 工单/支付/邀请等需人工点一遍才称「验收签字」 |

闭源前端**没有源码**，复刻上限 = **官方 dist 原样部署** + **后端 API 行为一致**。当前已做到前者；后者核心接口已对齐。

## 验收命令

```bash
python scripts/ssh-run.py scripts/audit-frontend-parity.sh
python scripts/ssh-run.py scripts/test-user-apis.sh
python scripts/ssh-run.py scripts/compare-html.sh
```

## 管理后台（`/d7f5c92b`）专项

| 项目 | 7001 vs 7002 |
|------|----------------|
| `public/assets/admin/**` 目录 | `diff -rq` 无差异 |
| `manifest.json` / 主 JS / 主 CSS | MD5 完全一致 |
| `resources/views/admin.blade.php` | MD5 完全一致 |
| 后台入口 HTML | `diff` 无差异 |
| React 仿写残留 (`index-C1RqCHk3.js`, `.vite/`) | 无 |
| 登录页 UI | Sign In 卡片 + EN 语言按钮（一致） |
| 登录后侧栏菜单 | Dashboard → Gift Card Management 等 15 项（一致） |

后台来源：Git 子模块 `public/assets/admin`（`xboard-admin-dist`）原版编译产物，7002 从 7001 快照原样复制。

## 7001 vs 7002 分工

- **相同**：全部用户端/管理端静态资源、同一 MySQL、同一套 API 路由
- **可不同**：仅 Octane 进程/实例路径（用于验证新栈稳定性）
