<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class OrderUpdate extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {
        return [
            'trade_no' => 'required|string',
            'commission_status' => 'in:0,1,2,3'
        ];
    }

    public function messages()
    {
        return [
            'trade_no.required' => __('Trade number cannot be empty'),
            'commission_status.in' => __('Commission status format is invalid'),
        ];
    }
}
