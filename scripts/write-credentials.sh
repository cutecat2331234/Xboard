#!/bin/bash
SECURE=$(php8.5 -r "require '/opt/xboard/vendor/autoload.php'; \$a=require '/opt/xboard/bootstrap/app.php'; \$a->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap(); echo admin_setting('secure_path')?:hash('crc32b',config('app.key'));" 2>/dev/null)
cat > /root/xboard-credentials.txt <<EOF
Xboard 登录凭据（2026-06-08 重置）
================================
用户前台（7001 / 7002 通用）:
  邮箱: admin@example.com
  密码: your-password

管理后台:
  http://127.0.0.1:7001/${SECURE}
  http://127.0.0.1:7002/${SECURE}
  同上邮箱密码
EOF
chmod 600 /root/xboard-credentials.txt
cat /root/xboard-credentials.txt
