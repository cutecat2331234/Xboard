<?php

namespace App\Http\Requests\Admin;

use App\Models\Plan;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class PlanSave extends FormRequest
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
     */
    public function rules(): array
    {
        return [
            'id' => 'nullable|integer',
            'name' => 'required|string|max:255',
            'content' => 'nullable|string',
            'reset_traffic_method' => 'integer|nullable',
            'transfer_enable' => 'integer|required|min:1',
            'prices' => 'nullable|array',
            'prices.*' => 'nullable|numeric|min:0',
            'group_id' => 'integer|nullable',
            'speed_limit' => 'integer|nullable|min:0',
            'device_limit' => 'integer|nullable|min:0',
            'capacity_limit' => 'integer|nullable|min:0',
            'tags' => 'array|nullable',
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $this->validatePrices($validator);
        });
    }

    /**
     * 验证价格配置
     */
    protected function validatePrices(Validator $validator): void
    {
        $prices = $this->input('prices', []);
        
        if (empty($prices)) {
            return;
        }

        // 获取所有有效的周期
        $validPeriods = array_keys(Plan::getAvailablePeriods());
        
        foreach ($prices as $period => $price) {
            // 验证周期是否有效
            if (!in_array($period, $validPeriods)) {
                $validator->errors()->add(
                    "prices.{$period}",
                    __('Unsupported subscription period: :period', ['period' => $period])
                );
                continue;
            }

            // 价格可以为 null、空字符串或大于 0 的数字
            if ($price !== null && $price !== '') {
                // 转换为数字进行验证
                $numericPrice = is_numeric($price) ? (float) $price : null;
                
                if ($numericPrice === null) {
                    $validator->errors()->add(
                        "prices.{$period}",
                        __('Price must be a number')
                    );
                } elseif ($numericPrice < 0) {
                    $validator->errors()->add(
                        "prices.{$period}",
                        __('Price must be greater than or equal to 0 (leave blank if unused)')
                    );
                }
            }
        }
    }

    /**
     * 处理验证后的数据
     */
    protected function passedValidation(): void
    {
        // 清理和格式化价格数据
        $prices = $this->input('prices', []);
        $cleanedPrices = [];

        foreach ($prices as $period => $price) {
            // 只保留有效的正数价格
            if ($price !== null && $price !== '' && is_numeric($price)) {
                $numericPrice = (float) $price;
                if ($numericPrice > 0) {
                    // 转换为浮点数并保留两位小数
                    $cleanedPrices[$period] = round($numericPrice, 2);
                }
            }
        }

        // 更新请求中的价格数据
        $this->merge(['prices' => $cleanedPrices]);
    }

    /**
     * Get custom error messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'name.required' => __('Plan name cannot be empty'),
            'name.max' => __('Plan name cannot exceed 255 characters'),
            'transfer_enable.required' => __('Traffic quota cannot be empty'),
            'transfer_enable.integer' => __('Traffic quota must be an integer'),
            'transfer_enable.min' => __('Traffic quota must be greater than 0'),
            'prices.array' => __('Price configuration format is invalid'),
            'prices.*.numeric' => __('Price must be numeric'),
            'prices.*.min' => __('Price cannot be negative'),
            'group_id.integer' => __('Group ID must be an integer'),
            'speed_limit.integer' => __('Speed limit must be an integer'),
            'speed_limit.min' => __('Speed limit cannot be negative'),
            'device_limit.integer' => __('Device limit must be an integer'),
            'device_limit.min' => __('Device limit cannot be negative'),
            'capacity_limit.integer' => __('Capacity limit must be an integer'),
            'capacity_limit.min' => __('Capacity limit cannot be negative'),
            'tags.array' => __('Tags must be an array'),
        ];
    }

    /**
     * Handle a failed validation attempt.
     */
    protected function failedValidation(Validator $validator): void
    {
        throw new HttpResponseException(
            response()->json([
                'data' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors()->toArray()
            ], 422)
        );
    }
}
