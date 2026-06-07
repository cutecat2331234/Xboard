#!/bin/bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
for d in /etc /usr /usr/lib /run; do [ -d "$d" ] && chmod 755 "$d"; done
if ! pgrep -f dns-forward.py >/dev/null; then
  nohup python3 /root/dns-forward.py >/root/dns-forward.log 2>&1 &
  sleep 1
fi

cd /opt/xboard
git pull origin master || true
[ -f public/assets/admin/index.html ] || { echo admin missing; exit 1; }

if [ ! -f composer.phar ]; then
  curl -sS https://getcomposer.org/installer | php8.5
fi
php8.5 composer.phar update --no-dev --optimize-autoloader --no-interaction 2>&1 | tee /root/composer-update.log | tail -40

MYSQL_XBOARD_PASS="${MYSQL_XBOARD_PASS:-change-me-db}"
cat > .env <<EOF
APP_NAME=XBoard
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=http://127.0.0.1:7001
LOG_CHANNEL=stack
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=xboard
DB_USERNAME=xboard
DB_PASSWORD=${MYSQL_XBOARD_PASS}
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379
BROADCAST_DRIVER=log
CACHE_DRIVER=redis
CACHE_PREFIX=xboard_cache
SESSION_COOKIE=xboard_session
QUEUE_CONNECTION=redis
EOF
php8.5 artisan key:generate --force
php8.5 artisan xboard:install --no-interaction 2>&1 | tee /root/xboard-install.log
REDIS_PASS="$(grep -E '^requirepass' /etc/redis/redis.conf 2>/dev/null | awk '{print $2}')"
REDIS_PORT="$(grep -E '^port' /etc/redis/redis.conf 2>/dev/null | awk '{print $2}')"
[ -n "$REDIS_PORT" ] && sed -i "s/^REDIS_PORT=.*/REDIS_PORT=${REDIS_PORT}/" .env
[ -n "$REDIS_PASS" ] && sed -i "s/^REDIS_PASSWORD=.*/REDIS_PASSWORD=${REDIS_PASS}/" .env
php8.5 artisan config:clear
mkdir -p public/theme/Xboard
if [ -d legacy-dist/public/theme/Xboard/assets ]; then
  cp -a legacy-dist/public/theme/Xboard/assets public/theme/Xboard/
  cp -a legacy-dist/theme/Xboard/dashboard.blade.php theme/Xboard/dashboard.blade.php
fi
cp -a theme/Xboard/. public/theme/Xboard/
chown -R www-data:www-data storage bootstrap/cache public/theme
chmod -R 775 storage bootstrap/cache public/theme

[ -d /opt/Xboard-master ] && (cd /opt/Xboard-master && docker compose down) || true

cat > /etc/nginx/sites-available/xboard <<'NGINX'
server {
    listen 7001;
    server_name _;
    root /opt/xboard/public;
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
NGINX
ln -sf /etc/nginx/sites-available/xboard /etc/nginx/sites-enabled/xboard
nginx -t && systemctl reload nginx

cat > /etc/supervisor/conf.d/xboard.conf <<'SUP'
[program:xboard-octane]
command=/usr/bin/php8.5 /opt/xboard/artisan octane:start --host=127.0.0.1 --port=7010
directory=/opt/xboard
user=www-data
autostart=true
autorestart=true
stdout_logfile=/var/log/xboard-octane.log
stderr_logfile=/var/log/xboard-octane.err.log
[program:xboard-horizon]
command=/usr/bin/php8.5 /opt/xboard/artisan horizon
directory=/opt/xboard
user=www-data
autostart=true
autorestart=true
stdout_logfile=/var/log/xboard-horizon.log
stderr_logfile=/var/log/xboard-horizon.err.log
SUP
systemctl enable supervisor && systemctl start supervisor
supervisorctl reread && supervisorctl update
supervisorctl restart xboard-octane xboard-horizon || supervisorctl start xboard-octane xboard-horizon
sleep 5
curl -sI http://127.0.0.1:7001 | head -5
php8.5 artisan about | head -12
echo FINISH_DEPLOY_DONE
