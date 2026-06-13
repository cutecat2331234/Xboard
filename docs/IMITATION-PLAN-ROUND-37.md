# IMITATION-PLAN Round 37 — 100% 自动化验收闭环（2026-06-13）

## 目标

Visual Gate 已在 R23 全绿；R37 把「100%」变成**可重复、可机器读取**的验收闭环。

## 计划

| # | 任务 | 说明 |
|---|------|------|
| 1 | 复验 `verify-parity-quick.mjs` | 确认 7001/7002 在线 |
| 2 | 复验 `run-parity-suite.mjs` | 全量 87 路由 |
| 3 | `run-parity-suite` 输出 JSON 报告 | `output/parity-suite-report.json` |
| 4 | 修正 AI-HANDOFF 章节标题 | 「仍未达标」→「已达标」 |
| 5 | README 补充报告路径 | 发版 checklist |

## 验收标准

```
run-parity-suite.mjs → exit 0 + parity-suite-report.json passed=true
  user 16/16 + admin 39/39 + audit 26/26 + dialogs 6/6
```

## 仍排除（非缺口）

- gift-generate（7001 无行内生成按钮）
- user gift-card（7001 legacy 无页面）

## R37 执行记录

| 验收 | 结果 | 时间 |
|------|------|------|
| `verify-parity-quick.mjs` | **PASS** | 2026-06-13 |
| `run-parity-suite.mjs` | **PASS**（87 routes） | 2026-06-13 |
| `parity-suite-report.json` | `passed: true`, auditFailCount 0 | 2026-06-13 |

**结论**：Visual Gate parity **100% 维持**；验收结果已机器可读落盘。
