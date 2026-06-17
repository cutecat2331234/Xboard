import sys
#!/usr/bin/env python3
"""Deploy closed-source original dist to /opt/xboard (7002). Not the Vue rewrite."""
import os
import paramiko
from pathlib import Path

HOST = os.environ.get("DEPLOY_HOST", "")
USER = os.environ.get("DEPLOY_USER", "root")
PASS = os.environ.get("DEPLOY_PASS", "")
ROOT = Path(__file__).resolve().parents[1]
LEGACY = ROOT / "legacy-dist"


def upload_dir(sftp, local: Path, remote: str) -> None:
    for dirpath, dirnames, filenames in os.walk(local):
        rel = Path(dirpath).relative_to(local)
        remote_dir = remote if str(rel) == "." else f"{remote}/{rel.as_posix()}"
        try:
            sftp.stat(remote_dir)
        except OSError:
            parts = remote_dir.strip("/").split("/")
            cur = ""
            for p in parts:
                cur += "/" + p
                try:
                    sftp.stat(cur)
                except OSError:
                    sftp.mkdir(cur)
        for f in filenames:
            if f == ".git":
                continue
            sftp.put(str(Path(dirpath) / f), f"{remote_dir}/{f}")


def main() -> None:
    if not HOST or not PASS:
    print("Set DEPLOY_HOST and DEPLOY_PASS.", file=sys.stderr)
    sys.exit(1)

ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASS, timeout=30)
    sftp = ssh.open_sftp()
    ssh.exec_command(
        "rm -rf /opt/xboard/public/theme/Xboard/assets /opt/xboard/public/assets/admin",
        timeout=60,
    )
    upload_dir(
        sftp,
        LEGACY / "public" / "theme" / "Xboard" / "assets",
        "/opt/xboard/public/theme/Xboard/assets",
    )
    upload_dir(sftp, LEGACY / "public" / "assets" / "admin", "/opt/xboard/public/assets/admin")
    blade_local = LEGACY / "theme" / "Xboard" / "dashboard.blade.php"
    sftp.put(str(blade_local), "/opt/xboard/theme/Xboard/dashboard.blade.php")
    sftp.close()
    for c in [
        "chown -R www-data:www-data /opt/xboard/public/theme /opt/xboard/public/assets/admin /opt/xboard/theme/Xboard",
        "echo original-dist > /opt/xboard/storage/frontend-variant/mode",
        "supervisorctl restart xboard-octane-new",
    ]:
        ssh.exec_command(c, timeout=60)
    ssh.close()
    print("ORIGINAL_FRONTEND_DEPLOYED")


if __name__ == "__main__":
    main()
