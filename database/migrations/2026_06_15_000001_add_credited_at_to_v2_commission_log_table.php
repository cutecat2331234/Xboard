<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('v2_commission_log')) {
            return;
        }
        Schema::table('v2_commission_log', function (Blueprint $table) {
            if (!Schema::hasColumn('v2_commission_log', 'credited_at')) {
                $table->integer('credited_at')->nullable()->after('get_amount');
            }
        });
        DB::table('v2_commission_log')->whereNull('credited_at')->update([
            'credited_at' => DB::raw('created_at'),
        ]);
    }

    public function down(): void
    {
        if (!Schema::hasTable('v2_commission_log')) {
            return;
        }
        Schema::table('v2_commission_log', function (Blueprint $table) {
            if (Schema::hasColumn('v2_commission_log', 'credited_at')) {
                $table->dropColumn('credited_at');
            }
        });
    }
};
