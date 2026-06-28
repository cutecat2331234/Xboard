<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('v2_ticket_type')) {
            Schema::create('v2_ticket_type', function (Blueprint $table) {
                $table->id();
                $table->string('name')->comment('工单类型名称');
                $table->integer('sort')->default(0)->comment('排序');
                $table->tinyInteger('show')->default(1)->comment('是否启用：0禁用 1启用');
                $table->integer('created_at');
                $table->integer('updated_at');

                $table->index(['show', 'sort'], 'idx_ticket_type_show_sort');
            });
        }

        // 存量工单与未选类型的工单都允许为空，故 nullable 且不加强 FK 约束。
        if (!Schema::hasColumn('v2_ticket', 'ticket_type_id')) {
            Schema::table('v2_ticket', function (Blueprint $table) {
                $table->unsignedBigInteger('ticket_type_id')->nullable()->after('level')->index();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('v2_ticket', 'ticket_type_id')) {
            Schema::table('v2_ticket', function (Blueprint $table) {
                $table->dropColumn('ticket_type_id');
            });
        }

        Schema::dropIfExists('v2_ticket_type');
    }
};
