#!/bin/bash
php8.5 /opt/xboard/scripts/get-secure-path.php 2>/dev/null || \
php8.5 -r "require '/opt/xboard/vendor/autoload.php'; \$a=require '/opt/xboard/bootstrap/app.php'; \$a->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap(); echo (admin_setting('secure_path')?:hash('crc32b',config('app.key'))).PHP_EOL;"
