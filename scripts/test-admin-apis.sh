#!/bin/bash
export PATH="/usr/bin:/bin:$PATH"
EMAIL="admin@example.com"
PASS="your-password"
for PORT in 7010 7011; do
  echo "=== admin API :${PORT} ==="
  RESP=$(curl -s -X POST "http://127.0.0.1:${PORT}/api/v1/passport/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASS}\"}")
  TOKEN=$(echo "$RESP" | php8.5 -r '$j=json_decode(stream_get_contents(STDIN),true); echo $j["data"]["auth_data"]??"";')
  IS_ADMIN=$(echo "$RESP" | php8.5 -r '$j=json_decode(stream_get_contents(STDIN),true); echo $j["data"]["is_admin"]?"yes":"no";')
  echo "is_admin=${IS_ADMIN}"
  for API in /api/v2/admin/stat/getOverride /api/v2/admin/config/fetch; do
    CODE=$(curl -s -o /tmp/adm.json -w '%{http_code}' -H "Authorization: ${TOKEN}" "http://127.0.0.1:${PORT}${API}")
    ST=$(php8.5 -r '$j=@json_decode(file_get_contents("/tmp/adm.json"),true); echo $j["status"]??$j["message"]??"-";' 2>/dev/null | head -c 40)
    echo "  ${API} -> HTTP ${CODE} (${ST})"
  done
done
