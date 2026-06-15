<?php

namespace App\Support;

use App\Models\User;

class CommissionChain
{
    /**
     * Whether the inviter chain (up to 3 levels) has no banned or missing users.
     */
    public static function isValid(?int $inviteUserId): bool
    {
        if (!$inviteUserId) {
            return false;
        }

        $currentId = $inviteUserId;
        for ($level = 0; $level < 3; $level++) {
            if (!$currentId) {
                break;
            }
            $inviter = User::find($currentId);
            if (!$inviter || $inviter->banned) {
                return false;
            }
            $currentId = $inviter->invite_user_id;
        }

        return true;
    }

    /**
     * @return array<int, int> level index => share percent
     */
    public static function shareLevels(): array
    {
        if ((int) admin_setting('commission_distribution_enable', 0)) {
            return [
                0 => (int) admin_setting('commission_distribution_l1'),
                1 => (int) admin_setting('commission_distribution_l2'),
                2 => (int) admin_setting('commission_distribution_l3'),
            ];
        }

        return [0 => 100];
    }
}
