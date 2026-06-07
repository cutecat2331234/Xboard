#!/bin/bash
set -euo pipefail
export PATH="/usr/bin:/bin:$PATH"
LEG=/opt/xboard-legacy
NEW=/opt/xboard

echo "========== 1. USER FRONTEND FILES =========="
diff -rq "${LEG}/public/theme/Xboard/assets" "${NEW}/public/theme/Xboard/assets" || true
echo "--- umi.js ---"
md5sum "${LEG}/public/theme/Xboard/assets/umi.js" "${NEW}/public/theme/Xboard/assets/umi.js"
echo "--- dashboard.blade.php ---"
md5sum "${LEG}/theme/Xboard/dashboard.blade.php" "${NEW}/theme/Xboard/dashboard.blade.php"

echo
echo "========== 2. ADMIN FRONTEND FILES =========="
diff -rq "${LEG}/public/assets/admin" "${NEW}/public/assets/admin" 2>/dev/null | head -30 || echo "(admin diff above if any)"
echo "--- admin manifest ---"
md5sum "${LEG}/public/assets/admin/manifest.json" "${NEW}/public/assets/admin/manifest.json" 2>/dev/null || echo missing

echo
echo "========== 3. NO VUE REWRITE LEFTOVERS ON 7002 =========="
ls "${NEW}/public/theme/Xboard/assets/chunks" 2>/dev/null && echo "WARN: chunks dir exists" || echo "OK: no chunks dir"
grep -c '@vue/shared' "${NEW}/public/theme/Xboard/assets/umi.js" && echo "WARN: vue in umi" || echo "OK: no vue in umi"

echo
echo "========== 4. BACKEND API SMOKE (login) =========="
EMAIL="admin@example.com"
PASS="your-password"
for PORT in 7010 7011; do
  echo "--- octane :${PORT} ---"
  curl -s -X POST "http://127.0.0.1:${PORT}/api/v1/passport/auth/login" \
    -H 'Content-Type: application/json' -H 'Accept: application/json' \
    -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASS}\"}" | head -c 120
  echo
done

echo
echo "========== 5. KEY USER API (after login via 7011) =========="
TOKEN=$(curl -s -X POST "http://127.0.0.1:7011/api/v1/passport/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASS}\"}" | php8.5 -r 'echo json_decode(stream_get_contents(STDIN),true)["data"]["auth_data"]??"";')
for PATH in /api/v1/user/info /api/v1/user/getSubscribe /api/v1/user/plan/fetch; do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: ${TOKEN}" "http://127.0.0.1:7011${PATH}")
  echo "${PATH} -> HTTP ${CODE}"
done

echo
echo "========== 6. NGINX STATIC ROUTES =========="
for P in 7001 7002; do
  echo "--- :${P} umi.js ---"
  curl -sI "http://127.0.0.1:${P}/theme/Xboard/assets/umi.js" | head -3
  echo "--- :${P} admin manifest ---"
  curl -sI "http://127.0.0.1:${P}/assets/admin/manifest.json" | head -3
done

echo
echo "========== 7. MARKERS =========="
cat "${LEG}/storage/frontend-variant/mode" 2>/dev/null; echo "(7001)"
cat "${NEW}/storage/frontend-variant/mode" 2>/dev/null; echo "(7002)"
AUDIT_DONE
