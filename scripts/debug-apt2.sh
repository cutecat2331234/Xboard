#!/bin/bash
strace -f -e trace=connect,sendto -o /tmp/apt2.log apt-get update -y 2>&1 | tail -3
grep connect /tmp/apt2.log | grep 53 | head -5
grep connect /tmp/apt2.log | grep -v 53 | tail -10
# 直接用 IP 作为 mirror
cat > /etc/apt/sources.list.d/ubuntu.sources <<'EOF'
Types: deb
URIs: http://58.222.35.89/ubuntu/
Suites: noble noble-updates noble-backports
Components: main restricted universe multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg

Types: deb
URIs: http://58.222.35.89/ubuntu/
Suites: noble-security
Components: main restricted universe multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg
EOF
apt-get -o Acquire::http::Proxy=false update -y 2>&1 | tail -10
