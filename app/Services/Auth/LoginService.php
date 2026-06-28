<?php

namespace App\Services\Auth;

use App\Models\User;
use App\Services\AuthService;
use App\Services\Plugin\HookManager;
use App\Utils\CacheKey;
use App\Utils\Helper;
use Illuminate\Support\Facades\Cache;

class LoginService
{
    /**
     * 处理用户登录
     *
     * @param string $email 用户邮箱
     * @param string $password 用户密码
     * @return array [成功状态, 用户对象或错误信息]
     */
    public function login(string $email, string $password, ?string $clientIp = null): array
    {
        // 检查密码错误限制
        if ((int) admin_setting('password_limit_enable', true)) {
            $passwordErrorCount = (int) Cache::get(CacheKey::get('PASSWORD_ERROR_LIMIT', $email), 0);
            if ($passwordErrorCount >= (int) admin_setting('password_limit_count', 5)) {
                return [
                    false,
                    [
                        429,
                        __('There are too many password errors, please try again after :minute minutes.', [
                            'minute' => admin_setting('password_limit_expire', 60)
                        ])
                    ]
                ];
            }
        }

        // 查找用户
        $user = User::byEmail($email)->first();
        if (!$user) {
            // 统计失败尝试，避免非存在邮箱路径绕过限流/形成枚举侧信道
            $this->recordFailedAttempt($email, $clientIp);
            return [false, [400, __('Incorrect email or password')]];
        }

        // 验证密码
        if (
            !Helper::multiPasswordVerify(
                $user->password_algo,
                $user->password_salt,
                $password,
                $user->password
            )
        ) {
            // 增加密码错误计数
            $this->recordFailedAttempt($email, $clientIp);
            return [false, [400, __('Incorrect email or password')]];
        }

        // 检查账户状态
        if ($user->banned) {
            return [false, [400, __('Your account has been suspended')]];
        }

        // 更新最后登录时间
        $user->last_login_at = time();
        $user->save();

        if ((int) admin_setting('password_limit_enable', true)) {
            Cache::forget(CacheKey::get('PASSWORD_ERROR_LIMIT', $email));
        }

        HookManager::call('user.login.after', $user);
        return [true, $user];
    }

    /**
     * 记录一次失败的登录尝试（按邮箱计数 + 按 IP 限流），
     * 在"邮箱不存在"和"密码错误"两条路径上一致执行，
     * 避免攻击者用不存在的邮箱无限重试绕过 IP 限流，并消除枚举侧信道。
     */
    private function recordFailedAttempt(string $email, ?string $clientIp): void
    {
        if ((int) admin_setting('password_limit_enable', true)) {
            $passwordErrorCount = (int) Cache::get(CacheKey::get('PASSWORD_ERROR_LIMIT', $email), 0);
            Cache::put(
                CacheKey::get('PASSWORD_ERROR_LIMIT', $email),
                $passwordErrorCount + 1,
                60 * (int) admin_setting('password_limit_expire', 60)
            );
        }
        if ($clientIp) {
            \Illuminate\Support\Facades\RateLimiter::hit('login-ip:' . $clientIp, 60);
        }
    }

    /**
     * 处理密码重置
     *
     * @param string $email 用户邮箱
     * @param string $emailCode 邮箱验证码
     * @param string $password 新密码
     * @return array [成功状态, 结果或错误信息]
     */
    public function resetPassword(string $email, string $emailCode, string $password): array
    {
        // 检查重置请求限制
        $forgetRequestLimitKey = CacheKey::get('FORGET_REQUEST_LIMIT', $email);
        $forgetRequestLimit = (int) Cache::get($forgetRequestLimitKey);
        if ($forgetRequestLimit >= 3) {
            return [false, [429, __('Reset failed, Please try again later')]];
        }

        // 验证邮箱验证码
        $cachedEmailCode = Cache::get(CacheKey::get('EMAIL_VERIFY_CODE_FORGET', $email));
        if ($cachedEmailCode === null || !hash_equals((string) $cachedEmailCode, $emailCode)) {
            Cache::put($forgetRequestLimitKey, $forgetRequestLimit ? $forgetRequestLimit + 1 : 1, 300);
            return [false, [400, __('Incorrect email verification code')]];
        }

        // 查找用户
        $user = User::byEmail($email)->first();
        if (!$user) {
            return [false, [400, __('This email is not registered in the system')]];
        }

        // 更新密码
        $user->password = password_hash($password, PASSWORD_DEFAULT);
        $user->password_algo = NULL;
        $user->password_salt = NULL;

        if (!$user->save()) {
            return [false, [500, __('Reset failed')]];
        }

        (new AuthService($user))->removeAllSessions();

        HookManager::call('user.password.reset.after', $user);

        // 清除邮箱验证码
        Cache::forget(CacheKey::get('EMAIL_VERIFY_CODE_FORGET', $email));

        return [true, true];
    }


    /**
     * 生成临时登录令牌和快速登录URL
     *
     * @param User $user 用户对象
     * @param string $redirect 重定向路径
     * @return string|null 快速登录URL
     */
    public function generateQuickLoginUrl(User $user, ?string $redirect = null): ?string
    {
        if (!$user || !$user->exists) {
            return null;
        }

        $code = Helper::guid();
        $key = CacheKey::get('TEMP_TOKEN', $code);

        Cache::put($key, $user->id, 60);

        $redirect = Helper::sanitizeAppRedirect($redirect);
        $loginRedirect = '/#/login?verify=' . $code . '&redirect=' . rawurlencode($redirect);

        if (admin_setting('app_url')) {
            $url = admin_setting('app_url') . $loginRedirect;
        } else {
            $url = url($loginRedirect);
        }

        return $url;
    }
}