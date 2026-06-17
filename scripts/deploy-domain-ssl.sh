#!/bin/bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

DOMAIN="${DOMAIN:-panel.example.com}"
APP_DIR=/opt/xboard
MYSQL_ROOT_PASS="${MYSQL_ROOT_PASS:-change-me-root}"
MYSQL_XBOARD_PASS="${MYSQL_XBOARD_PASS:-change-me-db}"
ADMIN_ACCOUNT="${ADMIN_ACCOUNT:-admin@example.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-change-me-admin}"
GIT_REPO="${GIT_REPO:-https://github.com/cutecat2331234/Xboard.git}"
CERT_EMAIL="${CERT_EMAIL:-admin@${DOMAIN}}"

echo "=== Deploy Xboard on ${DOMAIN} ==="

echo "=== Fix DNS if systemd-resolved broken ==="
systemctl stop systemd-resolved 2>/dev/null || true
systemctl disable systemd-resolved 2>/dev/null || true
if [ ! -f /etc/resolv.conf ] || grep -q '127.0.0.53' /etc/resolv.conf 2>/dev/null; then
  rm -f /etc/resolv.conf
  printf 'nameserver 8.8.8.8\nnameserver 1.1.1.1\n' > /etc/resolv.conf
  chmod 644 /etc/resolv.conf
fi

echo "=== Base packages ==="
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl git unzip supervisor nginx redis-server \
  build-essential pkg-config autoconf libssl-dev libcurl4-openssl-dev \
  libpcre2-dev libnghttp2-dev software-properties-common certbot python3-certbot-nginx

echo "=== PHP 8.5 (ondrej) ==="
if [ ! -f /usr/share/keyrings/ondrej-php.gpg ]; then
  curl -fsSL 'https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x4F4EA0AAE5267A6C' -o /tmp/ondrej.key
  gpg --batch --yes --dearmor -o /usr/share/keyrings/ondrej-php.gpg /tmp/ondrej.key
fi
CODENAME=$(. /etc/os-release && echo "${VERSION_CODENAME:-jammy}")
cat > /etc/apt/sources.list.d/ondrej-ubuntu-php.sources <<PPA
Types: deb
URIs: https://ppa.launchpadcontent.net/ondrej/php/ubuntu/
Suites: ${CODENAME}
Components: main
Signed-By: /usr/share/keyrings/ondrej-php.gpg
PPA
apt-get update -y
apt-get install -y php8.5-cli php8.5-fpm php8.5-mysql php8.5-redis php8.5-mbstring \
  php8.5-xml php8.5-curl php8.5-zip php8.5-bcmath php8.5-readline php8.5-intl php8.5-gd php8.5-gmp php8.5-dev

for ini in /etc/php/8.5/cli/php.ini /etc/php/8.5/fpm/php.ini; do
  sed -i 's/disable_functions = .*/disable_functions = /' "$ini" 2>/dev/null || true
done

if ! php8.5 -m | grep -q swoole; then
  apt-get install -y libbrotli-dev libzstd-dev libc-ares-dev 2>/dev/null || true
  if [ ! -f /usr/lib/php/20250925/swoole.so ]; then
    yes '' | pecl install swoole-6.2.1 || yes '' | pecl install swoole || true
  fi
  echo "extension=swoole.so" > /etc/php/8.5/mods-available/swoole.ini
  phpenmod -v 8.5 swoole
fi
php8.5 -m | grep -q swoole || { echo "Swoole extension missing"; exit 1; }

echo "=== MySQL ==="
if ! command -v mysql >/dev/null; then
  apt-get install -y mysql-server
fi
systemctl enable --now mysql 2>/dev/null || true
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
php8.5 composer.phar install --no-dev --optimize-autoloader --no-interaction

cat > .env <<EOF
APP_NAME=XBoard
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=https://${DOMAIN}

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
SESSION_DRIVER=redis
EOF

php8.5 artisan key:generate --force
export ADMIN_ACCOUNT
php8.5 artisan xboard:install --no-interaction 2>&1 | tee /root/xboard-install.log

ADMIN_PASS=$(grep -oP '管理员密码：\K\S+' /root/xboard-install.log | tail -1 || true)
sed -i "s|^APP_URL=.*|APP_URL=https://${DOMAIN}|" .env
php8.5 artisan config:clear

chown -R www-data:www-data storage bootstrap/cache public
chmod -R 775 storage bootstrap/cache

echo "=== Nginx (HTTP first) ==="
cat > /etc/nginx/sites-available/xboard <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    root ${APP_DIR}/public;
    index index.php;

    client_max_body_size 50m;

    location ~* \.(jpg|jpeg|png|gif|js|css|svg|woff2|woff|ttf|eot|wasm|json|ico|br|gz)$ {
        try_files \$uri =404;
        expires 1h;
        access_log off;
    }

    location / {
        proxy_pass http://127.0.0.1:7010;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX
ln -sf /etc/nginx/sites-available/xboard /etc/nginx/sites-enabled/xboard
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl restart nginx

echo "=== Supervisor ==="
cat > /etc/supervisor/conf.d/xboard.conf <<SUP
[program:xboard-octane]
command=/usr/bin/php8.5 ${APP_DIR}/artisan octane:start --server=swoole --host=127.0.0.1 --port=7010
directory=${APP_DIR}
user=www-data
autostart=true
autorestart=true
stdout_logfile=/var/log/xboard-octane.log
stderr_logfile=/var/log/xboard-octane.err.log

[program:xboard-horizon]
command=/usr/bin/php8.5 ${APP_DIR}/artisan horizon
directory=${APP_DIR}
user=www-data
autostart=true
autorestart=true
stdout_logfile=/var/log/xboard-horizon.log
stderr_logfile=/var/log/xboard-horizon.err.log
SUP
supervisorctl reread
supervisorctl update
supervisorctl restart xboard-octane xboard-horizon || supervisorctl start xboard-octane xboard-horizon

( crontab -u www-data -l 2>/dev/null | grep -v schedule:run; echo "* * * * * cd ${APP_DIR} && /usr/bin/php8.5 artisan schedule:run >> /dev/null 2>&1" ) | crontab -u www-data -

sleep 5
curl -sI http://127.0.0.1/ | head -5 || true

echo "=== Let's Encrypt SSL ==="
certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos -m "${CERT_EMAIL}" --redirect 2>&1 | tee /root/certbot.log || {
  echo "CERTBOT_FAILED - check DNS points ${DOMAIN} to this server (disable CF proxy if needed)"
  exit 1
}

systemctl reload nginx
curl -sI https://127.0.0.1/ -k --resolve "${DOMAIN}:443:127.0.0.1" | head -5 || true

SECURE=$(php8.5 -r "require '${APP_DIR}/vendor/autoload.php'; \$a=require '${APP_DIR}/bootstrap/app.php'; \$a->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap(); echo admin_setting('secure_path')?:hash('crc32b',config('app.key'));")
cat > /root/xboard-credentials.txt <<CREDS
Domain: https://${DOMAIN}
Admin URL: https://${DOMAIN}/${SECURE}
Admin email: ${ADMIN_ACCOUNT}
Admin password: ${ADMIN_PASS:-see /root/xboard-install.log}
MySQL root: ${MYSQL_ROOT_PASS}
MySQL xboard: ${MYSQL_XBOARD_PASS}
CREDS
chmod 600 /root/xboard-credentials.txt

echo "=== DEPLOY DONE ==="
cat /root/xboard-credentials.txt
