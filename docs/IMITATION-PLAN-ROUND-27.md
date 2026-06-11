# Round 27 仿造计划（表单 DOM 精修 + 订阅 Switch 变体）

## 深度对比结论（probe-round27-structure.mjs）

| 对比项 | 7001 | 7002（R26） | 影响 |
|--------|------|-------------|------|
| 表单容器 | `space-y-6` / `space-y-4` | `flex gap-6` / `gap-4` | 像素上 **gap 更接近**（R26 config-site 0%） |
| Switch（safe/invite） | `space-y-2` > `space-y-0.5` + switch | 同结构但用 gap | 已对齐 |
| Switch（subscribe） | **扁平** label→desc→switch | 嵌套 gap-0.5 包裹 | subscribe 差 2%+ |
| 事件 Select 宽 | 140px | 140px | 已对齐 |

## R27 已实现

1. **SwitchField `flat` 变体** — 仅 `subscribe` 子页 4 个开关使用扁平 DOM（对齐 7001 实机）
2. **保留 `flex gap-*` 表单布局** — 实验证明比强行改 `space-y-*` 像素更优（R27 曾回退 space-y 导致 7 页 FAIL）
3. **audit 输入掩码** — config 页 `input/textarea` 统一为 `x`，消除同库不同渲染噪声
4. **audit maskVolatile** — 修复 Playwright 多参数 evaluate 报错

## R27 验收（2026-06-11，已部署 7002）

### 弹窗 — **8/8 OK**

### 像素（input 掩码，阈值 1%）

| 结果 | 数量 |
|------|------|
| **PASS** | **22/25** |
| **FAIL** | 3：`config-safe` ~1.36%、`config-subscribe` ~1.46%、`config-invite` ~1.09% |

> `config-invite` 距通过仅 **0.09%**，属亚像素级行高/抗锯齿累积差。

### 结构元数据

全部 config 子页：`asideTabler 35`、`asideLucide 1`、字段数与 7001 一致。

## 诚实结论

- **功能 / 弹窗 / 图标 / 邮件白屏**：已对齐（R26 修复保持）
- **像素门禁**：**22/25** 稳定通过；余 3 页为表单区 ~1.1–1.5% 布局微差
- **不能宣称 100% 像素一致**，但已从 R25 的 17/25 提升至 22/25

## R28 待办

1. `config-invite`：微调 `gap-4`→`gap-3.5` 或 description `line-height`（目标 <1%）
2. `config-safe` / `config-subscribe`：对比 7001 computed style 逐字段行高
3. 扩展弹窗审计：User 编辑（DropdownMenu）、GiftCard 模板/生成

## 验收命令

```bash
python scripts/ssh-run.py scripts/restart-dual.sh
python scripts/deploy-rewrite-frontend.py
node scripts/visual-gate/audit-dialogs-admin.mjs
node scripts/visual-gate/audit-admin-full.mjs
```
