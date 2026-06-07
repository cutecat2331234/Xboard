#!/bin/bash
fuser -k 7010/tcp 7011/tcp 2>/dev/null || true
sleep 2
chown -R www-data:www-data /opt/xboard/public /opt/xboard-legacy/public /opt/xboard/storage /opt/xboard-legacy/storage
supervisorctl start xboard-octane-legacy xboard-octane-new
sleep 10
supervisorctl status
curl -sI --max-time 10 http://127.0.0.1:7001 | head -4
curl -sI --max-time 10 http://127.0.0.1:7002 | head -4
curl -s --max-time 10 http://127.0.0.1:7001 | head -c 200
echo
curl -s --max-time 10 http://127.0.0.1:7002 | head -c 200
echo
