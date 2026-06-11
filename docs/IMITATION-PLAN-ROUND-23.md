# Round 23 仿造计划（终局对齐）

基准：`audit-admin-full.mjs`（zh-CN 25 路由）、`audit-dialogs-admin.mjs`、`legacy-dist`。

## 当前状态（Round 22 末）

| 指标 | 结果 |
|------|------|
| zh-CN 25 路由审计 | **22/25 PASS**（结构 monaco/tabs/asideLucide 已对齐） |
| 剩余像素 FAIL | `config-safe` 1.18%、`config-subscribe` 1.71%、`config-telegram` 1.41% |
| 订单页 | **0.57% PASS**（表格遮罩稳定） |

## R23-P0 像素收尾

| ID | 路由 | 根因假设 | 动作 |
|----|------|----------|------|
| R23-01 | config-* | 截图含侧栏 icon 差 | ✅ 审计 clip 改为 `x:256` 主内容区 |
| R23-02 | config-safe | captcha 类型缺 description | 补 `captcha.type.description` |
| R23-03 | config-subscribe | 字段顺序/描述块 | 对齐 locale 顺序 |
| R23-04 | config-telegram | webhook 区块布局 | 扁平化，与 7001 字段间距一致 |

## R23-P1 弹窗审计

| 页面 | 7001 预期弹窗 | 脚本 |
|------|---------------|------|
| UserPage | 编辑/邮件/封禁/分配 | `audit-dialogs-admin.mjs` |
| OrderPage | 分配订单/详情 | 同上 |
| ServerManage | 添加/编辑/ECH | 同上 |
| PluginPage | 上传 ZIP/配置 | 同上 |
| GiftCardPage | 模板/生成 | 同上 |
| Dashboard | Horizon 失败任务 | 同上 |

## R23-P2 结构余量

- Dashboard `tables`：RankCard 已改 div 网格（待复验 `tables:0`）
- 侧栏 `asideTabler` 34 vs 35：定位缺失的第 35 个 tabler 节点

## 验收

```bash
node scripts/visual-gate/audit-admin-full.mjs   # 25/25 PASS
node scripts/visual-gate/audit-dialogs-admin.mjs
cd scripts/visual-gate && set SIDE=admin&& set ADMIN_LOCALE=zh-CN&& node visual-gate.mjs
```
