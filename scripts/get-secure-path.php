<?php
require '/opt/xboard/vendor/autoload.php';
$app = require_once '/opt/xboard/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$path = admin_setting('secure_path') ?: admin_setting('frontend_admin_path');
if (!$path) {
    $path = hash('crc32b', config('app.key'));
}
echo $path . PHP_EOL;
