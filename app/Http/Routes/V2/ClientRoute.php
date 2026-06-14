<?php
namespace App\Http\Routes\V2;

use App\Http\Controllers\V1\Client\ClientController;
use App\Http\Controllers\V2\Client\AppController;
use Illuminate\Contracts\Routing\Registrar;

class ClientRoute
{
    public function map(Registrar $router)
    {
        $router->group([
            'prefix' => 'client',
            'middleware' => 'client'
        ], function ($router) {
            $router->get('/subscribe', [ClientController::class, 'subscribe'])->name('client.subscribe.v2');
            // App
            $router->get('/app/getConfig', [AppController::class, 'getConfig']);
            $router->get('/app/getVersion', [AppController::class, 'getVersion']);
        });
    }
}
