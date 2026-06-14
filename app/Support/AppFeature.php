<?php

namespace App\Support;

class AppFeature
{
    public static function couponEnabled(): bool
    {
        return (bool) admin_setting('app_enable_coupon_system', 1);
    }

    public static function ticketEnabled(): bool
    {
        return (bool) admin_setting('app_enable_ticket_system', 1);
    }

    public static function commissionEnabled(): bool
    {
        return (bool) admin_setting('app_enable_commission_system', 1);
    }

    public static function inviteEnabled(): bool
    {
        return (bool) admin_setting('app_enable_invite_system', 1);
    }

    public static function registerEnabled(): bool
    {
        if ((int) admin_setting('stop_register', 0)) {
            return false;
        }

        return (bool) admin_setting('app_enable_register', 1);
    }
}
