#!/bin/bash
set -e
chmod 1777 /tmp /var/tmp
pkill -f '/root/dns-forward.py' 2>/dev/null || true
nohup python3 /root/dns-forward.py >/root/dns-forward.log 2>&1 &
sleep 1
sed -i '/ppa.launchpadcontent.net/d' /etc/hosts
sed -i '/launchpad.net/d' /etc/hosts

apt_install() {
  DEBIAN_FRONTEND=noninteractive apt-get install -y --allow-unauthenticated "$@"
}

# 修复 ondrej PPA keyring（损坏的 Signed-By 内联块会导致 Release 拉取失败）
curl -fsSL 'https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x4F4EA0AAE5267A6C' -o /tmp/ondrej.key
gpg --batch --yes --dearmor -o /usr/share/keyrings/ondrej-php.gpg /tmp/ondrej.key
cat > /etc/apt/sources.list.d/ondrej-ubuntu-php-noble.sources <<'EOF'
Types: deb
URIs: https://ppa.launchpadcontent.net/ondrej/php/ubuntu/
Suites: noble
Components: main
Signed-By: /usr/share/keyrings/ondrej-php.gpg
EOF

echo 'Acquire::https::CaInfo "/etc/ssl/certs/ca-certificates.crt";' > /etc/apt/apt.conf.d/99ca-bundle
rm -rf /var/lib/apt/lists/*
apt-get -o Acquire::AllowInsecureRepositories=true -o Acquire::AllowDowngradeToInsecureRepositories=true update -y 2>&1 | tail -15
apt-cache policy php8.5-cli | head -6
apt_install php8.5-cli php8.5-fpm php8.5-mysql php8.5-redis php8.5-mbstring php8.5-xml php8.5-curl php8.5-zip php8.5-bcmath php8.5-readline php8.5-intl php8.5-gd php8.5-dev
php8.5 -v
