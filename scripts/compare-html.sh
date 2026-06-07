#!/bin/bash
export PATH="/usr/bin:/bin:$PATH"
diff <(curl -s http://127.0.0.1:7001/ | tr -d '\r') <(curl -s http://127.0.0.1:7002/ | tr -d '\r') && echo "HTML_IDENTICAL" || echo "HTML_DIFFERS"
echo "--- 7002 admin page head ---"
SECURE=$(php8.5 -r "require '/opt/xboard/vendor/autoload.php'; \$a=require '/opt/xboard/bootstrap/app.php'; \$a->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap(); echo admin_setting('secure_path')?:hash('crc32b',config('app.key'));")
curl -sI "http://127.0.0.1:7002/${SECURE}" | head -5
curl -s "http://127.0.0.1:7002/${SECURE}" | grep -E 'admin/assets|manifest' | head -5
