<?php
/** Seed a gift card template on 7002 for visual-gate dialog probes. */
require '/opt/xboard/vendor/autoload.php';
$app = require '/opt/xboard/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\GiftCardTemplate;

$name = '探测用通用卡';
$existing = GiftCardTemplate::where('name', $name)->first();
if ($existing) {
    echo "exists id={$existing->id}\n";
    exit(0);
}

$t = GiftCardTemplate::create([
    'name' => $name,
    'description' => 'visual gate seed',
    'type' => GiftCardTemplate::TYPE_GENERAL,
    'status' => true,
    'rewards' => ['balance' => 1000],
    'conditions' => [],
    'limits' => [],
    'theme_color' => '#2d6565',
    'sort' => 0,
    'admin_id' => 1,
]);
echo "created id={$t->id}\n";
