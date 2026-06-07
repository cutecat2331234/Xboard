#!/bin/bash
set -e
supervisorctl stop xboard-octane xboard-horizon 2>/dev/null || true
pkill -f 'artisan octane' 2>/dev/null || true
sleep 3
cd /opt/xboard
php8.5 artisan octane:stop 2>/dev/null || true
sleep 2
supervisorctl start xboard-octane
supervisorctl start xboard-horizon
sleep 10
curl -sI --max-time 10 http://127.0.0.1:7010 | head -6 || echo direct_fail
curl -sI --max-time 10 http://127.0.0.1:7001 | head -6 || echo proxy_fail
supervisorctl status
