<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('v2_commission_log', function (Blueprint $table) {
            $table->string('trade_no', 64)->change();
        });
    }

    public function down(): void
    {
        Schema::table('v2_commission_log', function (Blueprint $table) {
            $table->char('trade_no', 36)->change();
        });
    }
};
