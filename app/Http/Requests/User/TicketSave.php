<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TicketSave extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {
        return [
            'subject' => 'required|string|max:128',
            'level' => 'required|in:0,1',
            'ticket_type_id' => [
                'nullable',
                'integer',
                Rule::exists('v2_ticket_type', 'id')->where('show', 1),
            ],
            'message' => 'required|string|max:5000'
        ];
    }

    public function messages()
    {
        return [
            'subject.required' => __('Ticket subject cannot be empty'),
            'level.required' => __('Ticket level cannot be empty'),
            'level.in' => __('Incorrect ticket level format'),
            'ticket_type_id.integer' => __('Incorrect ticket type format'),
            'ticket_type_id.exists' => __('Ticket type does not exist'),
            'message.required' => __('Message cannot be empty')
        ];
    }

    /**
     * 把空字符串的 ticket_type_id 归一为 null（即"未选类型"），避免 exists 校验误判。
     */
    protected function prepareForValidation(): void
    {
        if ($this->input('ticket_type_id') === '' || $this->input('ticket_type_id') === '0') {
            $this->merge(['ticket_type_id' => null]);
        }
    }
}
