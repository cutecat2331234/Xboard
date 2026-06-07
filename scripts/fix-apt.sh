#!/bin/bash
set -e
# systemd-resolved failed → stub 127.0.0.53 会导致 apt 无法解析
systemctl stop systemd-resolved 2>/dev/null || true
systemctl disable systemd-resolved 2>/dev/null || true
rm -f /etc/resolv.conf
printf 'nameserver 8.8.8.8\nnameserver 1.1.1.1\nnameserver 223.5.5.5\n' > /etc/resolv.conf
chmod 644 /etc/resolv.conf
echo 'Acquire::ForceIPv4 "true";' > /etc/apt/apt.conf.d/99force-ipv4
rm -f /etc/apt/sources.list.d/docker*.list /etc/apt/sources.list.d/nodesource*.list /etc/apt/sources.list.d/openresty*.list 2>/dev/null || true
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
echo "" > /etc/apt/sources.list
apt-get clean
apt-get update -y
apt-cache policy supervisor | head -3
