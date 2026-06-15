<?php
namespace App\Http\Routes\V2;

use App\Http\Controllers\V1\Server\ShadowsocksTidalabController;
use App\Http\Controllers\V1\Server\TrojanTidalabController;
use App\Http\Controllers\V1\Server\UniProxyController;
use App\Http\Controllers\V2\Server\ServerController;
use App\Http\Controllers\V2\Server\MachineController;
use Illuminate\Contracts\Routing\Registrar;

class ServerRoute
{
    public function map(Registrar $router)
    {
        $router->group([
            'prefix' => 'server',
            'middleware' => 'server.v2'
        ], function ($route) {
            $route->match(['GET', 'POST'], 'handshake', [ServerController::class, 'handshake']);
            $route->post('report', [ServerController::class, 'report']);
            $route->get('config', [UniProxyController::class, 'config']);
            $route->get('user', [UniProxyController::class, 'user']);
            $route->post('push', [UniProxyController::class, 'push']);
            $route->post('alive', [UniProxyController::class, 'alive']);
            $route->get('alivelist', [UniProxyController::class, 'alivelist']);
            $route->post('status', [UniProxyController::class, 'status']);
        });

        $router->group([
            'prefix' => 'server/machine',
        ], function ($route) {
            $route->post('nodes', [MachineController::class, 'nodes']);
            $route->post('status', [MachineController::class, 'status']);
        });

        // Legacy Tidalab node endpoints (parity with V1 ServerRoute).
        $router->group([
            'prefix' => 'server',
        ], function ($route) {
            $route->group([
                'prefix' => 'ShadowsocksTidalab',
                'middleware' => 'server:shadowsocks',
            ], function ($route) {
                $route->get('user', [ShadowsocksTidalabController::class, 'user']);
                $route->post('submit', [ShadowsocksTidalabController::class, 'submit']);
            });
            $route->group([
                'prefix' => 'TrojanTidalab',
                'middleware' => 'server:trojan',
            ], function ($route) {
                $route->get('config', [TrojanTidalabController::class, 'config']);
                $route->get('user', [TrojanTidalabController::class, 'user']);
                $route->post('submit', [TrojanTidalabController::class, 'submit']);
            });
        });
    }
}
