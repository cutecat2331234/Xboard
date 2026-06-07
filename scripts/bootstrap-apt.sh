#!/bin/bash
set -e
chmod 1777 /tmp /var/tmp
systemctl stop systemd-resolved 2>/dev/null || true
systemctl disable systemd-resolved 2>/dev/null || true
if [ ! -f /root/dns-forward.py ]; then
  echo "dns-forward.py missing" >&2
  exit 1
fi
pkill -f '/root/dns-forward.py' 2>/dev/null || true
nohup python3 /root/dns-forward.py >/root/dns-forward.log 2>&1 &
sleep 1
rm -f /etc/resolv.conf
printf 'nameserver 127.0.0.1\nnameserver 8.8.8.8\n' > /etc/resolv.conf

grep -q 'mirrors.aliyun.com' /etc/hosts || echo '58.222.35.89 mirrors.aliyun.com' >> /etc/hosts
sed -i '/ppa.launchpadcontent.net/d' /etc/hosts 2>/dev/null || true

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

apt_install() {
  DEBIAN_FRONTEND=noninteractive apt-get install -y --allow-unauthenticated "$@"
}

apt-get -o Acquire::AllowInsecureRepositories=true update -y || true
apt_install ca-certificates openssl apt-transport-https gnupg
update-ca-certificates 2>/dev/null || true
echo BOOTSTRAP_OK
