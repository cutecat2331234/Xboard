<?php

namespace App\Http\Controllers\V2\Admin;

use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use App\Services\PaymentService;
use App\Utils\Helper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    public function getPaymentMethods()
    {
        $methods = [];

        $pluginMethods = PaymentService::getAllPaymentMethodNames();
        $methods = array_merge($methods, $pluginMethods);

        return $this->success(array_unique($methods));
    }

    public function fetch()
    {
        $payments = Payment::orderBy('sort', 'ASC')->get()->makeVisible('config');
        foreach ($payments as $k => $v) {
            $notifyUrl = url("/api/v1/guest/payment/notify/{$v->payment}/{$v->uuid}");
            if ($v->notify_domain) {
                $parseUrl = parse_url($notifyUrl);
                $notifyUrl = $v->notify_domain . $parseUrl['path'];
            }
            $payments[$k]['notify_url'] = $notifyUrl;
        }
        return $this->success($payments);
    }

    public function getPaymentForm(Request $request)
    {
        try {
            $paymentService = new PaymentService($request->input('payment'), $request->input('id'));
            return $this->success(collect($paymentService->form()));
        } catch (\Exception $e) {
            return $this->fail([400, __('Payment method does not exist or is disabled')]);
        }
    }

    public function show(Request $request)
    {
        try {
            return DB::transaction(function () use ($request) {
                $payment = Payment::where('id', $request->input('id'))->lockForUpdate()->first();
                if (!$payment) {
                    return $this->fail([400202, __('Payment method does not exist')]);
                }
                $payment->enable = !$payment->enable;
                if (!$payment->save()) {
                    return $this->fail([500, __('Save failed')]);
                }
                return $this->success(true);
            });
        } catch (\Exception $e) {
            Log::error($e);
            return $this->fail([500, __('Save failed')]);
        }
    }

    public function save(Request $request)
    {
        if (!admin_setting('app_url')) {
            return $this->fail([400, __('Configure site URL in settings before adding payment methods')]);
        }
        $params = $request->validate([
            'name' => 'required',
            'icon' => 'nullable',
            'payment' => 'required',
            'config' => 'required',
            'notify_domain' => 'nullable|url',
            'handling_fee_fixed' => 'nullable|integer',
            'handling_fee_percent' => 'nullable|numeric|between:0,100'
        ], [
            'name.required' => __('Display name cannot be empty'),
            'payment.required' => __('Gateway parameter cannot be empty'),
            'config.required' => __('Config parameter cannot be empty'),
            'notify_domain.url' => __('Invalid custom notify domain URL'),
            'handling_fee_fixed.integer' => __('Invalid fixed handling fee format'),
            'handling_fee_percent.between' => __('Handling fee percent must be between 0 and 100'),
        ]);
        if ($request->input('id')) {
            try {
                return DB::transaction(function () use ($request, $params) {
                    $payment = Payment::where('id', $request->input('id'))->lockForUpdate()->first();
                    if (!$payment) {
                        return $this->fail([400202, __('Payment method does not exist')]);
                    }
                    $payment->update($params);
                    return $this->success(true);
                });
            } catch (\Exception $e) {
                Log::error($e);
                return $this->fail([500, __('Save failed')]);
            }
        }
        $params['uuid'] = Helper::randomChar(8);
        if (!Payment::create($params)) {
            return $this->fail([500, __('Save failed')]);
        }
        return $this->success(true);
    }

    public function drop(Request $request)
    {
        try {
            return DB::transaction(function () use ($request) {
                $payment = Payment::where('id', $request->input('id'))->lockForUpdate()->first();
                if (!$payment) {
                    return $this->fail([400202, __('Payment method does not exist')]);
                }
                $pendingOrders = Order::where('payment_id', $payment->id)
                    ->whereIn('status', [Order::STATUS_PENDING, Order::STATUS_PROCESSING])
                    ->count();
                if ($pendingOrders > 0) {
                    return $this->fail([400, __('Payment method has pending or processing orders and cannot be deleted')]);
                }
                if (!$payment->delete()) {
                    return $this->fail([500, __('Delete failed')]);
                }
                return $this->success(true);
            });
        } catch (\Exception $e) {
            Log::error($e);
            return $this->fail([500, __('Delete failed')]);
        }
    }


    public function sort(Request $request)
    {
        $request->validate([
            'ids' => 'required|array'
        ], [
            'ids.required' => __('Invalid sort parameters'),
            'ids.array' => __('Invalid sort parameters'),
        ]);
        try {
            DB::beginTransaction();
            foreach ($request->input('ids') as $k => $v) {
                $payment = Payment::where('id', $v)->lockForUpdate()->first();
                if (!$payment || !$payment->update(['sort' => $k + 1])) {
                    throw new \Exception();
                }
            }
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->fail([500, __('Save failed')]);
        }

        return $this->success(true);
    }
}
