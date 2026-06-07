# Xboard 原生部署回滚说明

## 切换前备份位置

- Docker 旧栈 `.env`：`/root/xboard-backup/docker.env`（若存在）
- 旧 Docker 目录：`/opt/Xboard-master`（未删除，仅 `docker compose down`）

## 回滚到 Docker（紧急）

```bash
cd /opt/Xboard-master
docker compose up -d
# 停止原生栈
supervisorctl stop xboard-octane xboard-horizon
systemctl stop nginx
```

## 原生栈保留数据

- MySQL 库：`xboard`（用户 `xboard`）
- 应用目录：`/opt/xboard`
- Redis：端口 `6380`（见 `/etc/redis/redis.conf`）

## PHP / MySQL 版本受阻时的备选

| 组件 | 目标 | 备选 |
|------|------|------|
| PHP | 8.5.7 (ondrej PPA) | 8.4.x 同 PPA |
| MySQL | 9.7 LTS（官方 APT） | Ubuntu `mysql-server` 8.0.x（当前服务器） |
| Redis | 8.8 | 保持现有 6380 实例，仅同步 `.env` |

降级时修改 `composer.json` 中 `php`、`laravel/framework` 约束后重新 `composer update`。

## 服务器权限修复备忘

若 `apt` / `mysql` / `nginx` 异常，检查并修复：

```bash
chmod 755 /etc /usr /usr/lib /run
chmod 1777 /tmp /var/tmp
# DNS：systemd-resolved 失败时需运行 /root/dns-forward.py
```
