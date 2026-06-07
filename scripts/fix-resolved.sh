#!/bin/bash
set -e
journalctl -u systemd-resolved -n 30 --no-pager 2>&1 || true
echo '---'
systemctl reset-failed systemd-resolved 2>/dev/null || true
ln -sf /run/systemd/resolve/stub-resolv.conf /etc/resolv.conf
systemctl enable systemd-resolved
systemctl start systemd-resolved
sleep 2
systemctl is-active systemd-resolved
cat /etc/resolv.conf
resolvectl query mirrors.aliyun.com 2>&1 | head -5
apt-get update -y 2>&1 | tail -8
