<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UserFetch extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {
        return [
            'filter.*.key' => 'required|in:id,email,transfer_enable,d,expired_at,uuid,token,invite_by_email,invite_user_id,plan_id,banned,remarks,is_admin',
            'filter.*.condition' => 'required|in:>,<,=,>=,<=,模糊,!=',
            'filter.*.value' => 'required'
        ];
    }

    public function messages()
    {
        return [
            'filter.*.key.required' => __('Filter key cannot be empty'),
            'filter.*.key.in' => __('Invalid filter key'),
            'filter.*.condition.required' => __('Filter condition cannot be empty'),
            'filter.*.condition.in' => __('Invalid filter condition'),
            'filter.*.value.required' => __('Filter value cannot be empty'),
        ];
    }
}
