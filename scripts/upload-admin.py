#!/usr/bin/env python3
"""Upload public/assets/admin submodule to server when git submodule clone fails."""
import os
import paramiko
from pathlib import Path

HOST = "127.0.0.1"
USER = "root"
PASS = ""
LOCAL_ADMIN = Path(__file__).resolve().parents[1] / "public" / "assets" / "admin"
REMOTE_DIR = "/opt/xboard/public/assets/admin"


def upload_dir(sftp, local: Path, remote: str) -> None:
    for root, dirs, files in os.walk(local):
        rel = Path(root).relative_to(local)
        remote_root = remote if str(rel) == "." else f"{remote}/{rel.as_posix()}"
        try:
            sftp.stat(remote_root)
        except OSError:
            sftp.mkdir(remote_root)
        for f in files:
            lp = Path(root) / f
            rp = f"{remote_root}/{f}"
            sftp.put(str(lp), rp)


def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASS, timeout=30)
    ssh.exec_command(f"mkdir -p {REMOTE_DIR}")
    sftp = ssh.open_sftp()
    upload_dir(sftp, LOCAL_ADMIN, REMOTE_DIR)
    sftp.close()
    ssh.close()
    print(f"Uploaded {LOCAL_ADMIN} -> {REMOTE_DIR}")


if __name__ == "__main__":
    main()
