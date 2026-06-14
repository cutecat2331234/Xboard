<?php

namespace Plugin\TelegramLogin;

use App\Services\Plugin\AbstractPlugin;

class Plugin extends AbstractPlugin
{
    public function boot(): void
    {
        $this->filter('guest_comm_config', function (array $config) {
            if (!$this->getConfig('bot_token') || !$this->getConfig('bot_username')) {
                return $config;
            }

            $config['telegram_login_enable'] = 1;
            $config['telegram_bot_username'] = $this->getConfig('bot_username', '');
            $config['telegram_login_domain'] = $this->getConfig('domain', '');

            return $config;
        });
    }
}
