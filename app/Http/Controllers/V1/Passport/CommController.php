<?php

namespace App\Http\Controllers\V1\Passport;

use App\Http\Controllers\Controller;
use App\Http\Requests\Passport\CommSendEmailVerify;
use App\Jobs\SendEmailJob;
use App\Models\InviteCode;
use App\Models\User;
use App\Services\CaptchaService;
use App\Utils\CacheKey;
use App\Utils\Helper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\RateLimiter;

class CommController extends Controller
{

    public function sendEmailVerify(CommSendEmailVerify $request)
    {
                // 验证人机验证码
        $captchaService = app(CaptchaService::class);
        [$captchaValid, $captchaError] = $captchaService->verify($request);
        if (!$captchaValid) {
            return $this->fail($captchaError);
        }

        $email = $request->input('email');
        $purpose = $request->input('purpose', 'register');
        if (!in_array($purpose, ['register', 'forget'], true)) {
            return $this->fail([422, __('Invalid parameter')]);
        }

        $ipKey = 'send-email-verify:' . $request->ip();
        if (RateLimiter::tooManyAttempts($ipKey, 30)) {
            return $this->fail([429, __('Sending frequently, please try again later')]);
        }
        RateLimiter::hit($ipKey, 3600);

        $codeKey = $purpose === 'forget'
            ? CacheKey::get('EMAIL_VERIFY_CODE_FORGET', $email)
            : CacheKey::get('EMAIL_VERIFY_CODE_REGISTER', $email);
        if ((int) admin_setting('email_whitelist_enable', 0)) {
            $isRegisteredEmail = User::byEmail($email)->exists();
            if (!$isRegisteredEmail) {
                $allowedSuffixes = Helper::getEmailSuffix();
                $emailSuffix = substr(strrchr($email, '@'), 1);

                if (!in_array($emailSuffix, $allowedSuffixes)) {
                    return $this->fail([400, __('Email suffix is not in whitelist')]);
                }
            }
        }

        if (Cache::get(CacheKey::get('LAST_SEND_EMAIL_VERIFY_TIMESTAMP', $email))) {
            return $this->fail([400, __('Email verification code has been sent, please request again later')]);
        }
        $code = random_int(100000, 999999);
        $subject = admin_setting('app_name', 'XBoard') . __('Email verification code');

        SendEmailJob::dispatch([
            'email' => $email,
            'subject' => $subject,
            'template_name' => 'verify',
            'template_value' => [
                'name' => admin_setting('app_name', 'XBoard'),
                'code' => $code,
                'url' => admin_setting('app_url')
            ]
        ]);

        Cache::put($codeKey, $code, 300);
        Cache::put(CacheKey::get('LAST_SEND_EMAIL_VERIFY_TIMESTAMP', $email), time(), 60);
        return $this->success(true);
    }

    public function pv(Request $request)
    {
        $code = trim((string) $request->input('invite_code', ''));
        if ($code === '') {
            return $this->success(true);
        }

        $ip = (string) $request->ip();
        $rateKey = CacheKey::get('INVITE_PV_RATE', md5($ip . ':' . $code));
        if (Cache::get($rateKey)) {
            return $this->success(true);
        }
        Cache::put($rateKey, 1, 300);

        if (!InviteCode::where('code', $code)->exists()) {
            return $this->success(true);
        }

        InviteCode::where('code', $code)->increment('pv');

        return $this->success(true);
    }

}
