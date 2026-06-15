<?php

namespace App\Http\Controllers\V2\Admin;

use App\Http\Controllers\Controller;
use App\Models\MailTemplate;
use App\Services\MailService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class MailTemplateController extends Controller
{
    public function list()
    {
        $dbTemplates = MailTemplate::all()->keyBy('name');

        $result = [];
        foreach (MailTemplate::TEMPLATES as $name => $meta) {
            $db = $dbTemplates->get($name);
            $result[] = [
                'name' => $name,
                'label' => MailTemplate::getLabel($name),
                'customized' => $db !== null,
                'subject' => $db?->subject,
                'updated_at' => $db?->updated_at?->timestamp,
            ];
        }

        return $this->success($result);
    }

    public function get(Request $request)
    {
        $name = $request->input('name');
        $meta = MailTemplate::getMeta($name);
        if (!$meta) {
            return $this->fail([404, __('Mail template does not exist')]);
        }

        $db = MailTemplate::where('name', $name)->first();

        return $this->success([
            'name' => $name,
            'label' => MailTemplate::getLabel($name),
            'required_vars' => $meta['required_vars'],
            'optional_vars' => $meta['optional_vars'],
            'customized' => $db !== null,
            'subject' => $db?->subject ?? $this->getDefaultSubject($name),
            'content' => $db?->content ?? $this->getDefaultContent($name),
        ]);
    }

    public function save(Request $request)
    {
        $params = $request->validate([
            'name' => 'required|string',
            'subject' => 'required|string|max:255',
            'content' => 'required|string',
        ]);

        $meta = MailTemplate::getMeta($params['name']);
        if (!$meta) {
            return $this->fail([404, __('Mail template does not exist')]);
        }

        $errors = MailTemplate::validateContent($params['name'], $params['content']);
        if (!empty($errors)) {
            return $this->fail([422, implode('; ', $errors)]);
        }

        MailTemplate::updateOrCreate(
            ['name' => $params['name']],
            ['subject' => $params['subject'], 'content' => $params['content']]
        );
        Cache::forget("mail_template:{$params['name']}");

        return $this->success(true);
    }

    public function reset(Request $request)
    {
        $name = $request->input('name');
        $meta = MailTemplate::getMeta($name);
        if (!$meta) {
            return $this->fail([404, __('Mail template does not exist')]);
        }

        MailTemplate::where('name', $name)->delete();
        Cache::forget("mail_template:{$name}");
        return $this->success(true);
    }

    public function test(Request $request)
    {
        $name = $request->input('name');
        $meta = MailTemplate::getMeta($name);
        if (!$meta) {
            return $this->fail([404, __('Mail template does not exist')]);
        }

        $email = $request->input('email', $request->user()->email);
        $testVars = $this->getTestVars($name);

        try {
            $log = MailService::sendEmail([
                'email' => $email,
                'subject' => $this->getTestSubject($name),
                'template_name' => $name,
                'template_value' => $testVars,
            ]);

            if ($log['error']) {
                return $this->fail([500, __('Send failed: :error', ['error' => $log['error']])]);
            }
            return $this->success(true);
        } catch (\Exception $e) {
            Log::error($e);
            return $this->fail([500, __('Send failed: :error', ['error' => $e->getMessage()])]);
        }
    }

    private function getTestSubject(string $name): string
    {
        $appName = admin_setting('app_name', 'XBoard');
        $key = 'mail_template.test_subject.' . $name;
        $subject = __($key, ['app' => $appName]);
        return $subject === $key ? __('mail_template.test_subject.default', ['app' => $appName]) : $subject;
    }

    private function getTestVars(string $name): array
    {
        $appName = admin_setting('app_name', 'XBoard');
        $appUrl = admin_setting('app_url', 'https://example.com');

        return match ($name) {
            'verify' => [
                'name' => $appName,
                'code' => '123456',
                'url' => $appUrl,
            ],
            'notify' => [
                'name' => $appName,
                'content' => __('mail_template.test_content.notify'),
                'url' => $appUrl,
            ],
            'remindExpire' => [
                'name' => $appName,
                'url' => $appUrl,
            ],
            'remindTraffic' => [
                'name' => $appName,
                'url' => $appUrl,
            ],
            'mailLogin' => [
                'name' => $appName,
                'link' => $appUrl . '/login?token=test-token',
                'url' => $appUrl,
            ],
            default => ['name' => $appName, 'url' => $appUrl],
        };
    }

    private function getDefaultSubject(string $name): string
    {
        $appName = admin_setting('app_name', 'XBoard');
        $key = 'mail_template.default_subject.' . $name;
        $subject = __($key, ['app' => $appName]);
        return $subject === $key ? $appName : $subject;
    }

    private function getDefaultContent(string $name): string
    {
        $theme = 'default';
        $viewName = "mail.{$theme}.{$name}";

        try {
            $viewPath = resource_path("views/mail/{$theme}/{$name}.blade.php");
            if (file_exists($viewPath)) {
                $blade = file_get_contents($viewPath);
                return self::bladeToPlaceholder($blade);
            }
        } catch (\Throwable $e) {
            // ignore
        }

        return self::hardcodedDefault($name);
    }

    /**
     * Convert Blade syntax to {{placeholder}} syntax for editing.
     */
    private static function bladeToPlaceholder(string $blade): string
    {
        // {{$var}} → {{var}}
        $result = preg_replace('/\{\{\s*\$([a-zA-Z_]+)\s*\}\}/', '{{$1}}', $blade);
        // {!! nl2br($var) !!} → {{var}}
        $result = preg_replace('/\{!!\s*nl2br\(\$([a-zA-Z_]+)\)\s*!!\}/', '{{$1}}', $result);
        // {!! $var !!} → {{var}}
        $result = preg_replace('/\{!!\s*\$([a-zA-Z_]+)\s*!!\}/', '{{$1}}', $result);
        return $result;
    }

    private static function hardcodedDefault(string $name): string
    {
        $greeting = __('mail_template.default.greeting');
        $returnLink = __('mail_template.default.return_link');

        $layout = fn($title, $body) => <<<HTML
<div style="background: #eee">
    <table width="600" border="0" align="center" cellpadding="0" cellspacing="0">
        <tbody>
        <tr>
            <td>
                <div style="background:#fff">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <thead>
                        <tr>
                            <td valign="middle" style="padding-left:30px;background-color:#415A94;color:#fff;padding:20px 40px;font-size: 21px;">{{name}}</td>
                        </tr>
                        </thead>
                        <tbody>
                        <tr style="padding:40px 40px 0 40px;display:table-cell">
                            <td style="font-size:24px;line-height:1.5;color:#000;margin-top:40px">{$title}</td>
                        </tr>
                        <tr>
                            <td style="font-size:14px;color:#333;padding:24px 40px 0 40px">
                                {$greeting}<br /><br />{$body}
                            </td>
                        </tr>
                        </tbody>
                    </table>
                </div>
                <div>
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tbody>
                        <tr>
                            <td style="padding:20px 40px;font-size:12px;color:#999;line-height:20px;background:#f7f7f7"><a href="{{url}}" style="font-size:14px;color:#929292">{$returnLink}</a></td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            </td>
        </tr>
        </tbody>
    </table>
</div>
HTML;

        $titleKey = 'mail_template.default.title.' . $name;
        $bodyKey = 'mail_template.default.body.' . $name;
        $title = __($titleKey);
        $body = __($bodyKey);
        if ($title === $titleKey) {
            $title = __('mail_template.default.title.default');
        }
        if ($body === $bodyKey) {
            $body = __('mail_template.default.body.default');
        }

        return $layout($title, $body);
    }
}
