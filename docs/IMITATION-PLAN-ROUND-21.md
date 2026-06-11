# Round 21 仿造计划（7001 legacy vs 7002 仿写）

基准：`legacy-dist/public/assets/admin`（lucide + tabler 混用）、`audit-round21-report.json`（**zh-CN** 全量 25 路由）。

## 验收标准升级

| 项 | 旧标准 | 新标准 |
|----|--------|--------|
| Admin locale | 强制 en-US | **zh-CN**（与实机一致） |
| Config | 仅 `#/config/system` | **9 个子页**全部 gate |
| 图标 | 未校验库 | 侧栏 **1× lucide-package + tabler** 与 7001 一致 |
| 结构 | 未校验 DOM | monaco/tabs/dialog 数量对齐 |

## P0 — 结构不一致（功能/交互）

| ID | 页面 | 状态 | 终验 diff%（audit zh-CN） |
|----|------|------|---------------------------|
| R21-01 | config/subscribe-template | **已修** 6 Tab + Monaco | **0.764% PASS** |
| R21-02 | config/email | **已修** 2 Tab | **0.802% PASS** |
| R21-03 | 侧栏图标 | **已修** asideLucide=1 | 全站 PASS |
| R21-04 | order | 结构 OK，像素波动 | **0.57–1.94%**（复跑波动） |
| R21-05 | config/safe | 字段已对齐，像素微差 | **1.241% FAIL** |
| R21-06 | config/subscribe | 字段已对齐，像素微差 | **1.776% FAIL** |
| R21-07 | config/telegram | 字段已对齐，像素微差 | **1.367% FAIL** |
| R21-08 | ticket | **已修** 2 Tab | **0.755% PASS** |

## P1 — 已通过但仍有 gap

- ~~全站 `asideLucide`：7001=1，7002=4~~ → **已对齐 asideLucide=1**
- dashboard：7002 多 2 个 table（统计卡布局）；audit **0.451% PASS**（core 0.5%）
- plugin/theme/gift-card tabs 已对齐

## P2 — 弹窗/对话框（待逐页 live 扫）

- ServerManage 编辑节点 / ECH / 批量
- UserPage 编辑/分配订单/邮件/封禁
- Order 详情 Dialog
- Plugin 配置/上传 ZIP
- GiftCard 模板/生成
- Dashboard Horizon 失败任务详情（已做）

## 实施顺序（2026-06-11 完成度）

- [x] 1. 订阅模板 Tab+Monaco（R21-01）
- [x] 2. 侧栏图标 lucide/tabler 混用（R21-03）
- [x] 3. 邮件设置 Tab 拆分（R21-02）
- [x] 4. Ticket Tab 筛选（R21-08）
- [x] 5. config safe/subscribe/telegram 字段对齐（功能）
- [x] 6. `audit-admin-full.mjs` + Monaco/Tab 等待 + zh-CN
- [ ] 7. config safe/subscribe/invite/telegram 像素 ≤1%（仍差 ~0.2–0.8%）
- [~] 8. order 像素复验（单次 PASS 0.57%，另一次 1.94%）
- [~] 9. `visual-gate.mjs` ADMIN_LOCALE=zh-CN 全 25 路由（长跑中 7002 502 中断）

## 命令

```bash
node scripts/visual-gate/audit-admin-full.mjs
node scripts/visual-gate/run-full-gate-stable.mjs  # ADMIN_LOCALE=zh-CN
python scripts/deploy-rewrite-frontend.py
```
