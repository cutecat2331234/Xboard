#!/bin/bash
# Write admin login hints to a local file (paths/credentials from environment).
set -euo pipefail

APP_ROOT="${APP_ROOT:-/opt/xboard}"
OUT="${CREDENTIALS_FILE:-/root/xboard-credentials.txt}"
APP_URL="${APP_URL:-http://127.0.0.1:7001}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}"

SECURE=$(php8.5 -r "require '${APP_ROOT}/vendor/autoload.php'; \$a=require '${APP_ROOT}/bootstrap/app.php'; \$a->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap(); echo admin_setting('secure_path')?:hash('crc32b',config('app.key'));" 2>/dev/null || true)

cat > "$OUT" <<EOF
Xboard 登录凭据（请妥善保管，勿提交到 Git）
================================
用户前台:
  邮箱: ${ADMIN_EMAIL}
  密码: （安装时设置，见 .env / 安装日志）

管理后台:
  ${APP_URL}/${SECURE}
  同上邮箱密码
EOF
chmod 600 "$OUT"
cat "$OUT"
