#!/bin/bash
set -e
# /etc 曾被设为 666，无 traverse 位会导致 apt/ssl/apt-key 全部失败
chmod 755 /etc
chmod 1777 /tmp /var/tmp
chmod 755 /usr /usr/bin /bin /sbin 2>/dev/null || true
ls -lad /etc /tmp
head -1 /etc/ssl/certs/ca-certificates.crt
apt-get -o Acquire::https::CaInfo=/etc/ssl/certs/ca-certificates.crt update -y 2>&1 | tail -8
apt-cache policy php8.5-cli | head -5
