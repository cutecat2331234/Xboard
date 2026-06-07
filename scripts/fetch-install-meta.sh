#!/bin/bash
cd /opt/xboard
echo "=== secure_path ==="
php8.5 artisan tinker --execute='echo admin_setting("secure_path");'
echo
echo "=== admin email (install log) ==="
grep -E '管理员|admin@|email' /root/xboard-install.log 2>/dev/null | tail -5
echo "=== umi sizes ==="
wc -c /opt/xboard-legacy/public/theme/Xboard/assets/umi.js /opt/xboard/public/theme/Xboard/assets/umi.js
