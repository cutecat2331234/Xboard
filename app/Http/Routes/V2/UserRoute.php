<?php
namespace App\Http\Routes\V2;

use Illuminate\Contracts\Routing\Registrar;

class UserRoute
{
    public function map(Registrar $router)
    {
        // V2 user API mirrors V1 until dedicated V2 controllers exist.
        (new \App\Http\Routes\V1\UserRoute())->map($router);
    }
}
