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

    public static function giftCardEnabled(): bool
    {
        return (bool) admin_setting('app_enable_gift_card', 1);
    }

    public static function registerEnabled(): bool
    {
        if ((int) admin_setting('stop_register', 0)) {
            return false;
        }

        return (bool) admin_setting('app_enable_register', 1);
    }

    public static function knowledgeEnabled(): bool
    {
        return (bool) admin_setting('app_enable_knowledge_base', 1);
    }

    public static function trafficLogEnabled(): bool
    {
        return (bool) admin_setting('app_enable_traffic_log', 1);
    }

    public static function announcementsEnabled(): bool
    {
        return (bool) admin_setting('app_enable_announcements', 1);
    }
}
