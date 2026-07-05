<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('v2_user', function (Blueprint $table) {
            // 订阅拉取热路径:Client 中间件 / 节点鉴权 / WebSocket 均按 token 查 v2_user,
            // 此前该列无任何索引 → 每次订阅请求都是一次全表扫描,是订阅接口延迟与 DB CPU 的首要来源。
            // token 由系统生成、事实上唯一,但历史数据可能有重复,保守起见先用普通 index。
            $table->index('token', 'idx_v2_user_token');

            // getAvailableUsers / filterUserIdsByNodeGroups(每次节点 /user 轮询)的可用用户查询:
            // 先用 group_id(IN)+banned(=) 等值收敛,再按 expired_at 范围过滤。
            // 旧的 [u,d,expired_at,group_id,...] 复合索引以 u,d 为前导列(仅出现在 u+d<transfer_enable
            // 计算表达式里、不可 sargable),对本查询基本退化为全表扫描。
            $table->index(['group_id', 'banned', 'expired_at'], 'idx_v2_user_group_banned_expired');
        });
    }

    public function down(): void
    {
        Schema::table('v2_user', function (Blueprint $table) {
            $table->dropIndex('idx_v2_user_token');
            $table->dropIndex('idx_v2_user_group_banned_expired');
        });
    }
};
