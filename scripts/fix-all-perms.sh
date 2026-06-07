#!/bin/bash
set -e
# 曾被误设为 666 的系统目录会导致 .so/mysql/apt 全面 Permission denied
for d in /etc /usr /usr/lib /usr/lib/x86_64-linux-gnu /var/lib /var/cache /bin /sbin /lib /lib64 /run; do
  [ -d "$d" ] && chmod 755 "$d"
done
chmod 1777 /tmp /var/tmp
chmod 755 /usr/bin /usr/sbin /usr/lib/mysql /usr/lib/mysql/plugin 2>/dev/null || true
ls -lad /etc /usr /usr/lib /tmp
namei -l /usr/lib/mysql/plugin/component_reference_cache.so | tail -3
