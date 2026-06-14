# IMITATION-PLAN Round 53 — 滚动 + 侧栏闪烁修复（2026-06-14）

## 用户反馈

1. 部分页面无法向下滚动
2. 页面偶发抖动
3. 左侧菜单在点击其他按钮（主题/语言等）时其他项闪烁

## 计划

| # | 任务 |
|---|------|
| 1 | AdminShell 主内容区改为 `overflow-y-auto` + flex/min-h-0 |
| 2 | Sidebar 去 transition-colors/shadow、React.memo 防主题切换重绘 |
| 3 | 用户端 AppLayout 滚动链 + n-menu v-memo |
| 4 | build + 部署 7002 + 提交 master |

## 执行记录

- AdminShell：主内容 `overflow-y-auto` + `scrollbar-gutter: stable`
- Sidebar：`transition-none`、`React.memo`、`contain:paint`、去掉插件子菜单 `shadow-sm`
- ThemeProvider：拆分 state/toggle context，减少无关重绘
- 用户端：`cus-scroll-y` 定义、`#app` 高度链、`n-menu` 去 transition、`v-memo`
