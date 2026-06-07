#!/bin/bash
# 7002 恢复为与 7001 完全一致的原版闭源 dist（非 Vue 仿写）
set -euo pipefail

LEGACY=/opt/xboard-legacy
NEW=/opt/xboard
SRC_USER="${LEGACY}/public/theme/Xboard"
SRC_ADMIN="${LEGACY}/public/assets/admin"
DST_USER="${NEW}/public/theme/Xboard"
DST_ADMIN="${NEW}/public/assets/admin"

echo "=== Restore original user theme (umi.js dist) ==="
rm -rf "${NEW}/public/theme/Xboard/assets"
mkdir -p "${DST_USER}/assets"
cp -a "${SRC_USER}/assets/." "${DST_USER}/assets/"
cp -a "${LEGACY}/theme/Xboard/dashboard.blade.php" "${NEW}/theme/Xboard/dashboard.blade.php"
cp -a "${LEGACY}/theme/Xboard/dashboard.blade.php" "${DST_USER}/dashboard.blade.php" 2>/dev/null || true

echo "=== Restore original admin dist ==="
rm -rf "${NEW}/public/assets/admin"
mkdir -p "${DST_ADMIN}"
if [ -d "${SRC_ADMIN}" ]; then
  cp -a "${SRC_ADMIN}/." "${DST_ADMIN}/"
fi

echo "=== Marker ==="
echo original-dist > "${NEW}/storage/frontend-variant/mode"

chown -R www-data:www-data "${NEW}/public/theme" "${NEW}/public/assets/admin" "${NEW}/theme/Xboard"
chmod -R a+rX "${NEW}/public/theme/Xboard/assets"

echo "=== Verify MD5 (should match legacy) ==="
md5sum "${LEGACY}/public/theme/Xboard/assets/umi.js" "${NEW}/public/theme/Xboard/assets/umi.js"
ls -la "${NEW}/public/theme/Xboard/assets/"
echo RESTORE_ORIGINAL_OK
