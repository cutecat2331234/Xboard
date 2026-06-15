<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class CouponGenerate extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {
        return [
            'generate_count' => 'nullable|integer|max:500',
            'id' => 'nullable|integer',
            'name' => 'required',
            'type' => 'required|in:1,2',
            'value' => 'required|integer',
            'started_at' => 'required|integer',
            'ended_at' => 'required|integer',
            'limit_use' => 'nullable|integer',
            'limit_use_with_user' => 'nullable|integer',
            'limit_plan_ids' => 'nullable|array',
            'limit_period' => 'nullable|array',
            'code' => ''
        ];
    }

    public function messages()
    {
        return [
            'generate_count.integer' => __('Generate count must be an integer'),
            'generate_count.max' => __('Generate count cannot exceed 500'),
            'name.required' => __('Name cannot be empty'),
            'type.required' => __('Coupon type cannot be empty'),
            'type.in' => __('Coupon type format is invalid'),
            'value.required' => __('Amount or percent cannot be empty'),
            'value.integer' => __('Amount or percent format is invalid'),
            'started_at.required' => __('Start time cannot be empty'),
            'started_at.integer' => __('Start time format is invalid'),
            'ended_at.required' => __('End time cannot be empty'),
            'ended_at.integer' => __('End time format is invalid'),
            'limit_use.integer' => __('Max usage format is invalid'),
            'limit_use_with_user.integer' => __('Per-user usage limit format is invalid'),
            'limit_plan_ids.array' => __('Applicable plans must be an array'),
            'limit_period.array' => __('Applicable periods must be an array'),
        ];
    }
}
