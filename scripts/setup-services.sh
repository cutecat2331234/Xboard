#!/bin/bash
set -e
for d in /etc /usr /usr/lib /run; do [ -d "$d" ] && chmod 755 "$d"; done
cd /opt/xboard
chown -R www-data:www-data storage bootstrap/cache
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
systemctl enable supervisor && systemctl start supervisor
supervisorctl reread && supervisorctl update
supervisorctl restart xboard-octane xboard-horizon || supervisorctl start xboard-octane xboard-horizon
sleep 5
curl -sI http://127.0.0.1:7001 | head -5
cd /opt/xboard && php8.5 artisan about | head -12
cd /opt/xboard && php8.5 artisan horizon:status
echo SERVICES_OK
