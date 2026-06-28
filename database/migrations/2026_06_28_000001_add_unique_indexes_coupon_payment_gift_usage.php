<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // v2_coupon.code — de-dup (keep lowest id) then add unique index
        if (Schema::hasTable('v2_coupon') && Schema::hasColumn('v2_coupon', 'code') && !$this->hasIndex('v2_coupon', 'v2_coupon_code_unique')) {
            $this->deduplicate('v2_coupon', ['code']);
            Schema::table('v2_coupon', function (Blueprint $table) {
                $table->unique('code');
            });
        }

        // v2_payment.uuid — de-dup (keep lowest id) then add unique index
        if (Schema::hasTable('v2_payment') && Schema::hasColumn('v2_payment', 'uuid') && !$this->hasIndex('v2_payment', 'v2_payment_uuid_unique')) {
            $this->deduplicate('v2_payment', ['uuid']);
            Schema::table('v2_payment', function (Blueprint $table) {
                $table->unique('uuid');
            });
        }

        // v2_gift_card_usage (code_id,user_id) — de-dup then add composite unique index
        if (
            Schema::hasTable('v2_gift_card_usage')
            && Schema::hasColumn('v2_gift_card_usage', 'code_id')
            && Schema::hasColumn('v2_gift_card_usage', 'user_id')
            && !$this->hasIndex('v2_gift_card_usage', 'gift_card_usage_code_user_unique')
        ) {
            $this->deduplicate('v2_gift_card_usage', ['code_id', 'user_id']);
            Schema::table('v2_gift_card_usage', function (Blueprint $table) {
                $table->unique(['code_id', 'user_id'], 'gift_card_usage_code_user_unique');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('v2_coupon') && $this->hasIndex('v2_coupon', 'v2_coupon_code_unique')) {
            Schema::table('v2_coupon', function (Blueprint $table) {
                $table->dropUnique(['code']);
            });
        }

        if (Schema::hasTable('v2_payment') && $this->hasIndex('v2_payment', 'v2_payment_uuid_unique')) {
            Schema::table('v2_payment', function (Blueprint $table) {
                $table->dropUnique(['uuid']);
            });
        }

        if (Schema::hasTable('v2_gift_card_usage') && $this->hasIndex('v2_gift_card_usage', 'gift_card_usage_code_user_unique')) {
            Schema::table('v2_gift_card_usage', function (Blueprint $table) {
                $table->dropUnique('gift_card_usage_code_user_unique');
            });
        }
    }

    /**
     * Remove duplicate rows on the given column set, keeping the lowest id per group.
     */
    private function deduplicate(string $table, array $columns): void
    {
        $duplicates = DB::table($table)
            ->select($columns)
            ->groupBy($columns)
            ->havingRaw('COUNT(*) > 1')
            ->get();

        foreach ($duplicates as $row) {
            $query = DB::table($table);
            foreach ($columns as $column) {
                $query->where($column, $row->{$column});
            }
            $ids = $query->orderBy('id')->pluck('id');
            if ($ids->count() <= 1) {
                continue;
            }
            DB::table($table)
                ->whereIn('id', $ids->slice(1)->values()->all())
                ->delete();
        }
    }

    /**
     * Check whether an index name exists on a table (driver-agnostic).
     */
    private function hasIndex(string $table, string $indexName): bool
    {
        try {
            $connection = Schema::getConnection();
            $driver = $connection->getDriverName();

            if ($driver === 'sqlite') {
                $indexes = $connection->select("PRAGMA index_list('{$table}')");
                foreach ($indexes as $index) {
                    if (($index->name ?? null) === $indexName) {
                        return true;
                    }
                }
                return false;
            }

            if ($driver === 'mysql' || $driver === 'mariadb') {
                $result = $connection->select(
                    "SHOW INDEX FROM `{$table}` WHERE Key_name = ?",
                    [$indexName]
                );
                return !empty($result);
            }

            if ($driver === 'pgsql') {
                $result = $connection->select(
                    'SELECT 1 FROM pg_indexes WHERE tablename = ? AND indexname = ?',
                    [$table, $indexName]
                );
                return !empty($result);
            }
        } catch (\Throwable $e) {
            // Fall through to false; up() will attempt to create and surface any error.
        }

        return false;
    }
};
