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
        } else {
            // Octane(Swoole)下 worker 常驻,若不显式复位,上一个携带
            // content-language 的请求会把 locale 泄漏给后续未携带该头的请求/用户。
            App::setLocale(config('app.locale'));
        }
        return $next($request);
    }
}
