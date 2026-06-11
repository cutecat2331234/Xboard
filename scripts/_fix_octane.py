#!/usr/bin/env python3
import paramiko
import time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("127.0.0.1", username="root", password="", timeout=60)

cmds = [
    "supervisorctl stop xboard-octane-new",
    "pkill -f '/opt/xboard/artisan octane' || true",
    "fuser -k 7011/tcp 2>/dev/null || true",
    "sleep 2",
    "ss -tlnp | grep 7011 || echo '7011 free'",
    "supervisorctl start xboard-octane-new",
    "sleep 5",
    "supervisorctl status xboard-octane-new",
]
for c in cmds:
    print(">>>", c)
    _, o, e = ssh.exec_command(c, timeout=30)
    o.channel.recv_exit_status()
    out = o.read().decode(errors="replace")
    if out.strip():
        print(out)

for attempt in range(3):
    print(f">>> health check attempt {attempt + 1}")
    _, o, e = ssh.exec_command(
        "curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://127.0.0.1:7002/",
        timeout=20,
    )
    o.channel.recv_exit_status()
    code = o.read().decode().strip()
    print("7002:", code)
    if code == "200":
        break
    time.sleep(5)

ssh.close()
