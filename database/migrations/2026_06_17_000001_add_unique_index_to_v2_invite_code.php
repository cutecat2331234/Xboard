<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $duplicateCodes = DB::table('v2_invite_code')
            ->select('code')
            ->groupBy('code')
            ->havingRaw('COUNT(*) > 1')
            ->pluck('code');

        foreach ($duplicateCodes as $code) {
            $ids = DB::table('v2_invite_code')
                ->where('code', $code)
                ->orderBy('id')
                ->pluck('id');
            if ($ids->count() <= 1) {
                continue;
            }
            DB::table('v2_invite_code')
                ->whereIn('id', $ids->slice(1)->values()->all())
                ->delete();
        }

        Schema::table('v2_invite_code', function (Blueprint $table) {
            $table->unique('code');
        });
    }

    public function down(): void
    {
        Schema::table('v2_invite_code', function (Blueprint $table) {
            $table->dropUnique(['code']);
        });
    }
};
