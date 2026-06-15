<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;

class GiftCardCheckRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'code' => 'required|string|min:8|max:32',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'code.required' => __('Redemption code cannot be empty'),
            'code.min' => __('Redemption code must be at least 8 characters'),
            'code.max' => __('Redemption code cannot exceed 32 characters'),
        ];
    }
}
