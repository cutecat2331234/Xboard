<?php

namespace App\Traits;

trait SafeQueryColumns
{
    protected function isAllowedQueryColumn(string $field, array $allowed): bool
    {
        if (in_array($field, $allowed, true)) {
            return true;
        }

        if (str_contains($field, '.')) {
            return in_array($field, $allowed, true);
        }

        return false;
    }

    protected function resolveFilterField(string $field, array $allowed, array $aliases = []): ?string
    {
        $field = $aliases[$field] ?? $field;
        return $this->isAllowedQueryColumn($field, $allowed) ? $field : null;
    }

    protected function resolveSortField(string $field, array $allowed, array $aliases = []): ?string
    {
        $field = $aliases[$field] ?? $field;
        return $this->isAllowedQueryColumn($field, $allowed) ? $field : null;
    }
}
