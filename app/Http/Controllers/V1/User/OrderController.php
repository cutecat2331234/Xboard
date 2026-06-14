<?php

namespace App\Http\Controllers\V1\User;

use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Http\Requests\User\OrderSave;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\User;
use App\Services\CouponService;
use App\Services\OrderService;
use App\Services\PaymentService;
use App\Services\PlanService;
use App\Services\UserService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class OrderController extends Controller
{
    public function fetch(Request $request)
    {
        $request->validate([
            'status' => 'nullable|integer|in:0,1,2,3,4',
        ]);
        $orders = Order::with('plan')
            ->where('user_id', $request->user()->id)
            ->when($request->input('status') !== null, function ($query) use ($request) {
                $query->where('status', $request->input('status'));
            })
            ->orderBy('created_at', 'DESC')
            ->get();

        return $this->success(OrderResource::collection($orders));
    }

    public function detail(Request $request)
    {
        $request->validate([
            'trade_no' => 'required|string',
        ]);
        $order = Order::with(['payment', 'plan'])
            ->where('user_id', $request->user()->id)
            ->where('trade_no', $request->input('trade_no'))
            ->first();
        if (!$order) {
            return $this->fail([400, __('Order does not exist or has been paid')]);
        }
        $order['try_out_plan_id'] = (int) admin_setting('try_out_plan_id');
        if (!$order->plan) {
            return $this->fail([400, __('Subscription plan does not exist')]);
        }
        if ($order->surplus_order_ids) {
            $order['surplus_orders'] = Order::whereIn('id', $order->surplus_order_ids)->get();
        }
        return $this->success(OrderResource::make($order));
    }

    public function save(OrderSave $request)
    {
        $request->validate([
            'plan_id' => 'required|exists:App\Models\Plan,id',
            'period' => 'required|string'
        ]);

        $user = User::findOrFail($request->user()->id);
        $userService = app(UserService::class);

        $plan = Plan::findOrFail($request->input('plan_id'));
        $planService = new PlanService($plan);

        $planService->validatePurchase($user, $request->input('period'));

        $order = OrderService::createFromRequest(
            $user,
            $plan,
            $request->input('period'),
            $request->input('coupon_code')
        );

        return $this->success($order->trade_no);
    }

    protected function applyCoupon(Order $order, string $couponCode): void
    {
        $couponService = CouponService::findByCode($couponCode);
        if (!$couponService->use($order)) {
            throw new ApiException(__('Coupon failed'));
        }
        $order->coupon_id = $couponService->getId();
    }

    protected function handleUserBalance(Order $order, User $user, UserService $userService): void
    {
        $remainingBalance = $user->balance - $order->total_amount;

        if ($remainingBalance > 0) {
            if (!$userService->addBalance($order->user_id, -$order->total_amount)) {
                throw new ApiException(__('Insufficient balance'));
            }
            $order->balance_amount = $order->total_amount;
            $order->total_amount = 0;
        } else {
            if (!$userService->addBalance($order->user_id, -$user->balance)) {
                throw new ApiException(__('Insufficient balance'));
            }
            $order->balance_amount = $user->balance;
            $order->total_amount = $order->total_amount - $user->balance;
        }
    }

    public function checkout(Request $request)
    {
        $request->validate([
            'trade_no' => 'required|string',
            'method' => 'required|integer',
            'token' => 'nullable|string',
        ]);

        $tradeNo = $request->input('trade_no');
        $method = (int) $request->input('method');
        $userId = $request->user()->id;

        $prepared = DB::transaction(function () use ($userId, $tradeNo, $method) {
            $order = Order::where('trade_no', $tradeNo)
                ->where('user_id', $userId)
                ->where('status', 0)
                ->lockForUpdate()
                ->first();
            if (!$order) {
                throw new ApiException(__('Order does not exist or has been paid'));
            }

            if ($order->total_amount <= 0) {
                $orderService = new OrderService($order);
                if (!$orderService->paid('free:' . $order->trade_no)) {
                    throw new ApiException(__('Payment failed'));
                }

                return ['mode' => 'free'];
            }

            $payment = Payment::find($method);
            if (!$payment || !$payment->enable) {
                throw new ApiException(__('Payment method is not available'));
            }

            $order->handling_amount = null;
            if ($payment->handling_fee_fixed || $payment->handling_fee_percent) {
                $order->handling_amount = (int) round(($order->total_amount * ($payment->handling_fee_percent / 100)) + $payment->handling_fee_fixed);
            }
            $order->payment_id = $method;
            if (!$order->save()) {
                throw new ApiException(__('Request failed, please try again later'));
            }

            $chargeAmount = isset($order->handling_amount)
                ? ($order->total_amount + $order->handling_amount)
                : $order->total_amount;

            return [
                'mode' => 'pay',
                'order' => $order->fresh(),
                'payment' => $payment,
                'charge_amount' => $chargeAmount,
            ];
        });

        if (($prepared['mode'] ?? null) === 'free') {
            return response([
                'type' => -1,
                'data' => true,
            ]);
        }

        /** @var Order $order */
        $order = $prepared['order'];
        /** @var Payment $payment */
        $payment = $prepared['payment'];
        $paymentService = new PaymentService($payment->payment, $payment->id);
        $result = $paymentService->pay([
            'trade_no' => $tradeNo,
            'total_amount' => $prepared['charge_amount'],
            'user_id' => $order->user_id,
            'stripe_token' => $request->input('token'),
        ]);

        if (($result['type'] ?? null) === 2 && !empty($result['data']) && !empty($result['callback_no'])) {
            DB::transaction(function () use ($userId, $tradeNo, $result) {
                $order = Order::where('trade_no', $tradeNo)
                    ->where('user_id', $userId)
                    ->lockForUpdate()
                    ->first();
                if (!$order) {
                    throw new ApiException(__('Order does not exist or has been paid'));
                }
                $orderService = new OrderService($order);
                if (!$orderService->paid((string) $result['callback_no'])) {
                    throw new ApiException(__('Payment failed. Please check your credit card information'));
                }
            });

            return response([
                'type' => -1,
                'data' => true,
            ]);
        }

        return response([
            'type' => $result['type'],
            'data' => $result['data'],
        ]);
    }

    public function check(Request $request)
    {
        $tradeNo = $request->input('trade_no');
        $order = Order::where('trade_no', $tradeNo)
            ->where('user_id', $request->user()->id)
            ->first();
        if (!$order) {
            return $this->fail([400, __('Order does not exist')]);
        }
        return $this->success($order->status);
    }

    public function getPaymentMethod()
    {
        $methods = Payment::select([
            'id',
            'name',
            'payment',
            'icon',
            'handling_fee_fixed',
            'handling_fee_percent'
        ])
            ->where('enable', 1)
            ->orderBy('sort', 'ASC')
            ->get();

        return $this->success($methods);
    }

    public function cancel(Request $request)
    {
        $request->validate([
            'trade_no' => 'required|string',
        ]);
        try {
            return DB::transaction(function () use ($request) {
                $order = Order::where('trade_no', $request->input('trade_no'))
                    ->where('user_id', $request->user()->id)
                    ->lockForUpdate()
                    ->first();
                if (!$order) {
                    return $this->fail([400, __('Order does not exist')]);
                }
                if (!in_array((int) $order->status, [Order::STATUS_PENDING, Order::STATUS_PROCESSING], true)) {
                    return $this->fail([400, __('You can only cancel pending orders')]);
                }
                if ((int) $order->status === Order::STATUS_PROCESSING && $order->paid_at) {
                    return $this->fail([400, __('Payment is in progress for this order, cannot cancel')]);
                }
                $orderService = new OrderService($order);
                if (!$orderService->cancel()) {
                    return $this->fail([400, __('Cancel failed')]);
                }
                return $this->success(true);
            });
        } catch (\Exception $e) {
            Log::error('Order cancel failed', [
                'trade_no' => $request->input('trade_no'),
                'user_id' => $request->user()->id,
                'error' => $e->getMessage(),
            ]);
            return $this->fail([400, __('Cancel failed')]);
        }
    }
}
