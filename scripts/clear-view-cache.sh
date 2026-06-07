#!/bin/bash
cd /opt/xboard && php8.5 artisan view:clear
cd /opt/xboard-legacy && php8.5 artisan view:clear 2>/dev/null || true
grep -E 'umi.js' /opt/xboard/theme/Xboard/dashboard.blade.php | head -1
curl -s http://127.0.0.1:7002/ | grep umi.js | head -1
