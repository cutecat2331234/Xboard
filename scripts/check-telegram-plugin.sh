#!/bin/bash
echo "=== plugins dir ==="
ls -la /opt/xboard/plugins/ 2>/dev/null || echo "no plugins dir"
echo "=== TelegramLogin ==="
ls -la /opt/xboard/plugins/TelegramLogin/ 2>/dev/null || echo "TelegramLogin not installed"
echo "=== guest config telegram fields ==="
curl -s http://127.0.0.1:7002/api/v1/guest/comm/config | python3 -c "
import sys,json
d=json.load(sys.stdin).get('data',{})
for k in sorted(d):
    if 'telegram' in k.lower():
        print(k, '=', d[k])
"
