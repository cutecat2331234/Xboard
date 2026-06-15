<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Support\Facades\App;

class Language
{
    private const ALLOWED_LOCALES = ['en-US', 'zh-CN', 'zh-TW', 'ru-RU'];

    public function handle($request, Closure $next)
    {
        $locale = $request->header('content-language');
        if ($locale && in_array($locale, self::ALLOWED_LOCALES, true)) {
            App::setLocale($locale);
        }
        return $next($request);
    }
}
