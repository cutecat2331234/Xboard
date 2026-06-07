#!/usr/bin/env python3
"""Generate decompiled/PAGES.md and API-INVENTORY.md from Laravel routes."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
OUT_PAGES = ROOT / "decompiled/PAGES.md"
OUT_API = ROOT / "decompiled/API-INVENTORY.md"
OUT_INTER = ROOT / "decompiled/INTERACTIONS.md"

USER_ROUTES = [
    ("#/login", "Login", "passport/auth/login", "decompiled/ui-spec/user/login"),
    ("#/register", "Register", "passport/auth/register", "decompiled/ui-spec/user/register"),
    ("#/dashboard", "Dashboard", "user/info, user/getSubscribe, user/notice/fetch", "decompiled/ui-spec/user/dashboard"),
    ("#/plan", "Plan", "user/plan/fetch, user/order/save", "decompiled/ui-spec/user/plan"),
    ("#/order", "Order", "user/order/fetch, user/order/checkout", "decompiled/ui-spec/user/order"),
    ("#/invite", "Invite", "user/invite/fetch, user/invite/save", "decompiled/ui-spec/user/invite"),
    ("#/traffic", "Traffic", "user/stat/getTrafficLog", "decompiled/ui-spec/user/traffic"),
    ("#/knowledge", "Knowledge", "user/knowledge/fetch", "decompiled/ui-spec/user/knowledge"),
    ("#/ticket", "Ticket", "user/ticket/fetch, user/ticket/save", "decompiled/ui-spec/user/ticket"),
    ("#/profile", "Profile", "user/changePassword, user/resetSecurity", "decompiled/ui-spec/user/profile"),
]

ADMIN_NAV = [
    ("/", "Dashboard", "stat/getOverride"),
    ("/config", "System Configuration", "config/fetch, config/save"),
    ("/plugin", "Plugin", "plugin/getPlugins"),
    ("/theme", "Theme", "theme/getThemes"),
    ("/notice", "Notice", "notice/fetch"),
    ("/payment", "Payment", "payment/fetch"),
    ("/knowledge", "Knowledge", "knowledge/fetch"),
    ("/server/manage", "Node", "server/manage/getNodes"),
    ("/server/machine", "Server", "server/machine/fetch"),
    ("/server/group", "Permission Group", "server/group/fetch"),
    ("/server/route", "Route", "server/route/fetch"),
    ("/plan", "Plan", "plan/fetch"),
    ("/order", "Order", "order/fetch"),
    ("/coupon", "Coupon", "coupon/fetch"),
    ("/gift-card", "Gift Card", "gift-card/templates"),
    ("/user", "User", "user/fetch"),
    ("/ticket", "Ticket", "ticket/fetch"),
    ("/traffic-reset", "Traffic Reset Logs", "traffic-reset/logs"),
]


def parse_routes(file_path: Path, prefix: str) -> list[str]:
    text = file_path.read_text(encoding="utf-8")
    paths = re.findall(r"\$router->(?:get|post|any|put|delete|patch)\s*\(\s*['\"]([^'\"]+)['\"]", text, re.I)
    groups = re.findall(r"'prefix'\s*=>\s*'([^']+)'", text)
    # flat list with group prefixes simplified
    out = []
    for p in paths:
        out.append(f"{prefix}/{p}".replace("//", "/"))
    return sorted(set(out))


def main() -> None:
    v1_user = parse_routes(ROOT / "app/Http/Routes/V1/UserRoute.php", "/api/v1/user")
    v1_pass = parse_routes(ROOT / "app/Http/Routes/V1/PassportRoute.php", "/api/v1/passport")
    v2_admin = parse_routes(ROOT / "app/Http/Routes/V2/AdminRoute.php", "/api/v2/{secure_path}")
    v2_pass = parse_routes(ROOT / "app/Http/Routes/V2/PassportRoute.php", "/api/v2/passport")

    pages = ["# PAGES.md\n", "## User (hash routes)\n", "| Route | Page | APIs | ui-spec |\n", "|-------|------|------|--------|\n"]
    for r, name, apis, spec in USER_ROUTES:
        pages.append(f"| `{r}` | {name} | `{apis}` | `{spec}` |\n")
    pages.append("\n## Admin\n\n| Path | Module | APIs | ui-spec |\n|------|--------|------|--------|\n")
    for p, name, apis in ADMIN_NAV:
        slug = p.strip("/").replace("/", "_") or "dashboard"
        pages.append(f"| `#/{p.lstrip('/')}` | {name} | `{apis}` | `decompiled/ui-spec/admin/{slug}` |\n")
    OUT_PAGES.write_text("".join(pages), encoding="utf-8")

    api = [
        "# API-INVENTORY.md\n\n",
        "## Auth\n\n",
        "- User: `localStorage.xboard_auth_data` → `Authorization` header (Bearer …)\n",
        "- Admin: same `xboard_auth_data` key\n",
        "- 403 → clear storage, redirect login\n\n",
        "## V1 Passport\n\n",
    ]
    for p in v1_pass:
        api.append(f"- `{p}`\n")
    api.append("\n## V1 User\n\n")
    for p in v1_user:
        api.append(f"- `{p}`\n")
    api.append("\n## V2 Passport\n\n")
    for p in v2_pass:
        api.append(f"- `{p}`\n")
    api.append("\n## V2 Admin (`/api/v2/{secure_path}`)\n\n")
    for p in v2_admin:
        api.append(f"- `{p}`\n")
    OUT_API.write_text("".join(api), encoding="utf-8")

    inter = """# INTERACTIONS.md

## User

- Login failure: inline error + Naive message toast
- 403: redirect `#/login`, clear `xboard_auth_data`
- Order: save → checkout (type 1 opens URL) / cancel pending
- Ticket: create modal, close action
- Profile: change password form, reset subscribe link

## Admin

- Sign in at `#/sign-in`, store `auth_data` in `xboard_auth_data`
- Sidebar order matches `nav.*` keys in locales
- Module tables: fetch on mount, empty state "No data"
- Config page: Monaco JSON read-only preview of `/config/fetch`

## Toasts / confirms

Mirror legacy dist: success on save, destructive confirm on delete (admin modules TBD per ui-spec).
"""
    OUT_INTER.write_text(inter, encoding="utf-8")
    print("INVENTORY_WRITTEN")


if __name__ == "__main__":
    main()
