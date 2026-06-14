<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('v2_invite_code', 'use_count')) {
            Schema::table('v2_invite_code', function (Blueprint $table) {
                $table->unsignedInteger('use_count')->default(0)->after('pv');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('v2_invite_code', 'use_count')) {
            Schema::table('v2_invite_code', function (Blueprint $table) {
                $table->dropColumn('use_count');
            });
        }
    }
};
