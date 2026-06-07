#!/bin/bash
set -euo pipefail
echo "=== octane-new stderr ==="
tail -80 /var/log/supervisor/xboard-octane-new-stderr*.log 2>/dev/null || tail -80 /var/log/supervisor/*octane-new* 2>/dev/null || true
echo "=== laravel log ==="
tail -40 /opt/xboard/storage/logs/laravel.log 2>/dev/null || true
echo "=== fix perms ==="
chown -R www-data:www-data /opt/xboard/storage /opt/xboard/bootstrap/cache
chmod -R ug+rwx /opt/xboard/storage /opt/xboard/bootstrap/cache
cd /opt/xboard
php8.5 artisan config:clear
php8.5 artisan route:clear
php8.5 artisan view:clear
php8.5 artisan octane:status 2>&1 || true
echo "=== restart ==="
supervisorctl stop xboard-octane-new 2>/dev/null || true
fuser -k 7011/tcp 2>/dev/null || true
sleep 2
supervisorctl start xboard-octane-new
sleep 3
supervisorctl status xboard-octane-new
curl -sI -m 8 http://127.0.0.1:7002/ | head -5
curl -sI -m 8 http://127.0.0.1:7002/theme/Xboard/assets/umi.js | head -5
