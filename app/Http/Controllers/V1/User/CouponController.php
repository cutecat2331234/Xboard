<?php

namespace App\Http\Controllers\V1\User;

use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Http\Resources\CouponResource;
use App\Services\CouponService;
use App\Support\AppFeature;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

class CouponController extends Controller
{
    public function check(Request $request)
    {
        if (!AppFeature::couponEnabled()) {
            return $this->fail([403, __('Invalid coupon')]);
        }
        if (empty($request->input('code'))) {
            return $this->fail([422, __('Coupon cannot be empty')]);
        }
        $rateKey = 'coupon-check:' . $request->user()->id . ':' . $request->ip();
        if (RateLimiter::tooManyAttempts($rateKey, 30)) {
            return $this->fail([429, __('Request failed, please try again later')]);
        }
        RateLimiter::hit($rateKey, 60);
        $request->validate([
            'plan_id' => 'required|integer|min:1',
            'period' => 'required|string',
        ], [
            'plan_id.required' => __('Plan ID cannot be empty'),
            'period.required' => __('Plan period cannot be empty'),
        ]);
        $couponService = CouponService::findByCode($request->input('code'));
        $couponService->setPlanId($request->input('plan_id'));
        $couponService->setUserId($request->user()->id);
        $couponService->setPeriod($request->input('period'));
        try {
            $couponService->check();
        } catch (ApiException $e) {
            return $this->fail([400, $e->getMessage()]);
        }
        return $this->success(CouponResource::make($couponService->getCoupon()));
    }
}
