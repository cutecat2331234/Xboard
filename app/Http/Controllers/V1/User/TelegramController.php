<?php

namespace App\Http\Controllers\V1\User;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\AppFeature;
use App\Services\TelegramService;
use Illuminate\Http\Request;

class TelegramController extends Controller
{
    private function ensureTelegramEnabled()
    {
        if (!(int) admin_setting('telegram_bot_enable', 0)) {
            return $this->fail([403, __('Feature is disabled')]);
        }
        return null;
    }

    public function getBotInfo()
    {
        if ($denied = $this->ensureTelegramEnabled()) {
            return $denied;
        }
        $telegramService = new TelegramService();
        $response = $telegramService->getMe();
        $data = [
            'username' => $response->result->username
        ];
        return $this->success($data);
    }

    public function unbind(Request $request)
    {
        if ($denied = $this->ensureTelegramEnabled()) {
            return $denied;
        }
        $user = User::find($request->user()->id);
        if (!$user) {
            return $this->fail([404, __('User not found')]);
        }

        if (!$user->telegram_id) {
            return $this->fail([400, __('Telegram account is not bound')]);
        }

        $user->telegram_id = null;
        if (!$user->save()) {
            return $this->fail([500, __('Failed to unbind Telegram account')]);
        }

        return $this->success(true);
    }
}
