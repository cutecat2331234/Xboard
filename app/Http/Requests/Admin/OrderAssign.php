<?php

namespace App\Http\Requests\Admin;

use App\Models\Plan;
use App\Services\PlanService;
use Illuminate\Foundation\Http\FormRequest;

class OrderAssign extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {
        return [
            'plan_id' => 'required',
            'email' => 'required',
            'total_amount' => 'required|integer|min:0',
            'period' => 'required|in:' . implode(',', PlanService::allowedPeriodInputs()),
        ];
    }

    public function messages()
    {
        return [
            'plan_id.required' => __('Plan is required'),
            'email.required' => __('Email cannot be empty'),
            'total_amount.required' => __('Payment amount cannot be empty'),
            'total_amount.integer' => __('Payment amount format is invalid'),
            'total_amount.min' => __('Payment amount format is invalid'),
            'period.required' => __('Subscription period cannot be empty'),
            'period.in' => __('Subscription period format is invalid'),
        ];
    }
}
