#!/bin/bash
echo "=== umi.js hash & size ==="
md5sum /opt/xboard-legacy/public/theme/Xboard/assets/umi.js /opt/xboard/public/theme/Xboard/assets/umi.js
wc -c /opt/xboard-legacy/public/theme/Xboard/assets/umi.js /opt/xboard/public/theme/Xboard/assets/umi.js
echo
echo "=== legacy marker ==="
cat /opt/xboard-legacy/storage/frontend-variant/mode 2>/dev/null
head -c 200 /opt/xboard-legacy/public/theme/Xboard/assets/umi.js | tr '\n' ' '
echo
echo
echo "=== new marker ==="
cat /opt/xboard/storage/frontend-variant/mode 2>/dev/null
head -c 200 /opt/xboard/public/theme/Xboard/assets/umi.js | tr '\n' ' '
echo
echo
echo "=== legacy has Vue3 build chunks? ==="
ls /opt/xboard-legacy/public/theme/Xboard/assets/chunks/LoginPage-UOKV1fHz.js 2>/dev/null && echo YES_NEW_CHUNK || echo NO
echo "=== new has old auth chunk? ==="
ls /opt/xboard/public/theme/Xboard/assets/chunks/auth-DLYIHWhU.js 2>/dev/null && echo YES_LEGACY_CHUNK || echo NO
echo
echo "=== HTML script tags ==="
curl -s http://127.0.0.1:7001/ | grep -E 'umi|style-' | head -5
curl -s http://127.0.0.1:7002/ | grep -E 'umi|style-' | head -5
