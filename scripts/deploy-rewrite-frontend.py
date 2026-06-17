#!/usr/bin/env python3
"""Build rewrite frontends locally and deploy to /opt/xboard (7002) only."""
import os
import subprocess
import sys
import paramiko
from pathlib import Path

HOST = os.environ.get("DEPLOY_HOST", "")
USER = os.environ.get("DEPLOY_USER", "root")
PASS = os.environ.get("DEPLOY_PASS", "")
ROOT = Path(__file__).resolve().parents[1]


def run(cmd: list[str], cwd: Path) -> None:
    print(">", " ".join(cmd), f"(cwd={cwd})")
    subprocess.run(cmd, cwd=str(cwd), check=True)


def upload_dir(sftp, local: Path, remote: str) -> None:
    for dirpath, _, filenames in os.walk(local):
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
            if f in {".git", ".gitignore"}:
                continue
            sftp.put(str(Path(dirpath) / f), f"{remote_dir}/{f}")


def main() -> None:
    run(["npm", "install"], ROOT / "frontend/user")
    run(["npm", "run", "build"], ROOT / "frontend/user")
    run(["npm", "install"], ROOT / "frontend/admin")
    run(["npm", "run", "build"], ROOT / "frontend/admin")

    manifest = ROOT / "public/assets/admin/.vite/manifest.json"
    target = ROOT / "public/assets/admin/manifest.json"
    if manifest.exists():
        target.write_text(manifest.read_text(encoding="utf-8"), encoding="utf-8")

    if not HOST or not PASS:
    print("Set DEPLOY_HOST and DEPLOY_PASS.", file=sys.stderr)
    sys.exit(1)

ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASS, timeout=60)
    sftp = ssh.open_sftp()

    upload_dir(sftp, ROOT / "theme/Xboard/assets", "/opt/xboard/public/theme/Xboard/assets")
    upload_dir(sftp, ROOT / "theme/Xboard", "/opt/xboard/theme/Xboard")
    upload_dir(sftp, ROOT / "public/assets/admin", "/opt/xboard/public/assets/admin")

    sftp.close()
    for c in [
        "chown -R www-data:www-data /opt/xboard/public/theme /opt/xboard/public/assets/admin /opt/xboard/theme/Xboard",
        "echo rewrite-src > /opt/xboard/storage/frontend-variant/mode",
        "cd /opt/xboard && php8.5 artisan view:clear",
        "supervisorctl restart xboard-octane-new",
    ]:
        ssh.exec_command(c, timeout=120)
    ssh.close()
    print("REWRITE_FRONTEND_DEPLOYED")


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as e:
        print(e, file=sys.stderr)
        sys.exit(1)
