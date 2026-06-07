#!/bin/bash
echo "=== xboard-install.log ==="
cat /root/xboard-install.log 2>/dev/null | tail -80
echo
echo "=== secure_path ==="
php8.5 /opt/xboard/scripts/get-secure-path.php 2>/dev/null || php8.5 -r "
require '/opt/xboard/vendor/autoload.php';
\$app = require '/opt/xboard/bootstrap/app.php';
\$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
echo admin_setting('secure_path').PHP_EOL;
"
echo "=== users table (email) ==="
mysql -uroot -pxboard xboard -e "SELECT id,email,created_at FROM v2_user ORDER BY id LIMIT 5;" 2>/dev/null || \
mysql -uroot xboard -e "SELECT id,email,created_at FROM v2_user ORDER BY id LIMIT 5;" 2>/dev/null
