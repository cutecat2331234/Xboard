<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class ConfigSave extends FormRequest
{
    const RULES = [
        // invite & commission
        'invite_force' => '',
        'invite_commission' => 'nullable|integer|min:0|max:100',
        'invite_gen_limit' => 'integer|nullable',
        'invite_never_expire' => '',
        'invite_code_max_uses' => 'nullable|integer|min:0|max:10000',
        'withdraw_ticket_stale_days' => 'nullable|integer|min:1|max:90',
        'commission_first_time_enable' => '',
        'commission_auto_check_enable' => '',
        'commission_withdraw_limit' => 'nullable|numeric|min:0',
        'commission_withdraw_method' => 'nullable|array',
        'withdraw_close_enable' => '',
        'commission_distribution_enable' => '',
        'commission_distribution_l1' => 'nullable|numeric|min:0|max:100',
        'commission_distribution_l2' => 'nullable|numeric|min:0|max:100',
        'commission_distribution_l3' => 'nullable|numeric|min:0|max:100',
        'app_withdraw_fee_rate' => 'nullable|numeric|min:0|max:1',
        // site
        'logo' => 'nullable|url',
        'force_https' => '',
        'stop_register' => '',
        'app_name' => '',
        'app_description' => '',
        'app_url' => 'nullable|url',
        'subscribe_url' => 'nullable',
        'try_out_plan_id' => 'integer',
        'try_out_hour' => 'numeric',
        'try_out_enable' => 'boolean',
        'login_with_mail_link_enable' => 'boolean',
        'tos_url' => 'nullable|url',
        'currency' => '',
        'currency_symbol' => '',
        'ticket_must_wait_reply' => '',
        'traffic_warn_rate' => 'integer|min:1|max:100',
        'app_enable_register' => 'boolean',
        'app_enable_coupon_system' => 'boolean',
        'app_enable_ticket_system' => 'boolean',
        'app_enable_commission_system' => 'boolean',
        'app_enable_invite_system' => 'boolean',
        'app_enable_gift_card' => 'boolean',
        'app_enable_traffic_log' => 'boolean',
        'app_enable_knowledge_base' => 'boolean',
        'app_enable_announcements' => 'boolean',
        // subscribe
        'plan_change_enable' => '',
        'reset_traffic_method' => 'in:0,1,2,3,4',
        'surplus_enable' => '',
        'surplus_traffic_ratio_enable' => '',
        'new_order_event_id' => 'in:0,1',
        'renew_order_event_id' => 'in:0,1',
        'change_order_event_id' => 'in:0,1',
        'show_info_to_server_enable' => '',
        'show_protocol_to_server_enable' => '',
        'subscribe_path' => '',
        // server
        'server_token' => 'nullable|min:16',
        'server_pull_interval' => 'integer',
        'server_push_interval' => 'integer',
        'device_limit_mode' => 'integer',
        'server_ws_enable' => 'boolean',
        'server_ws_url' => 'nullable|url',
        // frontend
        'frontend_theme' => '',
        'frontend_theme_sidebar' => 'nullable|in:dark,light',
        'frontend_theme_header' => 'nullable|in:dark,light',
        'frontend_theme_color' => 'nullable|in:default,darkblue,black,green',
        'frontend_background_url' => 'nullable|url',
        // email
        'email_host' => '',
        'email_port' => '',
        'email_username' => '',
        'email_password' => '',
        'email_encryption' => '',
        'email_from_address' => '',
        'remind_mail_enable' => '',
        // telegram
        'telegram_bot_enable' => '',
        'telegram_bot_token' => '',
        'telegram_webhook_url' => 'nullable|url',
        'telegram_discuss_id' => '',
        'telegram_channel_id' => '',
        'telegram_discuss_link' => 'nullable|url',
        // app
        'windows_version' => '',
        'windows_download_url' => '',
        'macos_version' => '',
        'macos_download_url' => '',
        'android_version' => '',
        'android_download_url' => '',
        // safe
        'email_whitelist_enable' => 'boolean',
        'email_whitelist_suffix' => 'nullable|array',
        'email_gmail_limit_enable' => 'boolean',
        'captcha_enable' => 'boolean',
        'captcha_type' => 'in:recaptcha,turnstile,recaptcha-v3',
        'recaptcha_enable' => 'boolean',
        'recaptcha_key' => '',
        'recaptcha_site_key' => '',
        'recaptcha_v3_secret_key' => '',
        'recaptcha_v3_site_key' => '',
        'recaptcha_v3_score_threshold' => 'numeric|min:0|max:1',
        'turnstile_secret_key' => '',
        'turnstile_site_key' => '',
        'email_verify' => 'bool',
        'safe_mode_enable' => 'boolean',
        'register_limit_by_ip_enable' => 'boolean',
        'register_limit_count' => 'integer',
        'register_limit_expire' => 'integer',
        'secure_path' => 'min:8|regex:/^[\w-]*$/',
        'password_limit_enable' => 'boolean',
        'password_limit_count' => 'integer',
        'password_limit_expire' => 'integer',
        'default_remind_expire' => 'boolean',
        'default_remind_traffic' => 'boolean',
        'subscribe_template_singbox' => 'nullable',
        'subscribe_template_clash' => 'nullable',
        'subscribe_template_clashmeta' => 'nullable',
        'subscribe_template_stash' => 'nullable',
        'subscribe_template_surge' => 'nullable',
        'subscribe_template_surfboard' => 'nullable'
    ];
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {
        return self::RULES;
    }

    public function messages()
    {
        return [
            'app_url.url' => __('Site URL must include http(s)://'),
            'subscribe_url.url' => __('Subscribe URL must include http(s)://'),
            'server_token.min' => __('Server token must be at least 16 characters'),
            'tos_url.url' => __('Terms of service URL must include http(s)://'),
            'telegram_webhook_url.url' => __('Telegram webhook URL must include http(s)://'),
            'telegram_discuss_link.url' => __('Telegram group link must be a valid URL with http(s)://'),
            'logo.url' => __('Logo URL must include http(s)://'),
            'secure_path.min' => __('Secure admin path must be at least 8 characters'),
            'secure_path.regex' => __('Secure admin path may only contain letters and numbers'),
            'captcha_type.in' => __('Captcha type must be recaptcha, turnstile, or recaptcha-v3'),
            'recaptcha_v3_score_threshold.numeric' => __('reCAPTCHA v3 score threshold must be numeric'),
            'recaptcha_v3_score_threshold.min' => __('reCAPTCHA v3 score threshold cannot be less than 0'),
            'recaptcha_v3_score_threshold.max' => __('reCAPTCHA v3 score threshold cannot be greater than 1'),
        ];
    }
}
