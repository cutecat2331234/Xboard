import sys
#!/usr/bin/env python3
import os
import paramiko

HOST = os.environ.get("DEPLOY_HOST", "")
USER = os.environ.get("DEPLOY_USER", "root")
PASS = os.environ.get("DEPLOY_PASS", "")

cmds = [
    "uname -a",
    "php -v 2>&1 | head -1 || echo NO_PHP",
    "mysql --version 2>&1 | head -1 || echo NO_MYSQL",
    "redis-server --version 2>&1 || echo NO_REDIS",
    "ss -tlnp | grep 7001 || echo PORT_7001_FREE",
    "docker ps --format '{{.Names}}' 2>/dev/null | head -5",
    "test -d /opt/xboard && echo XBOARD_EXISTS || echo NO_XBOARD",
    "test -d /opt/Xboard-master && echo DOCKER_STACK_EXISTS || echo NO_DOCKER_STACK",
]

if not HOST or not PASS:
    print("Set DEPLOY_HOST and DEPLOY_PASS.", file=sys.stderr)
    sys.exit(1)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=30)
for c in cmds:
    stdin, stdout, stderr = ssh.exec_command(c, timeout=60)
    out = (stdout.read() + stderr.read()).decode()
    print(f"=== {c} ===\n{out.strip()}\n")
ssh.close()
