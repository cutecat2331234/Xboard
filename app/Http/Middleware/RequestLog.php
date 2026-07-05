<?php

namespace App\Http\Middleware;

use App\Models\AdminAuditLog;
use Closure;

class RequestLog
{
    // 用子串正则匹配字段名,覆盖 email_password / server_token / recaptcha_key /
    // recaptcha_v3_secret_key / turnstile_secret_key / telegram_bot_token 等
    // 精确 key 匹配漏掉的真实凭据字段,避免明文写入审计日志。
    private const SENSITIVE_PATTERN = '/pass|token|secret|key|salt|credential/i';

    public function handle($request, Closure $next)
    {
        if ($request->method() !== 'POST') {
            return $next($request);
        }

        $response = $next($request);

        try {
            $admin = $request->user();
            if (!$admin || !$admin->is_admin) {
                return $response;
            }

            $action = $this->resolveAction($request->path());
            $data = $this->filterSensitive($request->all());

            AdminAuditLog::insert([
                'admin_id' => $admin->id,
                'action' => $action,
                'method' => $request->method(),
                'uri' => $request->getRequestUri(),
                'request_data' => json_encode($data, JSON_UNESCAPED_UNICODE),
                'ip' => $request->getClientIp(),
                'created_at' => time(),
                'updated_at' => time(),
            ]);
        } catch (\Throwable $e) {
            \Log::warning('Audit log write failed: ' . $e->getMessage());
        }

        return $response;
    }

    /**
     * 递归脱敏:字段名匹配敏感模式的,整体替换为 [FILTERED]。
     * 保留字段名(便于审计"改了哪项"),但不落明文值。
     */
    private function filterSensitive(array $data): array
    {
        foreach ($data as $key => $value) {
            if (is_string($key) && preg_match(self::SENSITIVE_PATTERN, $key)) {
                $data[$key] = '[FILTERED]';
            } elseif (is_array($value)) {
                $data[$key] = $this->filterSensitive($value);
            }
        }
        return $data;
    }

    private function resolveAction(string $path): string
    {
        // api/v2/{secure_path}/user/update → user.update
        $path = preg_replace('#^api/v[12]/[^/]+/#', '', $path);
        // gift-card/create-template → gift_card.create_template
        $path = str_replace('-', '_', $path);
        // user/update → user.update, server/manage/sort → server_manage.sort
        $segments = explode('/', $path);
        $method = array_pop($segments);
        $resource = implode('_', $segments);

        return $resource . '.' . $method;
    }
}

