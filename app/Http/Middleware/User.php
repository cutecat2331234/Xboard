<?php

namespace App\Http\Middleware;

use App\Exceptions\ApiException;
use App\Services\AuthService;
use Auth;
use Closure;
use Illuminate\Support\Facades\Cache;

class User
{
    /**
     * Handle an incoming request.
     *
     * @param \Illuminate\Http\Request $request
     * @param \Closure $next
     * @return mixed
     */
    public function handle($request, Closure $next)
    {
        if (!Auth::guard('sanctum')->check()) {
            throw new ApiException(__('Unauthorized or session expired'), 403);
        }

        $user = Auth::guard('sanctum')->user();
        if ($user && (int) $user->banned === 1) {
            (new AuthService($user))->removeAllSessions();
            throw new ApiException(__('Your account has been banned'), 403);
        }

        return $next($request);
    }
}
