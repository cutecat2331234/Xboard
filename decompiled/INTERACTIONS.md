# INTERACTIONS.md

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
