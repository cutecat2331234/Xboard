#!/bin/bash
EMAIL="admin@example.com"
PASS="your-password"
curl -s -X POST "http://127.0.0.1:7011/api/v1/passport/auth/login" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASS}\"}" | head -c 500
echo
