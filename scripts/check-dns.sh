#!/bin/bash
cat /etc/hosts
echo '---'
cat /etc/resolv.conf
echo '---'
ss -lunp | grep ':53 ' || echo 'no udp 53'
ss -ltnp | grep ':53 ' || echo 'no tcp 53'
echo '---'
getent ahostsv4 mirrors.aliyun.com
python3 -c "import socket; print(socket.getaddrinfo('mirrors.aliyun.com', 80)[0][4][0])"
