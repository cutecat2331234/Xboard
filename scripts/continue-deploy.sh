#!/bin/bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

chmod 755 /etc
chmod 1777 /tmp /var/tmp
pkill -f '/root/dns-forward.py' 2>/dev/null || true
nohup python3 /root/dns-forward.py >/root/dns-forward.log 2>&1 &
sleep 1

apt_install() {
  DEBIAN_FRONTEND=noninteractive apt-get install -y --allow-unauthenticated "$@"
}

# Swoole
if ! php8.5 -m 2>/dev/null | grep -q swoole; then
  apt_install libbrotli-dev libzstd-dev zlib1g-dev libc-ares-dev
  yes '' | pecl install swoole-6.2.1
  echo "extension=swoole.so" > /etc/php/8.5/mods-available/swoole.ini
  phpenmod -v 8.5 swoole
fi
php8.5 -m | grep swoole

# MySQL
if ! command -v mysql >/dev/null; then
  apt_install mysql-server || apt_install mariadb-server
fi
systemctl enable --now mysql 2>/dev/null || systemctl enable --now mariadb 2>/dev/null || true

MYSQL_ROOT_PASS="${MYSQL_ROOT_PASS:-XboardRoot2026!}"
MYSQL_XBOARD_PASS="${MYSQL_XBOARD_PASS:-XboardDb2026!}"
mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${MYSQL_ROOT_PASS}';" 2>/dev/null || true
mysql -uroot -p"${MYSQL_ROOT_PASS}" -e "CREATE DATABASE IF NOT EXISTS xboard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null || \
  mysql -e "CREATE DATABASE IF NOT EXISTS xboard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -uroot -p"${MYSQL_ROOT_PASS}" -e "CREATE USER IF NOT EXISTS 'xboard'@'localhost' IDENTIFIED BY '${MYSQL_XBOARD_PASS}'; GRANT ALL ON xboard.* TO 'xboard'@'localhost'; FLUSH PRIVILEGES;" 2>/dev/null || \
  mysql -e "CREATE USER IF NOT EXISTS 'xboard'@'localhost' IDENTIFIED BY '${MYSQL_XBOARD_PASS}'; GRANT ALL ON xboard.* TO 'xboard'@'localhost'; FLUSH PRIVILEGES;"

systemctl enable --now redis-server 2>/dev/null || apt_install redis-server

APP_DIR=/opt/xboard
GIT_REPO="${GIT_REPO:-https://github.com/cutecat2331234/Xboard.git}"
if [ ! -d "$APP_DIR/.git" ]; then
  rm -rf "$APP_DIR"
  git clone "$GIT_REPO" "$APP_DIR"
fi
cd "$APP_DIR"
git pull origin master
git submodule update --init --recursive --force

if [ ! -f composer.phar ]; then
  curl -sS https://getcomposer.org/installer | php8.5
fi
php8.5 composer.phar update --no-dev --optimize-autoloader --no-interaction 2>&1 | tail -20

if [ ! -f .env ] || ! grep -q APP_KEY=base64 .env 2>/dev/null; then
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
  php8.5 artisan xboard:install --no-interaction 2>&1 | tee /root/xboard-install.log || true
fi

chown -R www-data:www-data storage bootstrap/cache
chmod -R 775 storage bootstrap/cache

if [ -d /opt/Xboard-master ]; then
  cd /opt/Xboard-master && docker compose down 2>/dev/null || true
fi

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
supervisorctl reread
supervisorctl update
supervisorctl restart xboard-octane xboard-horizon || supervisorctl start xboard-octane xboard-horizon

( crontab -u www-data -l 2>/dev/null | grep -v schedule:run; echo "* * * * * cd /opt/xboard && /usr/bin/php8.5 artisan schedule:run >> /dev/null 2>&1" ) | crontab -u www-data -

php8.5 -v
mysql --version
php8.5 artisan about | head -15
curl -sI http://127.0.0.1:7001 | head -5
echo CONTINUE_DEPLOY_DONE
