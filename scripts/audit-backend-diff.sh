#!/bin/bash
export PATH="/usr/bin:/bin:$PATH"
echo "=== Laravel/PHP versions ==="
cd /opt/xboard-legacy && php8.5 artisan --version
cd /opt/xboard && php8.5 artisan --version
echo "=== .env diff (non-secret keys) ==="
diff <(grep -E '^(APP_|DB_|REDIS_|CACHE_)' /opt/xboard-legacy/.env | sed 's/PASSWORD=.*/PASSWORD=***/') \
     <(grep -E '^(APP_|DB_|REDIS_|CACHE_)' /opt/xboard/.env | sed 's/PASSWORD=.*/PASSWORD=***/') || true
echo "=== git/app version ==="
grep APP_VERSION /opt/xboard/.env 2>/dev/null || true
ls -la /opt/xboard-legacy/composer.lock /opt/xboard/composer.lock | awk '{print $5,$9}'
