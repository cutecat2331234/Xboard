<?php

namespace Plugin\TelegramLogin\Controllers;

use App\Http\Controllers\PluginController;
use App\Models\User;
use App\Services\AuthService;
use App\Services\Plugin\HookManager;
use Illuminate\Http\Request;

class AuthController extends PluginController
{
    public function __construct()
    {
        $this->setPluginCode('telegram_login');
    }

    public function telegramLogin(Request $request)
    {
        if ($error = $this->beforePluginAction()) {
            return $this->fail($error);
        }

        $payload = $request->only([
            'id',
            'first_name',
            'last_name',
            'username',
            'photo_url',
            'auth_date',
            'hash',
        ]);

        if (empty($payload['id']) || empty($payload['hash']) || empty($payload['auth_date'])) {
            return $this->fail([422, __('Invalid Telegram auth payload')]);
        }

        $botToken = (string) $this->getConfig('bot_token', '');
        if ($botToken === '') {
            return $this->fail([400, __('Telegram login is not configured')]);
        }

        $timeout = (int) $this->getConfig('auth_timeout', 300);
        if ($timeout > 0 && (time() - (int) $payload['auth_date']) > $timeout) {
            return $this->fail([400, __('Telegram auth expired, please try again')]);
        }

        if (!$this->verifyTelegramAuth($payload, $botToken)) {
            return $this->fail([400, __('Telegram auth verification failed')]);
        }

        $telegramId = (int) $payload['id'];
        $user = User::where('telegram_id', $telegramId)->first();
        if (!$user) {
            return $this->fail([400, __('Telegram account is not bound. Send /bind to the bot first.')]);
        }

        if ($user->banned) {
            return $this->fail([400, __('Your account has been suspended')]);
        }

        $user->last_login_at = time();
        $user->save();

        HookManager::call('user.login.after', $user);

        $authService = new AuthService($user);

        return $this->success($authService->generateAuthData());
    }

    private function verifyTelegramAuth(array $authData, string $botToken): bool
    {
        $checkHash = (string) ($authData['hash'] ?? '');
        unset($authData['hash']);

        $dataCheckArr = [];
        foreach ($authData as $key => $value) {
            if ($value !== null && $value !== '') {
                $dataCheckArr[] = $key . '=' . $value;
            }
        }
        sort($dataCheckArr);
        $dataCheckString = implode("\n", $dataCheckArr);
        $secretKey = hash('sha256', $botToken, true);
        $hash = hash_hmac('sha256', $dataCheckString, $secretKey);

        return hash_equals($hash, $checkHash);
    }
}
