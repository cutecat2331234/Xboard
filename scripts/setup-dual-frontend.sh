#!/bin/bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

for d in /etc /usr /usr/lib /run; do [ -d "$d" ] && chmod 755 "$d"; done
chmod 1777 /tmp /var/tmp
if ! pgrep -f dns-forward.py >/dev/null; then
  nohup python3 /root/dns-forward.py >/root/dns-forward.log 2>&1 &
  sleep 1
fi

LEGACY=/opt/xboard-legacy
NEW=/opt/xboard

echo '=== Snapshot legacy frontend 7001 ==='
if [ ! -d "$LEGACY/.git" ]; then
  rm -rf "$LEGACY"
  cp -a "$NEW" "$LEGACY"
fi
mkdir -p "$LEGACY/storage/frontend-variant"
echo legacy > "$LEGACY/storage/frontend-variant/mode"
mkdir -p "$LEGACY/public/theme/Xboard" "$LEGACY/public/assets/admin"
cp -a "$LEGACY/theme/Xboard/." "$LEGACY/public/theme/Xboard/" 2>/dev/null || true

echo '=== New stack marker 7002 ==='
mkdir -p "$NEW/storage/frontend-variant"
echo new > "$NEW/storage/frontend-variant/mode"

REDIS_PASS="$(grep -E '^requirepass' /etc/redis/redis.conf 2>/dev/null | awk '{print $2}')"
REDIS_PORT="$(grep -E '^port' /etc/redis/redis.conf 2>/dev/null | awk '{print $2}')"
for APP in "$LEGACY" "$NEW"; do
  [ -n "$REDIS_PORT" ] && sed -i "s/^REDIS_PORT=.*/REDIS_PORT=${REDIS_PORT}/" "$APP/.env"
  [ -n "$REDIS_PASS" ] && sed -i "s/^REDIS_PASSWORD=.*/REDIS_PASSWORD=${REDIS_PASS}/" "$APP/.env"
  chown -R www-data:www-data "$APP/storage" "$APP/bootstrap/cache" "$APP/public/theme" "$APP/public/assets" 2>/dev/null || true
done

cat > /etc/nginx/sites-available/xboard-dual <<'EOF'
server {
    listen 7001;
    server_name _;
    root /opt/xboard-legacy/public;
    index index.php;
    location ~* \.(jpg|jpeg|png|gif|js|css|svg|woff2|woff|ttf|eot|wasm|json|ico|br|gz)$ {
        try_files $uri =404;
        expires 1h;
        access_log off;
    }
    location / {
        proxy_pass http://127.0.0.1:7010;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
server {
    listen 7002;
    server_name _;
    root /opt/xboard/public;
    index index.php;
    location ~* \.(jpg|jpeg|png|gif|js|css|svg|woff2|woff|ttf|eot|wasm|json|ico|br|gz)$ {
        try_files $uri =404;
        expires 1h;
        access_log off;
    }
    location / {
        proxy_pass http://127.0.0.1:7011;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
ln -sf /etc/nginx/sites-available/xboard-dual /etc/nginx/sites-enabled/xboard-dual
rm -f /etc/nginx/sites-enabled/xboard
nginx -t && systemctl reload nginx

cat > /etc/supervisor/conf.d/xboard.conf <<'EOF'
[program:xboard-octane-legacy]
command=/usr/bin/php8.5 /opt/xboard-legacy/artisan octane:start --host=127.0.0.1 --port=7010
directory=/opt/xboard-legacy
user=www-data
autostart=true
autorestart=true
stdout_logfile=/var/log/xboard-octane-legacy.log
stderr_logfile=/var/log/xboard-octane-legacy.err.log

[program:xboard-octane-new]
command=/usr/bin/php8.5 /opt/xboard/artisan octane:start --host=127.0.0.1 --port=7011
directory=/opt/xboard
user=www-data
autostart=true
autorestart=true
stdout_logfile=/var/log/xboard-octane-new.log
stderr_logfile=/var/log/xboard-octane-new.err.log

[program:xboard-horizon]
command=/usr/bin/php8.5 /opt/xboard/artisan horizon
directory=/opt/xboard
user=www-data
autostart=true
autorestart=true
stdout_logfile=/var/log/xboard-horizon.log
stderr_logfile=/var/log/xboard-horizon.err.log
EOF
supervisorctl reread && supervisorctl update
fuser -k 7010/tcp 7011/tcp 2>/dev/null || true
sleep 2
supervisorctl restart xboard-octane-legacy xboard-octane-new xboard-horizon || supervisorctl start all
sleep 8
curl -sI --max-time 8 http://127.0.0.1:7001 | head -4
curl -sI --max-time 8 http://127.0.0.1:7002 | head -4
echo DUAL_FRONTEND_OK
