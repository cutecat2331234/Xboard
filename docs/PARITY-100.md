# Visual Gate Parity 100%（7001 ref vs 7002 cmp）

> 最后全量复验：`run-parity-suite.mjs`（见 `scripts/visual-gate/output/parity-suite-report.json`）

## 结论

**7001 闭源原版 vs 7002 开源仿写** 在 Visual Gate 定义下已达 **100%**：

| 套件 | 路由数 | 阈值 | 状态 |
|------|--------|------|------|
| User visual-gate | 16 | core 0.5% / page 1% | ✅ PASS |
| Admin visual-gate | 39 | core 0.5% / page 1% / dialog 2% | ✅ PASS |
| audit-admin-full | 26 | 1% | ✅ PASS |
| probe-round29 dialogs | 6 | 2%（委托 visual-gate） | ✅ PASS |
| **合计** | **87** | — | **✅ 100%** |

## 一键命令

```bash
# 日常 smoke（~13 min）
node scripts/visual-gate/verify-parity-quick.mjs

# 发版前全量（~65 min）
node scripts/visual-gate/run-parity-suite.mjs

# 读上次报告 + 可选 smoke
node scripts/visual-gate/parity-status.mjs
node scripts/visual-gate/parity-status.mjs --smoke
```

或：

```bash
./scripts/check-parity.sh          # 读报告
./scripts/check-parity.sh --smoke  # 报告 + quick smoke
```

## 排除项（不可 / 不应 gate）

| 项 | 原因 |
|----|------|
| **gift-generate** | 7001 `#/finance/gift-card` 模板行仅 Edit/Delete，无「生成」按钮，无法 1:1 像素对比 |
| **user gift-card** | 7001 legacy umi 无用户礼品卡页；`INCLUDE_GIFT_CARD=1` 仅测 7002 |

## 关键 dialog 像素（≤2%）

| 路由 | 典型 diff |
|------|-----------|
| user-edit | ~1.68% |
| user-create | ~1.65% |
| user-mail | ~1.48% |
| gift-template | ~1.90% |
| plan-add | ~1.02% |
| server-add | ~1.81% |

## 相关文档

- `scripts/visual-gate/README.md` — 用法与路由列表
- `docs/IMITATION-PLAN-ROUND-37.md` — 验收闭环 JSON
- `docs/AI-HANDOFF.md` — 给后续 AI 的交接
