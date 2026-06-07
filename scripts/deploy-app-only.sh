#!/bin/bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
for d in /etc /usr /usr/lib /run /bin /sbin; do [ -d "$d" ] && chmod 755 "$d"; done
chmod 1777 /tmp /var/tmp
if ! pgrep -f dns-forward.py >/dev/null; then
  nohup python3 /root/dns-forward.py >/root/dns-forward.log 2>&1 &
  sleep 1
fi

MYSQL_ROOT_PASS="${MYSQL_ROOT_PASS:-XboardRoot2026!}"
MYSQL_XBOARD_PASS="${MYSQL_XBOARD_PASS:-XboardDb2026!}"
mysql -e "SELECT 1" >/dev/null 2>&1 || mysql -uroot -p"${MYSQL_ROOT_PASS}" -e "SELECT 1"
mysql -uroot -p"${MYSQL_ROOT_PASS}" -e "CREATE DATABASE IF NOT EXISTS xboard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER IF NOT EXISTS 'xboard'@'localhost' IDENTIFIED BY '${MYSQL_XBOARD_PASS}'; GRANT ALL ON xboard.* TO 'xboard'@'localhost'; FLUSH PRIVILEGES;" 2>/dev/null || \
mysql -e "CREATE DATABASE IF NOT EXISTS xboard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER IF NOT EXISTS 'xboard'@'localhost' IDENTIFIED BY '${MYSQL_XBOARD_PASS}'; GRANT ALL ON xboard.* TO 'xboard'@'localhost'; FLUSH PRIVILEGES;"

APP_DIR=/opt/xboard
rm -rf "$APP_DIR"
git clone https://github.com/cutecat2331234/Xboard.git "$APP_DIR"
cd "$APP_DIR"
git submodule update --init --recursive --force || echo "submodule fetch failed; expect offline admin upload"
if [ ! -f public/assets/admin/index.html ]; then
  echo "ERROR: public/assets/admin missing — run scripts/upload-admin.py from workstation" >&2
  exit 1
fi
curl -sS https://getcomposer.org/installer | php8.5
php8.5 composer.phar update --no-dev --optimize-autoloader --no-interaction 2>&1 | tee /root/composer-update.log | tail -30

cat > .env <<EOF
APP_NAME=XBoard
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=http://43.248.77.134:7001
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
chown -R www-data:www-data storage bootstrap/cache
chmod -R 775 storage bootstrap/cache

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
rm -f /etc/nginx/sites-enabled/default
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
systemctl enable supervisor
systemctl start supervisor
supervisorctl reread && supervisorctl update
supervisorctl restart xboard-octane xboard-horizon || supervisorctl start xboard-octane xboard-horizon
sleep 5
curl -sI http://127.0.0.1:7001 | head -5
php8.5 artisan about | head -15
echo DEPLOY_APP_DONE
