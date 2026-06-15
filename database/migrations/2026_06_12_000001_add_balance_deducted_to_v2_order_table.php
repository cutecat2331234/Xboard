<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('v2_order', 'balance_deducted')) {
            Schema::table('v2_order', function (Blueprint $table) {
                $table->boolean('balance_deducted')->default(false)->after('balance_amount');
            });
        }

        // Legacy orders already debited balance at create time.
        DB::table('v2_order')
            ->where('balance_amount', '>', 0)
            ->whereIn('status', [0, 1])
            ->update(['balance_deducted' => true]);
    }

    public function down(): void
    {
        if (Schema::hasColumn('v2_order', 'balance_deducted')) {
            Schema::table('v2_order', function (Blueprint $table) {
                $table->dropColumn('balance_deducted');
            });
        }
    }
};
