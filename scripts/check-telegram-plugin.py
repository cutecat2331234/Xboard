import sys
#!/usr/bin/env python3
"""Check TelegramLogin plugin status on 7002 server."""
import json
import os
import paramiko

HOST = os.environ.get("DEPLOY_HOST", "")
USER = os.environ.get("DEPLOY_USER", "root")
PASS = os.environ.get("DEPLOY_PASS", "")

COMMANDS = [
    "ls -la /opt/xboard/plugins-core/ 2>/dev/null",
    "ls -laR /opt/xboard/plugins-core/Telegram/ 2>/dev/null | head -50",
    "find /opt/xboard -iname '*TelegramLogin*' 2>/dev/null",
    "mysql -N -e \"SHOW TABLES LIKE '%plugin%'\" xboard 2>&1",
    "mysql -N -e \"DESCRIBE v2_plugins\" xboard 2>&1",
    "mysql -N -e \"SELECT * FROM v2_plugins\" xboard 2>&1",
    "grep -r telegram_login /opt/xboard/app --include='*.php' -l 2>/dev/null | head -15",
    "grep -r telegram_login_enable /opt/xboard --include='*.php' 2>/dev/null | head -15",
    "curl -s http://127.0.0.1:7002/api/v1/guest/comm/config | python3 -m json.tool 2>&1 | head -40",
]


def main():
    if not HOST or not PASS:
    print("Set DEPLOY_HOST and DEPLOY_PASS.", file=sys.stderr)
    sys.exit(1)

ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASS, timeout=30)
    for cmd in COMMANDS:
        print(f"\n=== {cmd[:100]} ===")
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=120)
        out = stdout.read().decode("utf-8", errors="replace")
        err = stderr.read().decode("utf-8", errors="replace")
        if out:
            print(out[:4000])
        if err:
            print("STDERR:", err[:1000])
    ssh.close()


if __name__ == "__main__":
    main()
