# Visual gate

Pixel-diff harness comparing reference (7001) vs rewrite (7002) frontends.

## Thresholds

| Route kind | Limit | Examples |
|------------|-------|----------|
| Core | **0.5%** | `login`, `dashboard` (user); `sign-in`, `dashboard` (admin) |
| Page | **1%** | All other listed page routes |
| Dialog (`DIALOG_ROUTES`) | **2%** | `user-create`, `user-edit`, `plan-add`, `server-add`, `gift-template`, `user-mail` |

User logged-in pages in `USER_SHELL_ROUTES` compare only the main content crop (`USER_MAIN_BOX`), not the full shell.

## Usage

```bash
cd scripts/visual-gate

# User site (default routes)
SIDE=user node visual-gate.mjs

# Admin panel (default routes incl. dialog flows)
SIDE=admin ADMIN_LOCALE=zh-CN node visual-gate.mjs

# Subset
SIDE=admin ROUTES=sign-in,dashboard,plan-add node visual-gate.mjs

# Dialog-only
SIDE=admin ROUTES=user-create,plan-add,server-add,gift-template,user-mail node visual-gate.mjs
```

Environment overrides: `REF_BASE`, `CMP_BASE`, `SECURE_PATH`, `VIEWPORT_W`, `VIEWPORT_H`, `FULL_PAGE=1`, `INCLUDE_GIFT_CARD=1`.

### Full parity suite (recommended)

```bash
node scripts/visual-gate/run-parity-suite.mjs
```

Runs **user visual-gate (16)** + **admin visual-gate (39)** + **audit-admin-full (26)** + **probe-round29 dialogs (6)** + **cmp-only (2)**. Exit `0` = full parity PASS.

### Cmp-only (7002-only, no 7001 ref)

```bash
node scripts/visual-gate/verify-cmp-only.mjs
```

Covers `gift-generate` dialog and user `#/gift-card` page smoke on 7002 only.

Writes `output/parity-suite-report.json` with timestamp, step status, and excluded scenarios.

### Quick smoke (~5–8 min)

```bash
node scripts/visual-gate/verify-parity-quick.mjs
```

Covers user core 4 routes + admin core 3 routes + all 6 dialog routes + cmp-only 2 scenarios.

### Status check (read last full-suite report)

```bash
node scripts/visual-gate/parity-status.mjs
node scripts/visual-gate/parity-status.mjs --smoke
```

See also `docs/PARITY-100.md`.

### Full suite (refresh report, ~65 min)

```bash
node scripts/visual-gate/parity-status.mjs --full
```

## Route lists

### User (`USER_ROUTES_DEFAULT`)

`login`, `register` (`#/login?tab=register`), `forgetpassword` (`#/login?tab=forget`), `dashboard`, `plan`, `plan-detail`, `order`, `order-detail`, `invite`, `traffic`, `knowledge`, `ticket`, `ticket-detail`, `profile`, `node`

**`gift-card`** is excluded by default: legacy umi.js (7001) has no user gift-card page — it exists only on the rewrite (7002). Opt in with `INCLUDE_GIFT_CARD=1` or `ROUTES=...,gift-card`.

### Admin pages (`ADMIN_ROUTES_DEFAULT`)

Config subtree, finance, server, user/ticket, **`traffic-reset`**, plus dialog routes below.

### Admin dialogs (`DIALOG_ROUTES`, 2% threshold)

| Route | Parent page | Opens |
|-------|-------------|-------|
| `user-create` | `user` | “创建用户” button |
| `user-edit` | `user` | row ⋯ menu → “编辑” (Sheet) |
| `user-mail` | `user` | row “操作” → “发送邮件” |
| `plan-add` | `plan` | “添加套餐” / “添加” |
| `server-add` | `server_manage` | “添加节点” / “添加” |
| `gift-template` | `gift-card` | “模板” tab → row “编辑” |

Dialog shots mask volatile input values before diff. Flows mirror `probe-round29-dialogs.mjs`.

## Output

Screenshots and `*-diff.png` land in `output/user/` or `output/admin/`. Exit code `1` on any failure (`VISUAL_GATE_FAILED`).
