#!/bin/bash
export PATH="/usr/bin:/bin:$PATH"
LEG=/opt/xboard-legacy
NEW=/opt/xboard

echo "========== ADMIN ASSET TREE DIFF =========="
diff -rq "${LEG}/public/assets/admin" "${NEW}/public/assets/admin" 2>&1 | head -40
if [ $? -eq 0 ]; then echo "ADMIN_ASSETS_IDENTICAL"; fi

echo
echo "========== KEY FILE MD5 =========="
for f in manifest.json \
  assets/index-BdbgNvrf.js \
  assets/index-CYqGixs-.css \
  locales/zh-CN.js \
  locales/en-US.js; do
  echo -n "$f: "
  md5sum "${LEG}/public/assets/admin/$f" "${NEW}/public/assets/admin/$f" 2>/dev/null
done

echo
echo "========== admin.blade.php =========="
md5sum "${LEG}/resources/views/admin.blade.php" "${NEW}/resources/views/admin.blade.php" 2>/dev/null || \
  md5sum /opt/xboard/resources/views/admin.blade.php

echo
echo "========== SECURE PATH =========="
php8.5 -r "
require '/opt/xboard/vendor/autoload.php';
\$a=require '/opt/xboard/bootstrap/app.php';
\$a->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
echo admin_setting('secure_path').PHP_EOL;
"

SECURE=$(php8.5 -r "require '/opt/xboard/vendor/autoload.php';\$a=require '/opt/xboard/bootstrap/app.php';\$a->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();echo admin_setting('secure_path');")

echo
echo "========== ADMIN HTML (7001 vs 7002) =========="
diff <(curl -s "http://127.0.0.1:7001/${SECURE}" | tr -d '\r') \
     <(curl -s "http://127.0.0.1:7002/${SECURE}" | tr -d '\r') \
  && echo "ADMIN_HTML_IDENTICAL" || echo "ADMIN_HTML_DIFFERS"

echo
echo "========== ADMIN STATIC HTTP =========="
for P in 7001 7002; do
  echo "--- :$P ---"
  curl -sI "http://127.0.0.1:${P}/assets/admin/manifest.json" | head -2
  curl -sI "http://127.0.0.1:${P}/assets/admin/assets/index-BdbgNvrf.js" | head -2
  curl -sI "http://127.0.0.1:${P}/assets/admin/assets/index-CYqGixs-.css" | head -2
done

echo
echo "========== VUE REWRITE ADMIN CHECK =========="
ls "${NEW}/public/assets/admin/assets/index-C1RqCHk3.js" 2>/dev/null && echo "WARN: react rewrite js present" || echo "OK: no react rewrite bundle"
ls "${NEW}/public/assets/admin/.vite" 2>/dev/null && echo "WARN: vite dir" || echo "OK: no .vite dir"

ADMIN_AUDIT_DONE
