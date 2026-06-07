#!/bin/bash
echo "=== Docker ==="
docker ps --format '{{.Names}}' 2>/dev/null | head -5 || echo none
echo "=== Supervisor ==="
supervisorctl status
echo "=== Stack ==="
cd /opt/xboard && php8.5 artisan about | head -8
echo "=== HTTP local ==="
curl -sI --max-time 8 http://127.0.0.1:7001 | head -5
echo "=== HTTP public ==="
curl -sI --max-time 8 http://43.248.77.134:7001 | head -5
