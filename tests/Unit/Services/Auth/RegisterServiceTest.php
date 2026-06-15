<?php

namespace Tests\Unit\Services\Auth;

use App\Services\Auth\RegisterService;
use App\Utils\CacheKey;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class RegisterServiceTest extends TestCase
{
    use RefreshDatabase;

    private RegisterService $service;

    protected function setUp(): void
    {
        parent::setUp();

        Cache::flush();
        admin_setting([
            'email_verify' => 1,
            'email_whitelist_enable' => 0,
            'email_gmail_limit_enable' => 0,
            'stop_register' => 0,
            'invite_force' => 0,
            'captcha_enable' => 0,
            'register_limit_by_ip_enable' => 0,
        ]);

        $this->service = app(RegisterService::class);
    }

    public function test_validate_register_rejects_missing_cached_email_code(): void
    {
        [$success, $result] = $this->service->validateRegister($this->makeRequest([
            'email_code' => '123456',
        ]));

        $this->assertFalse($success);
        $this->assertSame(400, $result[0]);
    }

    public function test_validate_register_rejects_boolean_email_code(): void
    {
        [$success, $result] = $this->service->validateRegister($this->makeRequest([
            'email_code' => false,
        ]));

        $this->assertFalse($success);
        $this->assertSame(422, $result[0]);
    }

    public function test_validate_register_accepts_matching_cached_email_code(): void
    {
        Cache::put(CacheKey::get('EMAIL_VERIFY_CODE_REGISTER', 'user@example.com'), 123456, 300);

        [$success, $result] = $this->service->validateRegister($this->makeRequest([
            'email_code' => '123456',
        ]));

        $this->assertTrue($success);
        $this->assertNull($result);
    }

    public function test_register_enforces_ip_limit_atomically(): void
    {
        admin_setting([
            'register_limit_by_ip_enable' => 1,
            'register_limit_count' => 1,
            'register_limit_expire' => 60,
            'email_verify' => 0,
        ]);

        $request = $this->makeRequest(['email' => 'first@example.com']);
        [$ok1] = $this->service->register($request);
        $this->assertTrue($ok1);

        $request2 = $this->makeRequest(['email' => 'second@example.com']);
        [$ok2, $error2] = $this->service->register($request2);
        $this->assertFalse($ok2);
        $this->assertSame(429, $error2[0]);
    }

    private function makeRequest(array $overrides = [], string $ip = '203.0.113.10'): Request
    {
        return Request::create('/api/v1/passport/auth/register', 'POST', array_merge([
            'email' => 'user@example.com',
            'password' => 'password123',
        ], $overrides), [], [], ['REMOTE_ADDR' => $ip]);
    }
}
