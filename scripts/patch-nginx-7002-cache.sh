#!/bin/bash
# Disable aggressive caching for new-frontend compare port
CONF=/etc/nginx/sites-available/xboard-dual
if ! grep -q 'umi.js' "$CONF" 2>/dev/null; then
  sed -i '/listen 7002;/,/location \/ {/ {
    /location \/ {/i\
    location ~* ^/theme/.*/assets/(umi\\.js|chunks/|assets/) {\
        add_header Cache-Control "no-cache, must-revalidate";\
        try_files $uri =404;\
    }
  }' "$CONF"
  nginx -t && systemctl reload nginx
fi
echo NGINX_CACHE_PATCHED
