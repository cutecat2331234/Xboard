import sys
#!/usr/bin/env python3
"""Download original closed-source user+admin dist from server legacy instance."""
import os
import paramiko
from pathlib import Path

HOST = os.environ.get("DEPLOY_HOST", "")
USER = os.environ.get("DEPLOY_USER", "root")
PASS = os.environ.get("DEPLOY_PASS", "")
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "legacy-dist"


def download_dir(sftp, remote: str, local: Path) -> None:
    local.mkdir(parents=True, exist_ok=True)
    for entry in sftp.listdir_attr(remote):
        rpath = f"{remote}/{entry.filename}"
        lpath = local / entry.filename
        if entry.st_mode & 0o40000:
            download_dir(sftp, rpath, lpath)
        else:
            lpath.parent.mkdir(parents=True, exist_ok=True)
            sftp.get(rpath, str(lpath))
            print(f"  {rpath}")


def main() -> None:
    if not HOST or not PASS:
    print("Set DEPLOY_HOST and DEPLOY_PASS.", file=sys.stderr)
    sys.exit(1)

ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASS, timeout=30)
    sftp = ssh.open_sftp()
    pairs = [
        ("/opt/xboard-legacy/public/theme/Xboard/assets", OUT / "public" / "theme" / "Xboard" / "assets"),
        ("/opt/xboard-legacy/public/assets/admin", OUT / "public" / "assets" / "admin"),
        ("/opt/xboard-legacy/theme/Xboard/dashboard.blade.php", OUT / "theme" / "Xboard" / "dashboard.blade.php"),
    ]
    for remote, local in pairs:
        print(f"GET {remote} -> {local}")
        if remote.endswith(".blade.php"):
            local.parent.mkdir(parents=True, exist_ok=True)
            sftp.get(remote, str(local))
        else:
            download_dir(sftp, remote, local)
    sftp.close()
    ssh.close()
    print("PULL_LEGACY_OK")


if __name__ == "__main__":
    main()
