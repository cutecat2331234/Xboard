<?php

namespace App\Http\Requests\Concerns;

trait NormalizesLegacyFilterConditions
{
    protected function prepareForValidation(): void
    {
        $filters = $this->input('filter');
        if (!is_array($filters)) {
            return;
        }

        foreach ($filters as $index => $filter) {
            if (!is_array($filter)) {
                continue;
            }

            $condition = $filter['condition'] ?? null;
            if ($condition === '模糊') {
                $filters[$index]['condition'] = 'like';
            }
        }

        $this->merge(['filter' => $filters]);
    }
}
