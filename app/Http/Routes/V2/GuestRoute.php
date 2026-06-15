<?php
namespace App\Http\Routes\V2;

use App\Http\Controllers\V2\Client\AppController;
use Illuminate\Contracts\Routing\Registrar;

class GuestRoute
{
    public function map(Registrar $router)
    {
        (new \App\Http\Routes\V1\GuestRoute())->map($router);

        $router->group([
            'prefix' => 'guest/client',
        ], function ($router) {
            $router->get('/app/getConfig', [AppController::class, 'getConfig']);
            $router->get('/app/getVersion', [AppController::class, 'getVersion']);
        });
    }
}
