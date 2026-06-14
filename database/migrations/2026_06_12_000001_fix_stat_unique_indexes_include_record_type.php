<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('v2_stat_user') && config('database.default') !== 'sqlite') {
            Schema::table('v2_stat_user', function (Blueprint $table) {
                $table->dropUnique('server_rate_user_id_record_at');
                $table->unique(
                    ['user_id', 'server_rate', 'record_at', 'record_type'],
                    'stat_user_user_rate_at_type'
                );
            });
        }

        if (Schema::hasTable('v2_stat_server') && config('database.default') !== 'sqlite') {
            Schema::table('v2_stat_server', function (Blueprint $table) {
                $table->dropUnique('server_id_server_type_record_at');
                $table->unique(
                    ['server_id', 'server_type', 'record_at', 'record_type'],
                    'stat_server_id_type_at_type'
                );
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('v2_stat_user') && config('database.default') !== 'sqlite') {
            Schema::table('v2_stat_user', function (Blueprint $table) {
                $table->dropUnique('stat_user_user_rate_at_type');
                $table->unique(['server_rate', 'user_id', 'record_at'], 'server_rate_user_id_record_at');
            });
        }

        if (Schema::hasTable('v2_stat_server') && config('database.default') !== 'sqlite') {
            Schema::table('v2_stat_server', function (Blueprint $table) {
                $table->dropUnique('stat_server_id_type_at_type');
                $table->unique(['server_id', 'server_type', 'record_at'], 'server_id_server_type_record_at');
            });
        }
    }
};
