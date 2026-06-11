# Round 35 仿造计划（本地双端对比 + 后端修 bug）

> 本轮在 **Cursor Cloud VM 本地** 搭建 7001(legacy)/7002(replica) 双端，跑像素对比并修 bug。
> 不依赖远程 127.0.0.1。

## 本地双端对比环境

- 7001 = legacy（`legacy-dist` 覆盖到 `/home/ubuntu/xboard-legacy`，octane :7001）
- 7002 = replica（`/workspace` 当前 build，octane :7002）
- 两端各自独立 sqlite（`.docker/.data/database.sqlite`），共用本地 redis
- secure_path = `hash('crc32b', APP_KEY)`（本机为 `4274bfcf`）
- 管理员：`admin@example.com` / `your-password`

跑对比（visual-gate 脚本现支持 env 覆盖 REF/CMP/SECURE）：

```bash
# 先 seed 数据，保证各表/弹窗有内容
php scripts/visual-gate/seed-compare-data.php                       # workspace(7002)
(cd /home/ubuntu/xboard-legacy && php scripts/visual-gate/seed-compare-data.php)  # legacy(7001)

VG_REF=http://127.0.0.1:7001 VG_CMP=http://127.0.0.1:7002 VG_SECURE=4274bfcf \
  node scripts/visual-gate/audit-admin-full.mjs          # 25 路由像素
VG_REF=... VG_CMP=... VG_SECURE=... node scripts/visual-gate/probe-round29-dialogs.mjs  # 弹窗像素
VG_REF=... VG_CMP=... VG_SECURE=... node scripts/visual-gate/probe-round34-deep.mjs     # 弹窗结构
```

## 关键修复

### 1. 管理端本地 build 白屏（P0，已修）
`vite build` 把 manifest 写到 `public/assets/admin/.vite/manifest.json`，而
`admin.blade.php` 读 `public/assets/admin/manifest.json`。本地 `npm run build`
未复制 → blade 走 fallback 的非 hash 文件名 → JS 404 → 管理端整页空白（停在
sign-in）。**修复**：`frontend/admin/package.json` 增加 `postbuild` 自动复制
（与 `deploy-rewrite-frontend.py` 行为一致）。修复前 25 路由审计全部「无中文/0
tabs」，本质是 replica 没渲染；修复后 25 路由像素 ≤1.06%。

### 2. 管理端 i18n 小差（已修）
- 语言切换按钮：legacy 显示 `CN`，replica 显示 `中文` → 改 `Header.tsx` 标签为 `CN`
- 表单 label 字号：legacy `11px/600/lh20`，replica `16px/500` → 改 `ui/label.tsx`

### 3. 后端字段重命名导致前端少显示（P1，已修）
commit #967 把 `v2_order.refund_amount` 改名 `surplus_credit`，但**两套前端**
（legacy 与 replica）都还在读 `refund_amount`，导致订单详情「退款」金额永不显示。
API（`OrderResource`）现返回 `surplus_credit`。**修复**：replica
`frontend/user/src/pages/OrderDetailPage.vue` 全部改读 `surplus_credit`。已端到端
验证：seed 一个 `surplus_credit=1000` 的订单，订单详情正确显示「退款 ¥10.00」。
（legacy 是冻结产物无法改，此差异属原版自身 bug。）

## 本轮 25 路由像素基线（阈值 1%，dashboard 0.5%）

只有 5 个略超阈值，且无结构 gap，均为字体抗锯齿/数据级微差：
`dashboard 0.544 / config-email 1.057 / knowledge 1.009 / server_machine 1.044 / user 1.001`。

## 仍未达标：弹窗（阈值 2%，下一轮重点）

`probe-round29-dialogs`（修 label 后）：

| 弹窗 | 像素差 |
|------|--------|
| user-edit | 4.60% |
| plan-add | 4.51% |
| server-add | 4.01% |
| gift-template-edit | 3.56% |
| user-mail | 3.74% |
| user-create | 3.46% |

### 已定位的结构根因（probe-round34-deep + DOM 对比）

- **创建用户弹窗（user-create）**：legacy 宽 ~576px（`max-w-xl`），replica `sm:max-w-md`(448px)；
  legacy 邮箱是 `[本地]@[域名]` 同行内联，replica 拆成「域 / 帐号」两行；legacy
  到期时间/订阅计划为**两列**，replica 堆叠；按钮 legacy「确认」replica「生成」。
- **server-add**：replica label 13 个 vs legacy 15 个（**少 2 个字段**），scrollH 798 vs 1034。
- **user-edit Sheet**：每字段行 replica ~60px vs legacy ~68px（累计 scrollH 1256 vs 1630）。
- **suffix（¥/GB）**：legacy 用 `<span>`（plan-add 计 2 个），replica 计 0（用 `<div>`）。

下一轮按上表逐弹窗对齐（宽度、字段数、行高、两列布局、按钮文案、suffix 标签）。

## Round 35 后续进展（本次会话）

已对齐：
- **plan-add**：宽 550→576;价格网格 3 列→响应式至 4 列(月/季/半年/年 + 两年/三年);
  suffix `<div>`→`<span>`(共享 `SuffixInput`,同时惠及 server-add/user-edit)。布局已与
  legacy 基本一致(见 cmp 截图),残差为字体/逐行垂直节奏级(~4.3%)。
- **server-add**：宽 550→576。

精确规格(probe-round34-deep + diag DOM,供逐弹窗继续):
- **user-create**：legacy 是**居中 Dialog 576×468**,5 个 label(`邮箱*`/`密码`/`到期时间`/
  `订阅计划`/`生成数量`),邮箱是 `[帐号]@[域名]` 同行内联,到期时间+订阅计划**两列**,按钮
  `确认`。replica 目前用**右侧 Sheet 448**(复用 user-edit 的 Sheet),label 6 个
  (`域`/`帐号(批量生成请留空)`...),按钮 `生成`。**需把 create 从 Sheet 拆成独立 Dialog**。
- **server-add**：legacy 15 label(含 2 个空 label,来自权限组/路由组多选的子 label),
  scrollH 1074 vs replica 798(legacy 逐行更高)。
- **user-edit**：Sheet 宽度已对(448);逐行高度仍偏矮(label 字号已修),需核对每行 space-y。
- 残差主因:**逐行垂直节奏 + 字体渲染**,需逐行对齐 `space-y`/label 行高/控件高度。

待续(像素 <2% 仍未达成,属多轮迭代工程)。功能存在性见 `FEATURE-SURVEY.md`。
