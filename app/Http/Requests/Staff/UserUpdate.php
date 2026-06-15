<?php

namespace App\Http\Requests\Staff;

use Illuminate\Foundation\Http\FormRequest;

class UserUpdate extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {
        return [
            'email' => 'required|email:strict',
            'password' => 'nullable',
            'transfer_enable' => 'numeric',
            'expired_at' => 'nullable|integer',
            'banned' => 'required|in:0,1',
            'plan_id' => 'nullable|integer',
            'commission_rate' => 'nullable|integer|min:0|max:100',
            'discount' => 'nullable|integer|min:0|max:100',
            'u' => 'integer',
            'd' => 'integer',
            'balance' => 'integer',
            'commission_balance' => 'integer'
        ];
    }

    public function messages()
    {
        return [
            'email.required' => __('Email cannot be empty'),
            'email.email' => __('Email format is invalid'),
            'transfer_enable.numeric' => __('Traffic format is invalid'),
            'expired_at.integer' => __('Expiry time format is invalid'),
            'banned.required' => __('Ban status cannot be empty'),
            'banned.in' => __('Ban status format is invalid'),
            'plan_id.integer' => __('Plan format is invalid'),
            'commission_rate.integer' => __('Commission rate format is invalid'),
            'commission_rate.nullable' => __('Commission rate format is invalid'),
            'commission_rate.min' => __('Commission rate must be at least 0'),
            'commission_rate.max' => __('Commission rate cannot exceed 100'),
            'discount.integer' => __('Discount rate format is invalid'),
            'discount.nullable' => __('Discount rate format is invalid'),
            'discount.min' => __('Discount rate must be at least 0'),
            'discount.max' => __('Discount rate cannot exceed 100'),
            'u.integer' => __('Upload traffic format is invalid'),
            'd.integer' => __('Download traffic format is invalid'),
            'balance.integer' => __('Balance format is invalid'),
            'commission_balance.integer' => __('Commission balance format is invalid'),
        ];
    }
}
