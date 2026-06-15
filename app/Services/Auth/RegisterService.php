<?php

namespace App\Services\Auth;

use App\Exceptions\ApiException;
use App\Models\InviteCode;
use App\Models\Plan;
use App\Models\User;
use App\Services\CaptchaService;
use App\Services\Plugin\HookManager;
use App\Services\UserService;
use App\Support\AppFeature;
use App\Utils\CacheKey;
use App\Utils\Dict;
use App\Utils\Helper;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class RegisterService
{
    /**
     * 验证用户注册请求
     *
     * @param Request $request 请求对象
     * @return array [是否通过, 错误消息]
     */
    public function validateRegister(Request $request): array
    {
        // 检查IP注册限制
        if ((int) admin_setting('register_limit_by_ip_enable', 0)) {
            $registerCountByIP = Cache::get(CacheKey::get('REGISTER_IP_RATE_LIMIT', $request->ip())) ?? 0;
            if ((int) $registerCountByIP >= (int) admin_setting('register_limit_count', 3)) {
                return [
                    false,
                    [
                        429,
                        __('Register frequently, please try again after :minute minute', [
                            'minute' => admin_setting('register_limit_expire', 60)
                        ])
                    ]
                ];
            }
        }

        // 检查验证码
        $captchaService = app(CaptchaService::class);
        [$captchaValid, $captchaError] = $captchaService->verify($request);
        if (!$captchaValid) {
            return [false, $captchaError];
        }

        // 检查邮箱白名单
        if ((int) admin_setting('email_whitelist_enable', 0)) {
            if (
                !Helper::emailSuffixVerify(
                    $request->input('email'),
                    admin_setting('email_whitelist_suffix', Dict::EMAIL_WHITELIST_SUFFIX_DEFAULT)
                )
            ) {
                return [false, [400, __('Email suffix is not in the Whitelist')]];
            }
        }

        // 检查Gmail限制
        if ((int) admin_setting('email_gmail_limit_enable', 0)) {
            $prefix = explode('@', $request->input('email'))[0];
            if (strpos($prefix, '.') !== false || strpos($prefix, '+') !== false) {
                return [false, [400, __('Gmail alias is not supported')]];
            }
        }

        // 检查是否关闭注册
        if (!\App\Support\AppFeature::registerEnabled()) {
            return [false, [400, __('Registration has closed')]];
        }

        // 检查邀请码要求
        if (!AppFeature::inviteEnabled() && $request->filled('invite_code')) {
            return [false, [400, __('Invalid invitation code')]];
        }

        if ($request->filled('invite_code') && AppFeature::inviteEnabled()) {
            $inviteCodeModel = InviteCode::where('code', $request->input('invite_code'))
                ->where('status', InviteCode::STATUS_UNUSED)
                ->first();
            if (!$inviteCodeModel) {
                return [false, [400, __('Invalid invitation code')]];
            }
            $inviter = User::find($inviteCodeModel->user_id);
            if (!$inviter || $inviter->banned) {
                return [false, [400, __('Invalid invitation code')]];
            }
        }

        if ((int) admin_setting('invite_force', 0) && AppFeature::inviteEnabled()) {
            if (empty($request->input('invite_code'))) {
                return [false, [422, __('You must use the invitation code to register')]];
            }
        }

        // 检查邮箱验证
        if ((int) admin_setting('email_verify', 0)) {
            $emailCode = $request->input('email_code');
            if (!is_scalar($emailCode) || !preg_match('/^\d{6}$/', (string) $emailCode)) {
                return [false, [422, __('Email verification code cannot be empty')]];
            }

            $cachedEmailCode = Cache::get(CacheKey::get('EMAIL_VERIFY_CODE_REGISTER', $request->input('email')));
            if ($cachedEmailCode === null || !hash_equals((string) $cachedEmailCode, (string) $emailCode)) {
                return [false, [400, __('Incorrect email verification code')]];
            }
        }

        // 检查邮箱是否存在
        $exist = User::byEmail($request->input('email'))->first();
        if ($exist) {
            return [false, [400201, __('Email already exists')]];
        }

        return [true, null];
    }

    /**
     * 处理邀请码
     *
     * @param string $inviteCode 邀请码
     * @return int|null 邀请人ID
     */
    public function handleInviteCode(string $inviteCode): int|null
    {
        if (!AppFeature::inviteEnabled()) {
            throw new ApiException(__('Invalid invitation code'));
        }

        $inviteCodeModel = InviteCode::where('code', $inviteCode)
            ->where('status', InviteCode::STATUS_UNUSED)
            ->lockForUpdate()
            ->first();

        if (!$inviteCodeModel) {
            throw new ApiException(__('Invalid invitation code'));
        }

        $inviter = User::find($inviteCodeModel->user_id);
        if (!$inviter || $inviter->banned) {
            throw new ApiException(__('Invalid invitation code'));
        }

        if (!(int) admin_setting('invite_never_expire', 0)) {
            $inviteCodeModel->status = InviteCode::STATUS_USED;
            $inviteCodeModel->save();
        } else {
            $maxUses = (int) admin_setting('invite_code_max_uses', 0);
            if ($maxUses > 0 && (int) $inviteCodeModel->use_count >= $maxUses) {
                throw new ApiException(__('Invalid invitation code'));
            }
            $inviteCodeModel->increment('use_count');
        }

        return $inviteCodeModel->user_id;
    }



    /**
     * 注册用户
     *
     * @param Request $request 请求对象
     * @return array [成功状态, 用户对象或错误信息]
     */
    public function register(Request $request): array
    {
        // 验证注册数据
        [$valid, $error] = $this->validateRegister($request);
        if (!$valid) {
            return [false, $error];
        }

        $email = $request->input('email');
        $password = $request->input('password');
        $inviteCode = $request->input('invite_code');

        try {
            [$ok, $result] = DB::transaction(function () use ($request, $email, $password, $inviteCode) {
                HookManager::call('user.register.before', $request);

                if (User::byEmail($email)->lockForUpdate()->exists()) {
                    throw new ApiException(__('Email already exists'), 400201);
                }

                $inviteUserId = null;
                if ($inviteCode) {
                    $inviteUserId = $this->handleInviteCode($inviteCode);
                }

                if ((int) admin_setting('register_limit_by_ip_enable', 0)) {
                    $this->assertRegisterIpAllowed($request->ip());
                }

                $userService = app(UserService::class);
                $user = $userService->createUser([
                    'email' => $email,
                    'password' => $password,
                    'invite_user_id' => $inviteUserId,
                    'register_ip' => $request->ip(),
                ]);

                if (!$user->save()) {
                    throw new \RuntimeException(__('Register failed'));
                }

                HookManager::call('user.register.after', $user);

                if ((int) admin_setting('email_verify', 0)) {
                    Cache::forget(CacheKey::get('EMAIL_VERIFY_CODE_REGISTER', $email));
                }

                $user->last_login_at = time();
                $user->save();

                return [true, $user];
            });
        } catch (ApiException $e) {
            $this->releaseRegisterIpSlot($request->ip());
            $code = (int) $e->getCode();
            return [false, [$code > 0 ? $code : 400, $e->getMessage()]];
        } catch (\Throwable $e) {
            $this->releaseRegisterIpSlot($request->ip());
            return [false, [500, __('Register failed')]];
        }

        if (!$ok) {
            $this->releaseRegisterIpSlot($request->ip());
        } elseif ((int) admin_setting('register_limit_by_ip_enable', 0)) {
            $this->recordRegisterIpHit($request->ip());
        }

        return [$ok, $result];
    }

    /**
     * Atomically reserve a registration slot for this IP inside the register transaction.
     */
    private function assertRegisterIpAllowed(string $ip): void
    {
        $key = CacheKey::get('REGISTER_IP_RATE_LIMIT', $ip);
        $limit = (int) admin_setting('register_limit_count', 3);
        $expireSeconds = (int) admin_setting('register_limit_expire', 60) * 60;

        if (!Cache::has($key)) {
            Cache::add($key, 0, $expireSeconds);
        }
        $count = (int) Cache::increment($key);
        if ($count > $limit) {
            Cache::decrement($key);
            throw new ApiException(
                __('Register frequently, please try again after :minute minute', [
                    'minute' => admin_setting('register_limit_expire', 60),
                ]),
                429
            );
        }
    }

    /**
     * Release a reserved registration slot when the transaction fails after increment.
     */
    private function releaseRegisterIpSlot(string $ip): void
    {
        if (!(int) admin_setting('register_limit_by_ip_enable', 0)) {
            return;
        }
        $key = CacheKey::get('REGISTER_IP_RATE_LIMIT', $ip);
        if (!Cache::has($key)) {
            return;
        }
        $count = (int) Cache::get($key, 0);
        if ($count > 0) {
            Cache::put(
                $key,
                $count - 1,
                (int) admin_setting('register_limit_expire', 60) * 60
            );
        }
    }

    /**
     * Extend TTL after successful registration (increment already counted in assertRegisterIpAllowed).
     */
    private function recordRegisterIpHit(string $ip): void
    {
        $key = CacheKey::get('REGISTER_IP_RATE_LIMIT', $ip);
        $expireSeconds = (int) admin_setting('register_limit_expire', 60) * 60;
        if (Cache::has($key)) {
            Cache::put($key, (int) Cache::get($key, 1), $expireSeconds);
        }
    }
}