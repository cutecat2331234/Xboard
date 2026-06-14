<?php

namespace App\Support;

use App\Models\User;

class InviteChain
{
    /**
     * @throws \InvalidArgumentException
     */
    public static function assertValid(int $userId, ?int $inviteUserId): void
    {
        if (!$inviteUserId) {
            return;
        }
        if ((int) $inviteUserId === $userId) {
            throw new \InvalidArgumentException(__('Cannot set yourself as inviter'));
        }

        $visited = [$userId];
        $current = (int) $inviteUserId;
        $depth = 0;
        while ($current && $depth < 20) {
            if (in_array($current, $visited, true)) {
                throw new \InvalidArgumentException(__('Invite chain cycle detected'));
            }
            $visited[] = $current;
            $current = (int) User::where('id', $current)->value('invite_user_id');
            $depth++;
        }
    }
}
