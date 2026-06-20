<?php

namespace App\Http\Requests\Finance;

use App\Models\TransactionCategory;
use Illuminate\Database\Query\Builder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;

class StoreCategoryRequest extends FormRequest
{
    private ?TransactionCategory $categoryContext = null;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'account_id' => [
                'nullable',
                'integer',
                Rule::exists('financial_accounts', 'id')->where(fn (Builder $query) => $query->where('user_id', $this->user()?->id)),
            ],
            'name' => [
                'required',
                'string',
                'max:80',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    $userId = $this->user()?->id;
                    $isAdmin = ($this->user()?->role ?? 'user') === 'admin';
                    $transactionType = $this->input('transaction_type');
                    $categoryContext = $this->categoryContext();
                    $targetUserId = $isAdmin
                        ? ($categoryContext?->user_id ?? null)
                        : $userId;

                    if (! $userId || ! $transactionType || ! is_string($value)) {
                        return;
                    }

                    $exists = TransactionCategory::query()
                        ->where(
                            $targetUserId === null
                                ? fn ($query) => $query->whereNull('user_id')
                                : fn ($query) => $query->where('user_id', $targetUserId)
                        )
                        ->where('transaction_type', $transactionType)
                        ->where('slug', Str::slug($value))
                        ->when($this->route('category'), fn ($query, $categoryId) => $query->whereKeyNot($categoryId))
                        ->exists();

                    if ($exists) {
                        $fail('Nama kategori sudah ada untuk tipe transaksi ini.');
                    }
                },
            ],
            'slug' => ['nullable', 'string', 'max:100'],
            'transaction_type' => ['required', Rule::in(['income', 'expense', 'both'])],
            'need_type' => ['nullable', Rule::in(['need', 'want', 'saving', 'debt'])],
            'icon' => ['nullable', 'string', 'max:60'],
            'color' => ['nullable', 'string', 'max:20'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:65535'],
        ];
    }

    private function categoryContext(): ?TransactionCategory
    {
        if ($this->categoryContext !== null) {
            return $this->categoryContext;
        }

        $categoryId = $this->route('category');
        if (! $categoryId) {
            return null;
        }

        $this->categoryContext = TransactionCategory::query()->find($categoryId);

        return $this->categoryContext;
    }
}
