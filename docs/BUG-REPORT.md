# Bug 三轮记录（2026-06-08）

## Round 1 — 部署与双端口

| # | 严重度 | 现象 | 根因 | 修复 |
|---|--------|------|------|------|
| 1 | P0 | 7002 登录页白屏 | `useMessage()` 无 `NMessageProvider` | `App.vue` 增加 Naive UI Provider 栈 |
| 2 | P0 | 7002 仍加载旧 chunk | `umi.js` 1h 缓存 + 固定 `?v=` | `filemtime` 缓存破坏 + Nginx `no-cache` |
| 3 | P1 | 嵌套 `AuthLayout` 登录空白 | 子路由 + 异步组件组合异常 | 登录/注册改扁平路由 + 单页卡片 |
| 4 | P1 | Octane 重启 502/504 | `fuser -k` 与 supervisor 竞态 | `restart-dual.sh` 统一重启流程 |
| 5 | P2 | `/etc` 权限 666 | 历史误 chmod | `chmod 755` + `/tmp` sticky |

## Round 2 — 前端仿写

| # | 严重度 | 现象 | 根因 | 修复 |
|---|--------|------|------|------|
| 6 | P2 | Vite build 失败 `@/` | 缺少 alias | `vite.config.ts` resolve.alias |
| 7 | P2 | `getThemeOverrides` 缺失 | store 引用未实现 | `utils/settings.ts` 补全 |
| 8 | P3 | 管理端 manifest | Vite 6 输出路径变更 | 复制 `.vite/manifest.json` |

## Round 3 — 仿造源码交付

| # | 严重度 | 现象 | 根因 | 修复 |
|---|--------|------|------|------|
| 9 | P2 | webcrack 在 Windows 失败 | isolated-vm 需 VS 构建链 | `decompile-fallback.mjs` + Linux 上跑 webcrack |
| 10 | P2 | 用户 build 无样式 | CSS 独立 chunk | `umi.css` + blade 链接 |
| 11 | P2 | 管理端 Radix 缺依赖 | shadcn 组件未装全 | 简化 `button`/`label` 组件 |
| 12 | P3 | 像素 gate 未绿 | Playwright 下载超时 | `scripts/visual-gate` 已就绪，服务器侧复跑 |
| 13 | P4 | MySQL 8.0 非计划 9.7 | 升级路径未执行 | 文档标注 defer |

## 验收命令

```bash
python scripts/ssh-run.py scripts/restart-dual.sh
curl -sI http://43.248.77.134:7001 | head -1
curl -sI http://43.248.77.134:7002 | head -1
```
