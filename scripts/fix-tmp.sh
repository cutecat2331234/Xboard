#!/bin/bash
set -e
chmod 1777 /tmp
chmod 1777 /var/tmp
ls -lad /tmp /var/tmp
# 确保 DNS 转发在跑
pgrep -f dns-forward.py >/dev/null || nohup python3 /root/dns-forward.py >/root/dns-forward.log 2>&1 &
sleep 1
apt-get update -y 2>&1 | tail -8
DEBIAN_FRONTEND=noninteractive apt-get install -y supervisor 2>&1 | tail -5
