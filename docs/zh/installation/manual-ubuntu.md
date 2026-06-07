# Xboard 原生部署（Ubuntu 24.04 + PHP 8.5 + MySQL 9.7）

版本以 [STACK-VERSIONS.md](../../STACK-VERSIONS.md) 为准。

## 1. 运行时

```bash
# PHP 8.5 + 扩展（ondrej PPA）
add-apt-repository ppa:ondrej/php -y && apt update
apt install -y php8.5-cli php8.5-fpm php8.5-mysql php8.5-redis php8.5-mbstring \
  php8.5-xml php8.5-curl php8.5-zip php8.5-bcmath php8.5-readline php8.5-intl
pecl install swoole-6.2.1
echo 'extension=swoole.so' > /etc/php/8.5/mods-available/swoole.ini
phpenmod swoole
```

在 `php.ini` 中从 `disable_functions` 移除：`putenv`, `proc_open`, `pcntl_alarm`, `pcntl_signal`。

## 2. MySQL 9.7

按 https://dev.mysql.com/doc/mysql/en/linux-installation.html 安装 MySQL 9.7 LTS。

```sql
CREATE DATABASE xboard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'xboard'@'localhost' IDENTIFIED BY 'STRONG_PASSWORD';
GRANT ALL ON xboard.* TO 'xboard'@'localhost';
```

## 3. Redis 8.8

```bash
apt install -y redis-server
# 或从 https://github.com/redis/redis/releases 编译 8.8.0
```

## 4. 应用

```bash
mkdir -p /opt/xboard && cd /opt/xboard
git clone https://github.com/cutecat2331234/Xboard.git .
git submodule update --init --recursive --force
curl -sS https://getcomposer.org/installer | php8.5
php8.5 composer.phar install --no-dev --optimize-autoloader
cp .env.example .env   # 编辑 DB/Redis
touch .env             # 若交互安装可先空文件
php8.5 artisan xboard:install
chown -R www-data:www-data storage bootstrap/cache
```

## 5. Nginx（7001 → Octane 7010）

```nginx
server {
    listen 7001;
    server_name _;
    root /opt/xboard/public;
    index index.php;

    location ~* \.(jpg|jpeg|png|gif|js|css|svg|woff2|woff|ttf|eot|wasm|json|ico)$ {
        try_files $uri =404;
        expires 1h;
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
```

## 6. Supervisor

`/etc/supervisor/conf.d/xboard.conf`:

```ini
[program:xboard-octane]
command=/usr/bin/php8.5 /opt/xboard/artisan octane:start --host=127.0.0.1 --port=7010
directory=/opt/xboard
user=www-data
autostart=true
autorestart=true
stdout_logfile=/var/log/xboard-octane.log

[program:xboard-horizon]
command=/usr/bin/php8.5 /opt/xboard/artisan horizon
directory=/opt/xboard
user=www-data
autostart=true
autorestart=true
stdout_logfile=/var/log/xboard-horizon.log
```

```bash
supervisorctl reread && supervisorctl update
```

Crontab（www-data）: `* * * * * php /opt/xboard/artisan schedule:run`

## 7. 下线旧 Docker

```bash
cd /opt/Xboard-master && docker compose down
```
