<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class TicketTypeSave extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {
        return [
            'id' => 'nullable|integer',
            'name' => 'required|string|max:128',
            // Bound sort to a non-negative signed-INT range to avoid DB overflow on the sort column.
            'sort' => 'nullable|integer|min:0|max:2147483647',
            'show' => 'nullable|boolean',
        ];
    }

    public function messages()
    {
        return [
            'name.required' => __('Ticket type name cannot be empty'),
            'name.max' => __('Ticket type name is too long'),
            'sort.integer' => __('Invalid parameters'),
            'sort.min' => __('Invalid parameters'),
            'sort.max' => __('Invalid parameters'),
            'show.boolean' => __('Invalid parameters'),
        ];
    }
}
