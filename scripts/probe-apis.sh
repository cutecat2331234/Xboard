#!/bin/bash
set -euo pipefail
EMAIL="admin@xboard.local"
PASS="Xboard@2026"
SP="d7f5c92b"
RESP=$(curl -s -X POST "http://127.0.0.1:7011/api/v1/passport/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASS}\"}")
TOKEN=$(echo "$RESP" | php8.5 -r '$j=json_decode(stream_get_contents(STDIN),true); echo $j["data"]["auth_data"]??"";')
echo "=== plan/fetch ==="
curl -s -H "Authorization: ${TOKEN}" "http://127.0.0.1:7011/api/v1/user/plan/fetch" | head -c 600
echo
echo "=== notice/fetch ==="
curl -s -H "Authorization: ${TOKEN}" "http://127.0.0.1:7011/api/v1/user/notice/fetch" | head -c 600
echo
echo "=== admin user/fetch ==="
curl -s -H "Authorization: ${TOKEN}" "http://127.0.0.1:7011/api/v2/${SP}/user/fetch" | head -c 600
echo
echo "=== umi.css ==="
curl -sI "http://127.0.0.1:7002/theme/Xboard/assets/umi.css" | head -3
