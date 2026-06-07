#!/bin/bash
set -x
cat /etc/resolv.conf
getent hosts mirrors.aliyun.com | head -1
strace -f -e trace=socket,sendto,recvfrom,connect -o /tmp/apt.dns.log apt-get update -y 2>&1 | tail -5
grep -E '53|sendto|recvfrom' /tmp/apt.dns.log | tail -20
apt-get -o Debug::Acquire::gai=true update -y 2>&1 | head -40
