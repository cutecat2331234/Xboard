<?php

namespace App\Http\Controllers\V1\User;

use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Http\Resources\CouponResource;
use App\Services\CouponService;
use App\Support\AppFeature;
use Illuminate\Http\Request;

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
        $couponService = CouponService::findByCode($request->input('code'));
        $couponService->setPlanId($request->input('plan_id'));
        $couponService->setUserId($request->user()->id);
        $couponService->setPeriod($request->input('period'));
        $couponService->check();
        return $this->success(CouponResource::make($couponService->getCoupon()));
    }
}
