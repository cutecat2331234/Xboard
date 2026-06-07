# Xboard 全栈版本锁定表

检索日期：**2026-06-07**（执行日必重新核对官方来源）

| 组件 | 锁定版本 | 官方来源 | 已读文档 |
|------|----------|----------|----------|
| PHP | 8.5.7 | https://www.php.net/downloads | https://www.php.net/ChangeLog-8.php |
| Laravel Framework | ^13.0 (v13.14.0) | https://github.com/laravel/framework/releases | https://laravel.com/docs/13.x/upgrade |
| Laravel Octane | ^2.17 | https://github.com/laravel/octane/releases | https://laravel.com/docs/13.x/octane |
| Laravel Horizon | ^5.47 | https://github.com/laravel/horizon/releases | https://laravel.com/docs/13.x/horizon |
| Laravel Sanctum | ^4.0 | https://github.com/laravel/sanctum | https://laravel.com/docs/13.x/sanctum |
| MySQL | 9.7.0 LTS | https://dev.mysql.com/doc/relnotes/mysql/9.7/en/ | https://dev.mysql.com/doc/mysql/en/linux-installation.html |
| Redis | 8.8.0 | https://github.com/redis/redis/releases/tag/8.8.0 | https://download.redis.io/ |
| Swoole | 6.2.1 | https://github.com/swoole/swoole-src/releases/tag/v6.2.1 | https://pecl.php.net/package/swoole |
| Node.js (build) | 24.16.0 LTS | https://nodejs.org/en/download | https://nodejs.org/en/about/previous-releases |
| Vite | ^8.0.16 | https://github.com/vitejs/vite/releases/tag/v8.0.16 | https://vite.dev/guide/migration |
| Vue | ^3.5.35 | https://github.com/vuejs/core/releases | https://github.com/vuejs/core/blob/main/CHANGELOG.md |
| React | ^19.2.7 | https://github.com/facebook/react/releases | https://react.dev/blog |
| Naive UI | ^2.44.1 | https://www.npmjs.com/package/naive-ui | https://www.naiveui.com |

## 服务器实测（部署后填写）

| 检查命令 | 预期 | 实测 |
|----------|------|------|
| `php -v` | 8.5.7 | TBD |
| `mysql --version` | 9.7.x | TBD |
| `redis-server --version` | 8.8.x | TBD |
| `php -m \| grep swoole` | swoole | TBD |
| `php artisan about` | Laravel 13.x | TBD |
