<?php

/**
 * Idempotent seed of representative rows so every admin table route and dialog
 * has data for visual-gate comparison. Safe to run repeatedly (checks counts).
 *
 *   php artisan tinker --execute="require 'scripts/visual-gate/seed-compare-data.php';"
 * or
 *   php scripts/visual-gate/seed-compare-data.php   (bootstraps the framework)
 */

use App\Models\Coupon;
use App\Models\GiftCardTemplate;
use App\Models\Knowledge;
use App\Models\Notice;
use App\Models\Order;
use App\Models\Plan;
use App\Models\Server;
use App\Models\ServerGroup;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Models\User;
use App\Utils\Helper;

if (!function_exists('admin_setting')) {
    require __DIR__ . '/../../vendor/autoload.php';
    $app = require __DIR__ . '/../../bootstrap/app.php';
    $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
}

$now = time();
$log = [];

$group = ServerGroup::query()->first() ?: ServerGroup::create(['name' => 'Default Group']);

if (User::query()->count() < 4) {
    for ($i = 1; $i <= 3; $i++) {
        $email = "user{$i}@compare.local";
        if (!User::query()->where('email', $email)->exists()) {
            User::create([
                'email' => $email,
                'password' => password_hash('password123', PASSWORD_DEFAULT),
                'uuid' => Helper::guid(true),
                'token' => Helper::guid(),
                'balance' => $i * 1000,
                'group_id' => $group->id,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }
    $log[] = 'users seeded';
}

$plan = Plan::query()->first() ?: Plan::create([
    'group_id' => $group->id,
    'name' => 'Hello World Plan',
    'transfer_enable' => 100,
    'prices' => ['monthly' => 1000],
]);

if (Server::query()->count() < 2) {
    foreach ([['HK Node', 'hk.example.com'], ['US Node', 'us.example.com']] as $i => [$name, $host]) {
        Server::create([
            'type' => 'shadowsocks',
            'name' => $name,
            'group_ids' => [$group->id],
            'rate' => '1.0',
            'host' => $host,
            'port' => '443',
            'server_port' => 443,
            'show' => 1,
            'sort' => $i + 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }
    $log[] = 'servers seeded';
}

if (Order::query()->count() < 2) {
    $u = User::query()->where('email', 'like', '%compare.local')->first() ?: User::query()->first();
    for ($i = 1; $i <= 2; $i++) {
        Order::create([
            'user_id' => $u->id,
            'plan_id' => $plan->id,
            'type' => 1,
            'period' => 'month_price',
            'trade_no' => strtoupper(Helper::guid()),
            'total_amount' => 1000 * $i,
            'status' => 3,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }
    $log[] = 'orders seeded';
}

if (Coupon::query()->count() < 2) {
    for ($i = 1; $i <= 2; $i++) {
        Coupon::create([
            'code' => 'COMPARE' . $i,
            'name' => "Compare Coupon {$i}",
            'type' => 1,
            'value' => 10 * $i,
            'started_at' => $now,
            'ended_at' => $now + 86400 * 30,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }
    $log[] = 'coupons seeded';
}

if (Notice::query()->count() < 2) {
    for ($i = 1; $i <= 2; $i++) {
        Notice::create([
            'title' => "Compare Notice {$i}",
            'content' => "<p>Notice body {$i}</p>",
            'show' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }
    $log[] = 'notices seeded';
}

if (Knowledge::query()->count() < 2) {
    for ($i = 1; $i <= 2; $i++) {
        Knowledge::create([
            'language' => 'zh-CN',
            'category' => 'General',
            'title' => "Compare KB {$i}",
            'body' => "<p>Knowledge body {$i}</p>",
            'show' => 1,
            'sort' => $i,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }
    $log[] = 'knowledge seeded';
}

if (Ticket::query()->count() < 2) {
    $u = User::query()->first();
    for ($i = 1; $i <= 2; $i++) {
        $t = Ticket::create([
            'user_id' => $u->id,
            'subject' => "Compare Ticket {$i}",
            'level' => 1,
            'status' => 0,
            'reply_status' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        try {
            TicketMessage::create([
                'user_id' => $u->id,
                'ticket_id' => $t->id,
                'message' => "Ticket message {$i}",
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        } catch (\Throwable $e) {
        }
    }
    $log[] = 'tickets seeded';
}

if (GiftCardTemplate::query()->count() < 1) {
    GiftCardTemplate::create([
        'name' => 'Compare Gift Template',
        'type' => 1,
        'status' => 1,
        'rewards' => ['balance' => 1000],
        'admin_id' => User::query()->where('is_admin', 1)->value('id') ?: 1,
        'created_at' => $now,
        'updated_at' => $now,
    ]);
    $log[] = 'gift template seeded';
}

echo "SEED DONE: " . (implode(', ', $log) ?: 'nothing to add (already seeded)') . PHP_EOL;
echo 'counts: users=' . User::count() . ' servers=' . Server::count() . ' orders=' . Order::count()
    . ' coupons=' . Coupon::count() . ' notices=' . Notice::count() . ' knowledge=' . Knowledge::count()
    . ' tickets=' . Ticket::count() . ' giftTpl=' . GiftCardTemplate::count() . ' plans=' . Plan::count() . PHP_EOL;
