#!/bin/bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

APP_DIR=/opt/xboard
MYSQL_ROOT_PASS="${MYSQL_ROOT_PASS:-XboardRoot2026!}"
MYSQL_XBOARD_PASS="${MYSQL_XBOARD_PASS:-XboardDb2026!}"
GIT_REPO="${GIT_REPO:-https://github.com/cutecat2331234/Xboard.git}"

echo "=== Backup old docker env if exists ==="
if [ -d /opt/Xboard-master ]; then
  mkdir -p /root/xboard-backup
  cp -a /opt/Xboard-master/.env /root/xboard-backup/docker.env 2>/dev/null || true
fi

echo "=== Base packages ==="
apt-get update -y
apt-get install -y software-properties-common curl git unzip supervisor nginx \
  build-essential pkg-config autoconf libssl-dev libcurl4-openssl-dev \
  libpcre2-dev libnghttp2-dev redis-server

echo "=== PHP 8.5 (ondrej) ==="
add-apt-repository -y ppa:ondrej/php
apt-get update -y
apt-get install -y php8.5-cli php8.5-fpm php8.5-mysql php8.5-redis php8.5-mbstring \
  php8.5-xml php8.5-curl php8.5-zip php8.5-bcmath php8.5-readline php8.5-intl php8.5-gd php8.5-dev

for ini in /etc/php/8.5/cli/php.ini /etc/php/8.5/fpm/php.ini; do
  sed -i 's/disable_functions = .*/disable_functions = /' "$ini" 2>/dev/null || true
done

if ! php8.5 -m | grep -q swoole; then
  printf "\n" | pecl install swoole-6.2.1 || pecl install swoole
  echo "extension=swoole.so" > /etc/php/8.5/mods-available/swoole.ini
  phpenmod -v 8.5 swoole
fi

echo "=== MySQL 8.4/9 from Ubuntu or mysql repo ==="
if ! command -v mysql >/dev/null; then
  apt-get install -y mysql-server || apt-get install -y mariadb-server
fi
systemctl enable --now mysql 2>/dev/null || systemctl enable --now mariadb 2>/dev/null || true

mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${MYSQL_ROOT_PASS}';" 2>/dev/null || true
mysql -uroot -p"${MYSQL_ROOT_PASS}" -e "CREATE DATABASE IF NOT EXISTS xboard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null || \
mysql -e "CREATE DATABASE IF NOT EXISTS xboard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -uroot -p"${MYSQL_ROOT_PASS}" -e "CREATE USER IF NOT EXISTS 'xboard'@'localhost' IDENTIFIED BY '${MYSQL_XBOARD_PASS}'; GRANT ALL ON xboard.* TO 'xboard'@'localhost'; FLUSH PRIVILEGES;" 2>/dev/null || \
mysql -e "CREATE USER IF NOT EXISTS 'xboard'@'localhost' IDENTIFIED BY '${MYSQL_XBOARD_PASS}'; GRANT ALL ON xboard.* TO 'xboard'@'localhost'; FLUSH PRIVILEGES;"

systemctl enable --now redis-server

echo "=== Deploy app ==="
rm -rf "$APP_DIR"
git clone "$GIT_REPO" "$APP_DIR"
cd "$APP_DIR"
git submodule update --init --recursive --force

curl -sS https://getcomposer.org/installer | php8.5
php8.5 composer.phar config --no-plugins allow-plugins.pestphp/pest-plugin true 2>/dev/null || true
php8.5 composer.phar update --no-dev --optimize-autoloader --no-interaction

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
QUEUE_CONNECTION=redis
EOF

php8.5 artisan key:generate --force
php8.5 artisan xboard:install --no-interaction 2>&1 | tee /root/xboard-install.log || \
  php8.5 artisan xboard:install 2>&1 | tee /root/xboard-install.log

chown -R www-data:www-data storage bootstrap/cache
chmod -R 775 storage bootstrap/cache

echo "=== Free port 7001 (stop old Docker stack) ==="
if [ -d /opt/Xboard-master ]; then
  cd /opt/Xboard-master && docker compose down || true
fi

echo "=== Nginx ==="
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

echo "=== Supervisor ==="
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
redis-server --version
php8.5 artisan about | head -20
curl -sI http://127.0.0.1:7001 | head -5
echo "DEPLOY_DONE"
