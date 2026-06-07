#!/usr/bin/env python3
import paramiko
import sys
from pathlib import Path

HOST = "127.0.0.1"
USER = "root"
PASS = ""

def main():
    local = Path(sys.argv[1])
    remote = sys.argv[2] if len(sys.argv) > 2 else f"/root/{local.name}"
    local.write_bytes(local.read_bytes().replace(b"\r\n", b"\n"))
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASS, timeout=30)
    sftp = ssh.open_sftp()
    sftp.put(str(local), remote)
    sftp.chmod(remote, 0o755)
    sftp.close()
    cmd = sys.argv[3] if len(sys.argv) > 3 else f"bash {remote}"
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=600)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out:
        sys.stdout.buffer.write(out.encode("utf-8", errors="replace"))
        sys.stdout.buffer.write(b"\n")
    if err:
        print(err, file=sys.stderr)
    code = stdout.channel.recv_exit_status()
    ssh.close()
    sys.exit(code)

if __name__ == "__main__":
    main()
