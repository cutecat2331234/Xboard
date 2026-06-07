#!/usr/bin/env python3
import paramiko
import sys
from pathlib import Path

HOST = "43.248.77.134"
USER = "root"
PASS = "LVFtSg5ypsHl3q93"
SCRIPT_DIR = Path(__file__).parent
DEPLOY_SCRIPT = SCRIPT_DIR / "server-deploy-native.sh"
DNS_FORWARD = SCRIPT_DIR / "dns-forward.py"

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

cmd = "bash /root/server-deploy-native.sh 2>&1"
stdin, stdout, stderr = ssh.exec_command(cmd, timeout=3600, get_pty=True)

while True:
    line = stdout.readline()
    if not line:
        break
    sys.stdout.write(line)
    sys.stdout.flush()

exit_code = stdout.channel.recv_exit_status()
print(f"\nEXIT_CODE={exit_code}")
ssh.close()
sys.exit(exit_code)
