<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class MailSend extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {
        return [
            'type' => 'required|in:1,2,3,4',
            'subject' => 'required',
            'content' => 'required',
            'receiver' => 'array'
        ];
    }

    public function messages()
    {
        return [
            'type.required' => __('Send type cannot be empty'),
            'type.in' => __('Send type format is invalid'),
            'subject.required' => __('Email subject cannot be empty'),
            'content.required' => __('Content cannot be empty'),
            'receiver.array' => __('Recipients must be an array'),
        ];
    }
}
