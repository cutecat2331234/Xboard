<?php

namespace Plugin\StripeCredit;

use App\Contracts\PaymentInterface;
use App\Exceptions\ApiException;
use App\Services\Plugin\AbstractPlugin;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Stripe\Charge;
use Stripe\Exception\SignatureVerificationException;
use Stripe\Stripe;
use Stripe\Webhook;

class Plugin extends AbstractPlugin implements PaymentInterface
{
    public function boot(): void
    {
        $this->filter('available_payment_methods', function ($methods) {
            if ($this->getConfig('enabled', true)) {
                $methods['StripeCredit'] = [
                    'name' => $this->getConfig('display_name', 'Stripe'),
                    'icon' => $this->getConfig('icon', '💳'),
                    'plugin_code' => $this->getPluginCode(),
                    'type' => 'plugin',
                ];
            }

            return $methods;
        });
    }

    public function form(): array
    {
        return [
            'currency' => [
                'label' => '货币单位',
                'type' => 'string',
                'required' => true,
                'description' => 'Stripe 结算货币，如 usd、eur',
                'default' => 'usd',
            ],
            'stripe_sk_live' => [
                'label' => 'SK_LIVE',
                'type' => 'string',
                'required' => true,
                'description' => 'Stripe Secret Key',
            ],
            'stripe_pk_live' => [
                'label' => 'PK_LIVE',
                'type' => 'string',
                'required' => true,
                'description' => 'Stripe Publishable Key',
            ],
            'stripe_webhook_key' => [
                'label' => 'WebHook 密钥签名',
                'type' => 'string',
                'required' => true,
                'description' => 'Stripe Webhook Signing Secret',
            ],
        ];
    }

    public function pay($order): array
    {
        $currency = strtolower((string) $this->getConfig('currency', 'usd'));
        $exchange = $this->exchange('CNY', strtoupper($currency));
        if (!$exchange) {
            throw new ApiException(__('Currency conversion has timed out, please try again later'));
        }

        $token = $order['stripe_token'] ?? null;
        if (!$token) {
            throw new ApiException(__('Payment failed. Please check your credit card information'));
        }

        Stripe::setApiKey($this->getConfig('stripe_sk_live'));

        try {
            $charge = Charge::create([
                'amount' => (int) floor($order['total_amount'] * $exchange),
                'currency' => $currency,
                'source' => $token,
                'metadata' => [
                    'user_id' => (string) $order['user_id'],
                    'out_trade_no' => $order['trade_no'],
                ],
            ]);
        } catch (\Throwable $e) {
            Log::warning('Stripe charge failed', ['trade_no' => $order['trade_no'], 'error' => $e->getMessage()]);
            throw new ApiException(__('Payment failed. Please check your credit card information'));
        }

        if (!$charge->paid) {
            throw new ApiException(__('Payment failed. Please check your credit card information'));
        }

        return [
            'type' => 2,
            'data' => true,
            'callback_no' => $charge->id,
        ];
    }

    public function notify($params): array|bool|string
    {
        Stripe::setApiKey($this->getConfig('stripe_sk_live'));
        $payload = trim(request()->getContent());
        $signature = request()->header('Stripe-Signature', '');

        try {
            $event = Webhook::constructEvent(
                $payload,
                $signature,
                $this->getConfig('stripe_webhook_key')
            );
        } catch (SignatureVerificationException $e) {
            throw new ApiException('Invalid Stripe webhook signature', 400);
        } catch (\UnexpectedValueException $e) {
            throw new ApiException('Invalid Stripe webhook payload', 400);
        }

        switch ($event->type) {
            case 'source.chargeable':
                $object = $event->data->object;
                Charge::create([
                    'amount' => $object->amount,
                    'currency' => $object->currency,
                    'source' => $object->id,
                    'metadata' => (array) ($object->metadata ?? []),
                ]);
                return 'success';

            case 'charge.succeeded':
                $object = $event->data->object;
                if (($object->status ?? null) !== 'succeeded') {
                    return false;
                }

                $metaData = $object->metadata ?? null;
                if (!$metaData || !isset($metaData->out_trade_no)) {
                    if (isset($object->source->metadata->out_trade_no)) {
                        $metaData = $object->source->metadata;
                    } else {
                        return 'order error';
                    }
                }

                return [
                    'trade_no' => $metaData->out_trade_no,
                    'callback_no' => $object->id,
                ];

            default:
                return 'success';
        }
    }

    private function exchange(string $from, string $to): ?float
    {
        try {
            $response = Http::timeout(10)->get('https://api.exchangerate.host/latest', [
                'symbols' => $to,
                'base' => $from,
            ]);
            if (!$response->successful()) {
                return null;
            }
            $rate = $response->json("rates.{$to}");
            return is_numeric($rate) ? (float) $rate : null;
        } catch (\Throwable $e) {
            Log::warning('Stripe currency exchange failed', ['error' => $e->getMessage()]);
            return null;
        }
    }
}
