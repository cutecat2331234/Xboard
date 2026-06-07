#!/bin/bash
set -e
# apt 走 127.0.0.1:53（stub/本地转发），而 getent 走 resolv.conf
ss -lunp | grep ':53 ' || true
ss -ltnp | grep ':53 ' || true
grep -E '^hosts:' /etc/nsswitch.conf
cat /etc/gai.conf 2>/dev/null | grep -v '^#' | grep -v '^$' || true

# 停掉占用 127.0.0.1:53 的服务
for svc in systemd-resolved dnsmasq named bind9 docker; do
  systemctl stop "$svc" 2>/dev/null || true
done

# 若仍有本地 53 端口，用 resolvconf 风格覆盖
if ss -lunp 2>/dev/null | grep -q '127.0.0.1:53'; then
  fuser -k 53/udp 2>/dev/null || true
  sleep 1
fi

systemctl disable systemd-resolved 2>/dev/null || true
rm -f /etc/resolv.conf
printf 'nameserver 8.8.8.8\nnameserver 1.1.1.1\n' > /etc/resolv.conf

# /etc/hosts 兜底（apt 用 getaddrinfo 时 files 优先）
grep -q 'mirrors.aliyun.com' /etc/hosts || \
  echo '58.222.35.89 mirrors.aliyun.com' >> /etc/hosts
grep -q 'ppa.launchpad.net' /etc/hosts || \
  echo '185.125.190.72 ppa.launchpad.net' >> /etc/hosts
grep -q 'launchpad.net' /etc/hosts || \
  echo '185.125.190.72 launchpad.net' >> /etc/hosts

apt-get clean
apt-get update -y
echo DNS_FIX_OK
