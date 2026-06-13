# Visual Gate Parity 100%（7001 ref vs 7002 cmp）

> 最后全量复验：`run-parity-suite.mjs`（见 `scripts/visual-gate/output/parity-suite-report.json`）

## 结论

**7001 闭源原版 vs 7002 开源仿写** 在 Visual Gate 定义下已达 **100%**：

| 套件 | 路由/场景 | 阈值 | 状态 |
|------|-----------|------|------|
| User visual-gate | 16 | core 0.5% / page 1% | ✅ PASS |
| Admin visual-gate | 39 | core 0.5% / page 1% / dialog 2% | ✅ PASS |
| audit-admin-full | 26 | 1% | ✅ PASS |
| probe-round29 dialogs | 6 | 2%（委托 visual-gate） | ✅ PASS |
| **Parity 小计** | **87** | — | **✅ 100%** |
| cmp-only（7002 独有） | 2 | smoke（无 7001 ref） | ✅ PASS |
| **合计** | **89** | — | **✅ 100%** |

## 一键命令

```bash
make parity              # 读上次全量报告
make parity-check        # 严格校验 87+2（不发跑 gate）
make parity-smoke        # 日常 smoke ~15min
make parity-full         # 发版全量 ~65min
```

或：

```bash
node scripts/visual-gate/verify-parity-quick.mjs
node scripts/visual-gate/run-parity-suite.mjs
node scripts/visual-gate/parity-status.mjs [--smoke|--full|--check]
./scripts/check-parity.sh [--smoke|--full|--check]
```

或：

```bash
./scripts/check-parity.sh          # 读报告
./scripts/check-parity.sh --smoke  # 报告 + quick smoke
```

## 排除项（parity 像素 gate 不可 1:1）

| 项 | 原因 | R43 cmp-only |
|----|------|--------------|
| **gift-generate** | 7001 模板行仅 Edit/Delete，无「生成」按钮 | ✅ `verify-cmp-only.mjs` |
| **user gift-card** | 7001 legacy 无用户礼品卡页 | ✅ `verify-cmp-only.mjs` |

## 功能覆盖（相对后端 API，2026-06-13）

| 区域 | 状态 | 说明 |
|------|------|------|
| 管理端 119 API | ✅ | 见 `docs/FEATURE-SURVEY.md` |
| 用户端 41 API | ✅ | 含 gift-card/transfer/telegram/mailLink |
| Visual Gate 像素 | ✅ | **87/87** |
| Cmp-only（7002 独有 UI） | ✅ | **2/2** |

仿写 **功能 + 像素 + 7002 独有 UI** 对 7001 可达范围均已 **100%**；上表 parity 排除项由 cmp-only 步骤覆盖。

## CI

GitHub Actions `parity-check.yml` 在 push/PR 时运行 `make parity-check`，校验仓库内 `parity-suite-report.json`（87+2、各 step pass）。  
实机像素 gate 仍在部署服务器执行：`make parity-smoke` / `make parity-full`。

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
