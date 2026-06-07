#!/bin/bash
set -euo pipefail
echo "=== supervisor ==="
supervisorctl status | grep -E 'xboard|octane' || true
echo "=== ports ==="
ss -tlnp | grep -E ':7001|:7002|:7010|:7011' || true
echo "=== curl local ==="
curl -sI -m 5 http://127.0.0.1:7001/ | head -3
curl -sI -m 5 http://127.0.0.1:7002/ | head -3
echo "=== umi assets ==="
ls -la /opt/xboard/public/theme/Xboard/assets/umi.js /opt/xboard-legacy/public/theme/Xboard/assets/umi.js 2>/dev/null || true
echo "=== nginx test ==="
nginx -t 2>&1 | tail -2
echo "=== recent octane errors ==="
tail -20 /var/log/supervisor/xboard-octane-new-stderr*.log 2>/dev/null || tail -20 /var/log/supervisor/*octane* 2>/dev/null || true
