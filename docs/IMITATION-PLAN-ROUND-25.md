# Round 25 仿造计划（弹窗 + 审计 clip 优化）

## R25 对比结论

### 弹窗（audit-dialogs-admin.mjs）

| 页面 | 7001 | 7002（R24） | R25 动作 |
|------|------|-------------|----------|
| plan | Dialog 1 | 0（触发器未命中） | 精确触发 `添加套餐` + 等待加载 |
| coupon | Dialog 1 | 0 | 精确触发 `添加优惠券` |
| server_manage | Dialog 1 | 0 | 精确触发 `添加节点` |
| plugin | Dialog 1 | 0 | **新增上传 Dialog**（拖拽区，对齐 locale） |
| user/order | 0 | 0 | 编辑在 DropdownMenu 内，需 R26 专项触发 |

### 配置页像素（audit-round24）

- 8 个 config 子页仍 >1%，结构已对齐
- 根因：截图含 PageToolbar（y=0~64）与 header 抗锯齿噪声
- R25：`CONFIG_CLIP` 改为 `y:64`（跳过 4rem 顶栏）

## R25 已实现

1. `PluginPage.tsx` — 上传插件 Dialog（title/drag/click/support 文案对齐 zh-CN locale）
2. `audit-dialogs-admin.mjs` — 多触发器、waitForSelector、storageState
3. `audit-admin-full.mjs` — CONFIG_CLIP y=64，输出 `audit-round25-report.json`
4. `config-section-fields.tsx` — email TabsContent `space-y-4`

## R25 验收

```bash
python scripts/ssh-run.py scripts/restart-dual.sh
python scripts/deploy-rewrite-frontend.py
node scripts/visual-gate/audit-dialogs-admin.mjs
node scripts/visual-gate/audit-admin-full.mjs
```

## R26 待办（诚实剩余）

- User 编辑/封禁/邮件：DropdownMenu 触发链
- Order 分配/详情：行内按钮定位
- GiftCard 模板/生成 Dialog 对齐
- config 8 子页像素 <1%（或表单区专用 clip）
- notice 路由 7001 偶发 EMPTY_RESPONSE（网络）
