#!/bin/bash
set -e
rm -f /etc/resolv.conf
printf 'nameserver 127.0.0.1\nnameserver 8.8.8.8\n' > /etc/resolv.conf
pkill -f '/root/dns-forward.py' 2>/dev/null || true
nohup python3 /root/dns-forward.py >/root/dns-forward.log 2>&1 &
sleep 1
ss -lunp | grep ':53 '
host mirrors.aliyun.com 127.0.0.1
# restore aliyun mirror hostname sources
cat > /etc/apt/sources.list.d/ubuntu.sources <<'EOF'
Types: deb
URIs: http://mirrors.aliyun.com/ubuntu/
Suites: noble noble-updates noble-backports
Components: main restricted universe multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg

Types: deb
URIs: http://mirrors.aliyun.com/ubuntu/
Suites: noble-security
Components: main restricted universe multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg
EOF
apt-get update -y 2>&1 | tail -10
