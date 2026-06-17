#!/usr/bin/env python3
"""Push deploy scripts to remote host and run native deploy (credentials via env)."""
import os
import sys
from pathlib import Path

import paramiko

HOST = os.environ.get("DEPLOY_HOST", "")
USER = os.environ.get("DEPLOY_USER", "root")
PASS = os.environ.get("DEPLOY_PASS", "")
SCRIPT_DIR = Path(__file__).parent
DEPLOY_SCRIPT = SCRIPT_DIR / "server-deploy-native.sh"
DNS_FORWARD = SCRIPT_DIR / "dns-forward.py"

if not HOST or not PASS:
    print("Set DEPLOY_HOST and DEPLOY_PASS (optional DEPLOY_USER).", file=sys.stderr)
    sys.exit(1)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=30)

sftp = ssh.open_sftp()
EXTRA = [
    (SCRIPT_DIR / "fix-ppa-php.sh", "/root/fix-ppa-php.sh"),
    (SCRIPT_DIR / "fix-perms.sh", "/root/fix-perms.sh"),
]
for local, remote in [
    (DEPLOY_SCRIPT, "/root/server-deploy-native.sh"),
    (DNS_FORWARD, "/root/dns-forward.py"),
    *EXTRA,
]:
    data = local.read_bytes().replace(b"\r\n", b"\n")
    with sftp.open(remote, "w") as f:
        f.write(data)
    sftp.chmod(remote, 0o755)

sftp.close()

cmd = "bash /root/server-deploy-native.sh"
if len(sys.argv) > 1:
    cmd = " ".join([cmd, *sys.argv[1:]])

stdin, stdout, stderr = ssh.exec_command(cmd, timeout=3600)
out = stdout.read().decode()
err = stderr.read().decode()
if out:
    print(out)
if err:
    print(err, file=sys.stderr)
code = stdout.channel.recv_exit_status()
ssh.close()
sys.exit(code)
