#!/usr/bin/env python3
import os
import paramiko
import sys
import time

HOST, USER, PASS = "127.0.0.1", "root", ""

cmds = [
    "supervisorctl status",
    "ls -la /var/log/supervisor/ 2>/dev/null | tail -20",
    "tail -n 40 /var/log/supervisor/xboard-octane-new-stderr---supervisor-*.log 2>/dev/null | tail -40",
    "bash /root/restart-dual.sh 2>/dev/null || bash /opt/xboard/scripts/restart-dual.sh 2>/dev/null || true",
    "pkill -f 'octane:start' 2>/dev/null || true",
    "cd /opt/xboard && php8.5 artisan octane:stop 2>/dev/null || true",
    "supervisorctl reread",
    "supervisorctl update",
    "supervisorctl restart xboard-octane-legacy",
    "supervisorctl restart xboard-octane-new",
    "sleep 8",
    "supervisorctl status",
    'curl -s -o /dev/null -w "7001:%{http_code} " http://127.0.0.1:7001/',
    'curl -s -o /dev/null -w "7002:%{http_code}" http://127.0.0.1:7002/',
]

for attempt in range(6):
    try:
        if not HOST or not PASS:
    print("Set DEPLOY_HOST and DEPLOY_PASS.", file=sys.stderr)
    sys.exit(1)

ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(HOST, username=USER, password=PASS, timeout=90)
        for c in cmds:
            stdin, stdout, stderr = ssh.exec_command(c, timeout=120)
            out = stdout.read().decode(errors="replace")
            err = stderr.read().decode(errors="replace")
            print(">>>", c)
            print(out or err)
        ssh.close()
        sys.exit(0)
    except Exception as e:
        print("ssh fail", attempt, e)
        time.sleep(8)

sys.exit(1)
