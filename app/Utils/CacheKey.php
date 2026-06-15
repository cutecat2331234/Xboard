<?php

namespace App\Utils;

class CacheKey
{
    // 核心缓存键定义
    const CORE_KEYS = [
        'EMAIL_VERIFY_CODE' => '邮箱验证码',
        'EMAIL_VERIFY_CODE_REGISTER' => '注册邮箱验证码',
        'EMAIL_VERIFY_CODE_FORGET' => '找回密码邮箱验证码',
        'LAST_SEND_EMAIL_VERIFY_TIMESTAMP' => '最后一次发送邮箱验证码时间',
        'TEMP_TOKEN' => '临时令牌',
        'LAST_SEND_EMAIL_REMIND_TRAFFIC' => '最后发送流量邮件提醒',
        'LAST_SEND_EMAIL_REMIND_EXPIRE' => '最后发送过期邮件提醒',
        'SERVER_OFFLINE_ALERT' => '节点掉线告警',
        'INVITE_PV_RATE' => '邀请PV频率限制',
        'SCHEDULE_LAST_CHECK_AT' => '计划任务最后检查时间',
        'REGISTER_IP_RATE_LIMIT' => '注册频率限制',
        'TRY_OUT_IP_LIMIT' => '试用套餐IP限制',
        'LAST_SEND_LOGIN_WITH_MAIL_LINK_TIMESTAMP' => '最后一次发送登入链接时间',
        'PASSWORD_ERROR_LIMIT' => '密码错误次数限制',
        'USER_SESSIONS' => '用户session',
        'FORGET_REQUEST_LIMIT' => '找回密码次数限制',
        'PAYMENT_ORPHAN_CREDIT' => '支付孤儿入账幂等',
        'ORDER_CHECKOUT' => '订单结账进行中',
    ];

    // 允许的缓存键模式（支持通配符）
    const ALLOWED_PATTERNS = [
        'SERVER_*_ONLINE_USER',        // 节点在线用户
        'MULTI_SERVER_*_ONLINE_USER',  // 多服务器在线用户
        'SERVER_*_LAST_CHECK_AT',      // 节点最后检查时间
        'SERVER_*_LAST_PUSH_AT',       // 节点最后推送时间
        'SERVER_*_LOAD_STATUS',        // 节点负载状态
        'SERVER_*_LAST_LOAD_AT',       // 节点最后负载提交时间
        'SERVER_*_METRICS',            // 节点指标数据
        'USER_ONLINE_CONN_*_*',        // 用户在线连接数 (特定节点类型_ID)
    ];

    /**
     * 生成缓存键
     */
    public static function get(string $key, mixed $uniqueValue = null): string
    {
        // 检查是否为核心键
        if (array_key_exists($key, self::CORE_KEYS)) {
            return $uniqueValue ? $key . '_' . $uniqueValue : $key;
        }

        // 检查是否匹配允许的模式
        if (self::matchesPattern($key)) {
            return $uniqueValue ? $key . '_' . $uniqueValue : $key;
        }

        // 开发环境下记录警告，生产环境允许通过
        if (app()->environment('local', 'development')) {
            logger()->warning("Unknown cache key used: {$key}");
        }

        return $uniqueValue ? $key . '_' . $uniqueValue : $key;
    }

    /**
     * 检查键名是否匹配允许的模式
     */
    private static function matchesPattern(string $key): bool
    {
        foreach (self::ALLOWED_PATTERNS as $pattern) {
            $regex = '/^' . str_replace('*', '[A-Za-z0-9_]+', $pattern) . '$/';
            if (preg_match($regex, $key)) {
                return true;
            }
        }
        return false;
    }
}
