# AGENTS.md

## Cursor Cloud specific instructions

Xboard is a Laravel 13 + Octane (Swoole) panel. The single PHP backend serves **two**
prebuilt frontends: the user site (Vue3, served at `/`) and the admin panel
(React, served at a secret path). Frontend source lives in `frontend/user` and
`frontend/admin`; their `build` output is committed to `theme/Xboard/assets` and
`public/assets/admin` respectively, so the app runs without rebuilding them.

### Runtime already provisioned by the update script / snapshot
- PHP 8.5 (CLI) with the `swoole`, `redis`, `pdo_sqlite`, `bcmath`, `intl`,
  `mbstring`, `gmp`, `curl`, `zip` extensions, plus Composer and a local
  `redis-server` are installed at the system level (baked into the snapshot, not
  the update script). Node 22 is preinstalled.
- The update script only refreshes code dependencies (`composer install`, frontend
  `npm install`).

### Services and how to run them (NOT done automatically)
- **Redis** must be running before the app boots (cache/queue/session use it):
  `redis-server --daemonize yes` (run from any dir; `redis-cli ping` should return `PONG`).
- **App (Octane)**: `php artisan octane:start --server=swoole --host=0.0.0.0 --port=7001`.
  This serves the user frontend at `http://localhost:7001/` and the admin panel at
  `http://localhost:7001/<secure_path>`.
- **Horizon** (queue worker, optional for most dev): `php artisan horizon`.
- The admin **secure path** equals `hash('crc32b', APP_KEY)`. Re-run
  `php artisan xboard:install` (it prints the path) or compute it from `APP_KEY` if
  you forget it.

### Local dev database / install
- This environment is configured for **SQLite + Redis** (see `.env`:
  `DB_CONNECTION=sqlite`, `DB_DATABASE=.docker/.data/database.sqlite`).
- `.env` is gitignored and already provisioned by the setup session; an admin user
  exists. If you must reinstall: empty `.env` is required, then
  `ADMIN_ACCOUNT=admin@example.com php artisan xboard:install --no-interaction`.
- **Install gotcha**: `xboard:install` treats the app as "already installed" and
  silently skips when `/.dockerenv` exists AND an `INSTALLED` line is present in
  `.env` (PHP reads the literal string `"false"` as truthy). Cloud VMs have
  `/.dockerenv`, so for a fresh non-interactive install the `.env` must NOT contain
  an `INSTALLED` line until the installer writes `INSTALLED=1` itself.

### Frontend development
- Build: `npm --prefix frontend/admin run build` and `npm --prefix frontend/user run build`
  (outputs overwrite the committed assets under `public/assets/admin` and
  `theme/Xboard/assets` — avoid committing rebuilt assets unless intended).
- Dev servers (`npm run dev`) proxy `/api` to a remote server (`127.0.0.1:7001`)
  in the committed `vite.config.ts`. To develop against the local backend, point that
  proxy at `http://localhost:7001` instead.

### Lint & tests
- Lint: `vendor/bin/phpstan analyse --memory-limit=1G` (level 5). There are
  pre-existing findings (e.g. dynamic `Workerman\Connection\TcpConnection` properties);
  the tool itself runs fine.
- Tests: `vendor/bin/phpunit`. The repo shipped without a `phpunit.xml` or
  `tests/TestCase.php`; standard Laravel scaffolding was added so the suite runs in
  isolation (in-memory SQLite, array cache). The `tests/Unit` suite passes; 4
  `tests/Feature/Server/ServerHandshakeTest` cases fail because they seed
  `admin_settings` via `Cache::forever` while the runtime reads settings through the
  `Setting` service — a pre-existing test-vs-code mismatch, not an environment issue.
