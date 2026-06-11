# Round 33 仿造计划

## 对比发现（7001 vs 7002）

| 维度 | 7001 | 7002（修复前） | 根因 |
|------|------|----------------|------|
| `--color-primary` | `hsl(222.2 47.4% 11.2%)` slate | `#2d6565` 青绿 | `index.css` 误用 tokens 提取色 |
| 弹窗提交按钮 | `rgb(15,23,42)` | 部分页面 `#2d6565` | 同上 |
| 到期时间控件 | outline Button `px-4 py-2` 白底 | `inputCls` 透明底 `px-3 py-1` | ExpireDateInput 样式错误 |
| 表单下拉 | Radix Select（无 native select） | `<select>` | 控件渲染差异导致像素差 |
| 礼品卡弹窗 | 有模板可测 | 无数据 SKIP | 缺种子数据 |

## 本轮实施

### P0 控件级对齐
1. `index.css` primary 改为与 7001 一致的 slate
2. `ExpireDateInput` 改为 outline 按钮形态
3. 新增 `FormSelect`，替换 User/Plan/Server 弹窗内 native select
4. `SelectTrigger` padding `py-2` → `py-1` 对齐 input 高度

### P1 数据
5. `scripts/seed-gift-template.php` 为 7002 插入探测用礼品卡模板

## 验收

```bash
python scripts/deploy-rewrite-frontend.py
python scripts/ssh-run.py scripts/restart-dual.sh
node scripts/visual-gate/audit-admin-full.mjs
node scripts/visual-gate/audit-dialogs-admin.mjs
node scripts/visual-gate/probe-round29-dialogs.mjs
node scripts/visual-gate/probe-round33-computed.mjs
```

目标：扩展弹窗像素差 < 2%；gift 弹窗不再 SKIP。

## Round 33 验收结果（2026-06-10）

| 项目 | 结果 |
|------|------|
| 25 路由静态像素 | **25/25 PASS** |
| 8 弹窗可打开 | **8/8 OK**（gift-card 列表行数 GAP 0 vs 1） |
| user-edit | 3.76% FAIL |
| user-create | 3.34% FAIL |
| user-mail | 3.57% FAIL |
| gift-template-edit | 3.55% FAIL（已可测，已种子模板） |
| gift-generate | SKIP（7001 参考端无「生成」按钮或弹窗未开） |
| plan-add | 4.91% FAIL（结构 17 label 已对齐，高度 855 vs 774 仍偏高） |
| server-add | 4.53% FAIL（label 文案已对齐，高度 855 vs 800） |

## Round 34 待办

1. **plan-add 高度**：压缩套餐说明 textarea / 价格区内边距，对齐 7001 774px 对话框高度
2. **server-add 高度**：`xb-stack-3` 后继续压动态倍率区、TagInput 行高
3. **user-edit SuffixInput**：7001 余额等字段无独立 suffix span，需对照 legacy 改 Input 后缀呈现
4. **gift-generate**：在 7001 参考库种子模板或改 probe 用 actions 第 2 按钮
5. **Switch / 关闭按钮**：消除 7002 Sheet 多余 `Close` 屏幕阅读器文案差异
