<?php

namespace App\Http\Controllers\V1\Passport;

use App\Helpers\ResponseEnum;
use App\Http\Controllers\Controller;
use App\Http\Requests\Passport\AuthForget;
use App\Http\Requests\Passport\AuthLogin;
use App\Http\Requests\Passport\AuthMailLink;
use App\Http\Requests\Passport\AuthRegister;
use App\Services\Auth\LoginService;
use App\Services\Auth\MailLinkService;
use App\Services\Auth\RegisterService;
use App\Services\AuthService;
use App\Services\Plugin\HookManager;
use App\Services\CaptchaService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

class AuthController extends Controller
{
    protected MailLinkService $mailLinkService;
    protected RegisterService $registerService;
    protected LoginService $loginService;

    public function __construct(
        MailLinkService $mailLinkService,
        RegisterService $registerService,
        LoginService $loginService
    ) {
        $this->mailLinkService = $mailLinkService;
        $this->registerService = $registerService;
        $this->loginService = $loginService;
    }

    /**
     * 通过邮件链接登录
     */
    public function loginWithMailLink(AuthMailLink $request)
    {
        $captchaService = app(CaptchaService::class);
        [$captchaValid, $captchaError] = $captchaService->verify($request);
        if (!$captchaValid) {
            return $this->fail($captchaError);
        }

        $rateKey = 'mail-link:' . $request->ip();
        if (RateLimiter::tooManyAttempts($rateKey, 10)) {
            return $this->fail([429, __('Too many attempts')]);
        }
        RateLimiter::hit($rateKey, 60);

        [$success, $result] = $this->mailLinkService->handleMailLink(
            $request->input('email'),
            $request->input('redirect')
        );

        if (!$success) {
            return $this->fail($result);
        }

        return $this->success($result);
    }

    /**
     * 用户注册
     */
    public function register(AuthRegister $request)
    {
        [$success, $result] = $this->registerService->register($request);

        if (!$success) {
            return $this->fail($result);
        }

        $authService = new AuthService($result);
        return $this->success($authService->generateAuthData());
    }

    /**
     * 用户登录
     */
    public function login(AuthLogin $request)
    {
        $captchaService = app(CaptchaService::class);
        [$captchaValid, $captchaError] = $captchaService->verify($request);
        if (!$captchaValid) {
            return $this->fail($captchaError);
        }

        $email = $request->input('email');
        $password = $request->input('password');

        $loginIpKey = 'login-ip:' . $request->ip();
        if (RateLimiter::tooManyAttempts($loginIpKey, 60)) {
            return $this->fail([429, __('Too many attempts')]);
        }

        [$success, $result] = $this->loginService->login($email, $password, $request->ip());

        if (!$success) {
            return $this->fail($result);
        }

        $authService = new AuthService($result);
        return $this->success($authService->generateAuthData());
    }

    /**
     * 通过token登录
     */
    public function token2Login(Request $request)
    {
        // 处理直接通过token重定向
        if ($token = $request->input('token')) {
            $rateKey = 'token2login-redirect:' . $request->ip();
            if (RateLimiter::tooManyAttempts($rateKey, 60)) {
                return $this->fail([429, __('Too many attempts')]);
            }
            RateLimiter::hit($rateKey, 60);

            $safeRedirect = rawurlencode(\App\Utils\Helper::sanitizeAppRedirect($request->input('redirect')));
            $redirect = '/#/login?verify=' . $token . '&redirect=' . $safeRedirect;

            return redirect()->to(
                admin_setting('app_url')
                ? admin_setting('app_url') . $redirect
                : url($redirect)
            );
        }

        // 处理通过验证码登录
        if ($verify = $request->input('verify')) {
            $rateKey = 'token2login:' . $request->ip();
            if (RateLimiter::tooManyAttempts($rateKey, 30)) {
                return $this->fail([429, __('Too many attempts')]);
            }
            RateLimiter::hit($rateKey, 60);

            $userId = $this->mailLinkService->handleTokenLogin($verify);

            if (!$userId) {
                return $this->fail([400, __('Token error')]);
            }

            $user = \App\Models\User::find($userId);

            if (!$user) {
                return $this->fail([400, __('User not found')]);
            }

            $user->last_login_at = time();
            $user->save();

            HookManager::call('user.login.after', $user);

            $authService = new AuthService($user);

            return response()->json([
                'data' => $authService->generateAuthData()
            ]);
        }

        return $this->fail([400, __('Invalid request')]);
    }

    /**
     * 获取快速登录URL
     */
    public function getQuickLoginUrl(Request $request)
    {
        $authorization = $request->input('auth_data') ?? $request->header('authorization');

        if (!$authorization) {
            return $this->fail(ResponseEnum::CLIENT_HTTP_UNAUTHORIZED);
        }

        $user = AuthService::findUserByBearerToken($authorization);

        if (!$user) {
            return $this->fail(ResponseEnum::CLIENT_HTTP_UNAUTHORIZED_EXPIRED);
        }

        $rateKey = 'passport-quick-login:' . $user->id;
        if (RateLimiter::tooManyAttempts($rateKey, 5)) {
            return $this->fail([429, __('Request failed, please try again later')]);
        }
        RateLimiter::hit($rateKey, 60);

        $url = $this->loginService->generateQuickLoginUrl($user, $request->input('redirect'));
        return $this->success($url);
    }

    /**
     * 忘记密码处理
     */
    public function forget(AuthForget $request)
    {
        $captchaService = app(CaptchaService::class);
        [$captchaValid, $captchaError] = $captchaService->verify($request);
        if (!$captchaValid) {
            return $this->fail($captchaError);
        }

        [$success, $result] = $this->loginService->resetPassword(
            $request->input('email'),
            $request->input('email_code'),
            $request->input('password')
        );

        if (!$success) {
            return $this->fail($result);
        }

        return $this->success(true);
    }

    /**
     * Telegram Login Widget (requires TelegramLogin plugin).
     */
    public function telegramLogin(Request $request)
    {
        if (!class_exists(\Plugin\TelegramLogin\Controllers\AuthController::class)) {
            return $this->fail([400, __('Telegram login is not available')]);
        }

        return app(\Plugin\TelegramLogin\Controllers\AuthController::class)->telegramLogin($request);
    }
}
