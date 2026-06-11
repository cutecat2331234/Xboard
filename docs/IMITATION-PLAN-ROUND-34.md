# Round 34 仿造计划

## 深度对比结论（probe-round34-deep）

### plan-add
| 指标 | 7001 | 7002（修前） |
|------|------|-------------|
| 对话框高度 | 784px | 855px（整窗撑开） |
| 内容区结构 | `min-h-0 flex-1 overflow-y-auto` 内滚动 | 无内滚动，body 802px |
| textarea | 232px 高 | 被压到 64px（方向错误） |

**根因**：7002 让 Dialog 随内容增高；7001 固定高度 + 中间滚动。

### server-add
| 指标 | 7001 | 7002（修前） |
|------|------|-------------|
| 高度 | 800px | 855px |
| 内层 | `h-[75vh] min-h-[500px] flex-col` | 平铺 xb-stack-3 |

### user-edit Sheet
| 指标 | 7001 | 7002（修前） |
|------|------|-------------|
| 字段容器 | 每字段独立 `space-y-2` | 单块 `xb-stack-4` 1232px |
| 双列网格 | `grid gap-2 md:grid-cols-2` | `grid-cols-2 gap-4` |
| suffix 节点 | `<div>` addon（span 计数 0） | `<span>` addon（计数 5） |
| 备注 textarea | 96px | 120px |
| Close 按钮 | 无 sr-only 文案 | 有 `Close` 屏幕阅读器文本 |

## Round 34 实施

1. Plan/Server Dialog：`!flex` + `max-h` + 中间 `overflow-y-auto`
2. User Sheet：去掉 `xb-stack-4` 包裹，改 `space-y-2` + `gap-2 md:grid-cols-2`
3. SuffixInput：suffix/prefix 改 `<div>` 对齐 7001
4. Sheet：移除 `sr-only Close`
5. Plan textarea：恢复默认 `textareaCls`（7001 更高）

## 验收

```bash
python scripts/deploy-rewrite-frontend.py
node scripts/visual-gate/probe-round29-dialogs.mjs
node scripts/visual-gate/probe-round34-deep.mjs
node scripts/visual-gate/audit-admin-full.mjs
```

目标：plan/server 对话框高度差 <20px；弹窗像素 <2%。
