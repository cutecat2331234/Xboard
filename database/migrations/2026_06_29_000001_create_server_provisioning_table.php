<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('v2_server_provisioning')) {
            return;
        }

        Schema::create('v2_server_provisioning', function (Blueprint $table) {
            $table->id();

            // Task lifecycle
            $table->string('status')->default('pending')
                ->comment('pending/connecting/probing/preparing/installing/creating/waiting/done/failed/timeout');
            $table->string('current_step')->nullable()->comment('current state machine step');
            $table->json('steps')->nullable()->comment('per-step status/timing (progress bar)');

            // SSH target (NON-SENSITIVE ONLY — no credentials are ever stored here)
            $table->string('host')->comment('SSH host (no credentials)');
            $table->unsignedInteger('port')->default(22)->comment('SSH port');
            $table->string('ssh_user')->default('root')->comment('SSH username (non-sensitive)');
            $table->string('auth_method')->default('password')->comment('password | key (content NOT stored)');
            $table->string('host_key_fingerprint')->nullable()->comment('TOFU host key fingerprint');

            // Provisioning mode / linkage (backfilled on success)
            $table->string('mode')->default('machine')->comment('machine | node');
            $table->unsignedBigInteger('machine_id')->nullable()->comment('linked v2_server_machine');
            $table->unsignedBigInteger('server_id')->nullable()->comment('linked v2_server');

            // Node parameter snapshot (NON-SENSITIVE — protocol/port/group, enables retry)
            $table->json('node_params')->nullable()->comment('node protocol params snapshot (no credentials)');

            // Redacted observability
            $table->longText('log')->nullable()->comment('redacted install log (never contains tokens/credentials)');
            $table->text('error')->nullable()->comment('redacted failure reason');

            // Audit
            $table->unsignedBigInteger('created_by')->nullable()->comment('admin user id');
            $table->timestamps();

            $table->index('status');
            $table->index('host');
            $table->index('machine_id');
            $table->index('server_id');
            $table->index('created_by');

            $table->foreign('machine_id')->references('id')->on('v2_server_machine')->nullOnDelete();
            $table->foreign('server_id')->references('id')->on('v2_server')->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('v2_server_provisioning')) {
            return;
        }

        Schema::table('v2_server_provisioning', function (Blueprint $table) {
            $table->dropForeign(['machine_id']);
            $table->dropForeign(['server_id']);
        });
        Schema::dropIfExists('v2_server_provisioning');
    }
};
