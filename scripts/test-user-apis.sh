#!/bin/bash
export PATH="/usr/bin:/bin:$PATH"
EMAIL="admin@xboard.local"
PASS="Xboard@2026"
for LABEL in 7010-legacy 7011-new; do
  PORT="${LABEL%%-*}"
  PORT="${PORT/7010/7010}"
  if [[ "$LABEL" == 7010-* ]]; then PORT=7010; else PORT=7011; fi
  echo "=== ${LABEL} (:${PORT}) ==="
  RESP=$(curl -s -X POST "http://127.0.0.1:${PORT}/api/v1/passport/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASS}\"}")
  TOKEN=$(echo "$RESP" | php8.5 -r '$j=json_decode(stream_get_contents(STDIN),true); echo $j["data"]["auth_data"]??"";')
  echo "login: $(echo "$RESP" | php8.5 -r '$j=json_decode(stream_get_contents(STDIN),true); echo $j["status"]??"fail";')"
  for API in /api/v1/user/info /api/v1/user/getSubscribe /api/v1/user/plan/fetch /api/v1/user/notice/fetch; do
    CODE=$(curl -s -o /tmp/api.json -w '%{http_code}' -H "Authorization: ${TOKEN}" "http://127.0.0.1:${PORT}${API}")
    ST=$(php8.5 -r '$j=@json_decode(file_get_contents("/tmp/api.json"),true); echo $j["status"]??"-";' 2>/dev/null)
    echo "  ${API} -> HTTP ${CODE} status=${ST}"
  done
done
