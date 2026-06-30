<?php

namespace App\Http\Requests\Admin;

use App\Services\Plugin\HookManager;
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
        $rules = [
            'id' => 'required|integer',
            'email' => 'email:strict',
            'password' => 'nullable|min:8',
            'transfer_enable' => 'numeric|min:0',
            'expired_at' => 'nullable|integer',
            'banned' => 'bool',
            'plan_id' => 'nullable|integer',
            'commission_rate' => 'nullable|integer|min:0|max:100',
            'discount' => 'nullable|integer|min:0|max:100',
            'is_admin' => 'boolean',
            'is_staff' => 'boolean',
            'u' => 'integer|min:0',
            'd' => 'integer|min:0',
            'balance' => 'numeric',
            'commission_type' => 'integer',
            'commission_balance' => 'numeric',
            'remarks' => 'nullable',
            'speed_limit' => 'nullable|integer',
            'device_limit' => 'nullable|integer'
        ];

        return HookManager::filter('admin.user.update.rules', $rules, $this);
    }

    public function messages()
    {
        $messages = [
            'email.required' => __('Email cannot be empty'),
            'email.email' => __('Email format is invalid'),
            'transfer_enable.numeric' => __('Traffic format is invalid'),
            'expired_at.integer' => __('Expiry time format is invalid'),
            'banned.in' => __('Ban status format is invalid'),
            'is_admin.required' => __('Admin status cannot be empty'),
            'is_admin.in' => __('Admin status format is invalid'),
            'is_staff.required' => __('Staff status cannot be empty'),
            'is_staff.in' => __('Staff status format is invalid'),
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
            'password.min' => __('Password must be at least 8 characters'),
            'speed_limit.integer' => __('Speed limit format is invalid'),
            'device_limit.integer' => __('Device limit format is invalid'),
        ];

        return HookManager::filter('admin.user.update.messages', $messages, $this);
    }
}
