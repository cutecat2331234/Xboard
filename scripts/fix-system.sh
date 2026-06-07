#!/bin/bash
set -e
echo "=== /dev/null ==="
ls -la /dev/null /dev/zero /dev/random 2>&1 || true
# 修复 /dev/null 权限（若损坏会导致 apt/curl 异常）
if [ ! -c /dev/null ]; then
  rm -f /dev/null
  mknod -m 666 /dev/null c 1 3
fi
chmod 666 /dev/null 2>/dev/null || true

echo "=== resolvectl ==="
resolvectl status 2>&1 | head -20 || true
cat /run/systemd/resolve/stub-resolv.conf 2>/dev/null || echo no-stub
cat /run/systemd/resolve/resolv.conf 2>/dev/null || echo no-run-resolv

echo "=== install unbound local forwarder ==="
apt-get update -y 2>&1 | tail -5 || true
