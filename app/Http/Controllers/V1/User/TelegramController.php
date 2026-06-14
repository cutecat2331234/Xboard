<?php

namespace App\Http\Controllers\V1\User;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\TelegramService;
use Illuminate\Http\Request;

class TelegramController extends Controller
{
    public function getBotInfo()
    {
        $telegramService = new TelegramService();
        $response = $telegramService->getMe();
        $data = [
            'username' => $response->result->username
        ];
        return $this->success($data);
    }

    public function unbind(Request $request)
    {
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
