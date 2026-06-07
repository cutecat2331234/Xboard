# PAGES.md
## User (hash routes)
| Route | Page | APIs | ui-spec |
|-------|------|------|--------|
| `#/login` | Login | `passport/auth/login` | `decompiled/ui-spec/user/login` |
| `#/register` | Register | `passport/auth/register` | `decompiled/ui-spec/user/register` |
| `#/dashboard` | Dashboard | `user/info, user/getSubscribe, user/notice/fetch` | `decompiled/ui-spec/user/dashboard` |
| `#/plan` | Plan | `user/plan/fetch, user/order/save` | `decompiled/ui-spec/user/plan` |
| `#/order` | Order | `user/order/fetch, user/order/checkout` | `decompiled/ui-spec/user/order` |
| `#/invite` | Invite | `user/invite/fetch, user/invite/save` | `decompiled/ui-spec/user/invite` |
| `#/traffic` | Traffic | `user/stat/getTrafficLog` | `decompiled/ui-spec/user/traffic` |
| `#/knowledge` | Knowledge | `user/knowledge/fetch` | `decompiled/ui-spec/user/knowledge` |
| `#/ticket` | Ticket | `user/ticket/fetch, user/ticket/save` | `decompiled/ui-spec/user/ticket` |
| `#/profile` | Profile | `user/changePassword, user/resetSecurity` | `decompiled/ui-spec/user/profile` |

## Admin

| Path | Module | APIs | ui-spec |
|------|--------|------|--------|
| `#/` | Dashboard | `stat/getOverride` | `decompiled/ui-spec/admin/dashboard` |
| `#/config` | System Configuration | `config/fetch, config/save` | `decompiled/ui-spec/admin/config` |
| `#/plugin` | Plugin | `plugin/getPlugins` | `decompiled/ui-spec/admin/plugin` |
| `#/theme` | Theme | `theme/getThemes` | `decompiled/ui-spec/admin/theme` |
| `#/notice` | Notice | `notice/fetch` | `decompiled/ui-spec/admin/notice` |
| `#/payment` | Payment | `payment/fetch` | `decompiled/ui-spec/admin/payment` |
| `#/knowledge` | Knowledge | `knowledge/fetch` | `decompiled/ui-spec/admin/knowledge` |
| `#/server/manage` | Node | `server/manage/getNodes` | `decompiled/ui-spec/admin/server_manage` |
| `#/server/machine` | Server | `server/machine/fetch` | `decompiled/ui-spec/admin/server_machine` |
| `#/server/group` | Permission Group | `server/group/fetch` | `decompiled/ui-spec/admin/server_group` |
| `#/server/route` | Route | `server/route/fetch` | `decompiled/ui-spec/admin/server_route` |
| `#/plan` | Plan | `plan/fetch` | `decompiled/ui-spec/admin/plan` |
| `#/order` | Order | `order/fetch` | `decompiled/ui-spec/admin/order` |
| `#/coupon` | Coupon | `coupon/fetch` | `decompiled/ui-spec/admin/coupon` |
| `#/gift-card` | Gift Card | `gift-card/templates` | `decompiled/ui-spec/admin/gift-card` |
| `#/user` | User | `user/fetch` | `decompiled/ui-spec/admin/user` |
| `#/ticket` | Ticket | `ticket/fetch` | `decompiled/ui-spec/admin/ticket` |
| `#/traffic-reset` | Traffic Reset Logs | `traffic-reset/logs` | `decompiled/ui-spec/admin/traffic-reset` |
