#!/bin/bash
# Run on server when DNS + firewall are ready: sudo DOMAIN=panel.example.com bash finish-domain-ssl.sh
set -euo pipefail
DOMAIN="${DOMAIN:-panel.example.com}"
APP_DIR=/opt/xboard
CERT_EMAIL="${CERT_EMAIL:-admin@${DOMAIN}}"

cd "$APP_DIR"
sed -i "s|^APP_URL=.*|APP_URL=https://${DOMAIN}|" .env
php8.5 artisan config:clear

supervisorctl restart xboard-octane xboard-horizon || supervisorctl start xboard-octane xboard-horizon
nginx -t && systemctl reload nginx

certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos -m "${CERT_EMAIL}" --redirect
systemctl reload nginx

SECURE=$(php8.5 -r "require '${APP_DIR}/vendor/autoload.php'; \$a=require '${APP_DIR}/bootstrap/app.php'; \$a->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap(); echo admin_setting('secure_path')?:hash('crc32b',config('app.key'));")
echo "Site: https://${DOMAIN}"
echo "Admin: https://${DOMAIN}/${SECURE}"
curl -sI "https://${DOMAIN}/" | head -5
