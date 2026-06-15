<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\Concerns\NormalizesLegacyFilterConditions;
use Illuminate\Foundation\Http\FormRequest;

class OrderFetch extends FormRequest
{
    use NormalizesLegacyFilterConditions;
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {
        return [
            'filter.*.key' => 'required|in:email,trade_no,status,commission_status,user_id,invite_user_id,callback_no,commission_balance',
            'filter.*.condition' => 'required|in:>,<,=,>=,<=,like,!=',
            'filter.*.value' => ''
        ];
    }

    public function messages()
    {
        return [
            'filter.*.key.required' => __('Filter key cannot be empty'),
            'filter.*.key.in' => __('Invalid filter key'),
            'filter.*.condition.required' => __('Filter condition cannot be empty'),
            'filter.*.condition.in' => __('Invalid filter condition'),
        ];
    }
}
