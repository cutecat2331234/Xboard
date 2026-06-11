# Round 29 仿造计划（扩展弹窗 / 用户编辑 Sheet）

## 起点（Round 28）

- 全量像素 **25/25 PASS**
- 弹窗打开 **8/8 OK**（仅计数，无像素对比）
- 诚实差距：用户编辑等深层弹窗未纳入 gate

## 扩展对比（probe-round29-dialogs.mjs）

| 场景 | R29 前 | 根因 | R29 修复 |
|------|--------|------|----------|
| user-edit 像素 | **~96%** | 7001 右侧 **Sheet**，7002 居中 Dialog | `Sheet` 组件 + 编辑/创建改抽屉 |
| user-edit 像素 | ~4%（Sheet 后） | 字段顺序、¥/GB 后缀、账户状态 Switch vs Select | 字段重排 + `SuffixInput` + 状态下拉 |
| 行操作图标 | Lucide `MoreHorizontal` | 7001 Tabler `IconDots` | 用户表改 `IconDots` |
| user 弹窗审计 | 无法点「编辑」 | 在 DropdownMenu 内 | `audit-dialogs` 增加 `open()` 下拉链 |
| gift-card 模板 | 7002 无数据 | 库内无模板行 | 待种子数据或跳过 |
| plan/server 弹窗 | ~3–4% | 表单布局/尺寸微差 | 后续 Round 30 |

## R29 已实现

1. **`components/ui/sheet.tsx`** — 右侧抽屉（对齐 7001）
2. **`UserPage.tsx`** — 编辑/创建改 Sheet；字段顺序对齐 7001；`SuffixInput`（¥/GB）；账户状态 Select
3. **`audit-dialogs-admin.mjs`** — 用户页 DropdownMenu → 编辑
4. **`probe-round29-dialogs.mjs`** — 扩展弹窗像素探测（dialog 区域截图）

## R29 验收

```bash
python scripts/deploy-rewrite-frontend.py
node scripts/visual-gate/audit-admin-full.mjs      # 期望 25/25
node scripts/visual-gate/audit-dialogs-admin.mjs   # 期望 8/8
node scripts/visual-gate/probe-round29-dialogs.mjs # 扩展弹窗像素
```

### 全量像素（Round 29 复验）

**25/25 PASS**（`audit-round29-report.json`）

### 弹窗打开

**8/8 OK**（含 user 下拉编辑链）

### 扩展弹窗像素（阈值 2%）

| 场景 | diff | 状态 |
|------|------|------|
| user-edit | ~4% → 待复测 | Sheet+表单对齐后目标 <2% |
| plan-add | ~3.8% | 待优化 |
| gift-* | SKIP | 无模板数据 |

## 诚实结论

- **静态页 25 路由**：已达标
- **深层弹窗**（用户编辑等）才开始纳入对比；与 7001 仍有字段级/layout 微差
- **用户端 / 登录合一 / Telegram 插件** 仍不在本轮范围

## Round 30 待办

1. user-edit 弹窗像素 <2%（日期选择器、标题文案「用户管理」vs「编辑用户」核实）
2. plan/server 添加节点弹窗布局对齐
3. GiftCard 种子数据 + 模板/生成弹窗审计
4. 全局 `MoreHorizontal` → `IconDots`（notice/payment/server 等表）
