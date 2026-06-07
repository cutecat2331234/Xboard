#!/bin/bash
ls -la /dev/null /dev/zero
stat /dev/null
ls -la /etc/resolv.conf
md5sum /etc/resolv.conf
grep -r 127.0.0.1 /etc/resolv* /run/systemd/resolve/ 2>/dev/null || true
cat /proc/self/mountinfo | grep resolv || true
