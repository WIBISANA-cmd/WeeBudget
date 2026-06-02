<?php

namespace Database\Seeders;

use App\Models\TransactionCategory;
use Illuminate\Database\Seeder;

class TransactionCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Gaji', 'slug' => 'gaji', 'transaction_type' => 'income', 'need_type' => null, 'icon' => 'wallet', 'color' => '#16A34A', 'sort_order' => 1],
            ['name' => 'Lembur', 'slug' => 'lembur', 'transaction_type' => 'income', 'need_type' => null, 'icon' => 'clock', 'color' => '#22C55E', 'sort_order' => 2],
            ['name' => 'Bonus', 'slug' => 'bonus', 'transaction_type' => 'income', 'need_type' => null, 'icon' => 'gift', 'color' => '#84CC16', 'sort_order' => 3],
            ['name' => 'Freelance', 'slug' => 'freelance', 'transaction_type' => 'income', 'need_type' => null, 'icon' => 'briefcase', 'color' => '#0EA5E9', 'sort_order' => 4],
            ['name' => 'Jualan', 'slug' => 'jualan', 'transaction_type' => 'income', 'need_type' => null, 'icon' => 'store', 'color' => '#14B8A6', 'sort_order' => 5],
            ['name' => 'Makan', 'slug' => 'makan', 'transaction_type' => 'expense', 'need_type' => 'need', 'icon' => 'utensils', 'color' => '#F97316', 'sort_order' => 10],
            ['name' => 'Transport', 'slug' => 'transport', 'transaction_type' => 'expense', 'need_type' => 'need', 'icon' => 'bus', 'color' => '#2563EB', 'sort_order' => 11],
            ['name' => 'Kos/Kontrakan', 'slug' => 'kos-kontrakan', 'transaction_type' => 'expense', 'need_type' => 'need', 'icon' => 'home', 'color' => '#7C3AED', 'sort_order' => 12],
            ['name' => 'Pulsa & Internet', 'slug' => 'pulsa-internet', 'transaction_type' => 'expense', 'need_type' => 'need', 'icon' => 'wifi', 'color' => '#0891B2', 'sort_order' => 13],
            ['name' => 'Listrik & Air', 'slug' => 'listrik-air', 'transaction_type' => 'expense', 'need_type' => 'need', 'icon' => 'zap', 'color' => '#CA8A04', 'sort_order' => 14],
            ['name' => 'Cicilan', 'slug' => 'cicilan', 'transaction_type' => 'expense', 'need_type' => 'debt', 'icon' => 'receipt', 'color' => '#DC2626', 'sort_order' => 15],
            ['name' => 'Keluarga', 'slug' => 'keluarga', 'transaction_type' => 'expense', 'need_type' => 'need', 'icon' => 'users', 'color' => '#DB2777', 'sort_order' => 16],
            ['name' => 'Kesehatan', 'slug' => 'kesehatan', 'transaction_type' => 'expense', 'need_type' => 'need', 'icon' => 'heart-pulse', 'color' => '#E11D48', 'sort_order' => 17],
            ['name' => 'Belanja Rumah', 'slug' => 'belanja-rumah', 'transaction_type' => 'expense', 'need_type' => 'need', 'icon' => 'shopping-basket', 'color' => '#65A30D', 'sort_order' => 18],
            ['name' => 'Jajan', 'slug' => 'jajan', 'transaction_type' => 'expense', 'need_type' => 'want', 'icon' => 'coffee', 'color' => '#A16207', 'sort_order' => 19],
            ['name' => 'Hiburan', 'slug' => 'hiburan', 'transaction_type' => 'expense', 'need_type' => 'want', 'icon' => 'gamepad-2', 'color' => '#9333EA', 'sort_order' => 20],
            ['name' => 'Tabungan', 'slug' => 'tabungan', 'transaction_type' => 'expense', 'need_type' => 'saving', 'icon' => 'piggy-bank', 'color' => '#059669', 'sort_order' => 21],
            ['name' => 'Dana Darurat', 'slug' => 'dana-darurat', 'transaction_type' => 'expense', 'need_type' => 'saving', 'icon' => 'shield', 'color' => '#0F766E', 'sort_order' => 22],
            ['name' => 'Lainnya', 'slug' => 'lainnya', 'transaction_type' => 'both', 'need_type' => null, 'icon' => 'circle-ellipsis', 'color' => '#64748B', 'sort_order' => 99],
        ];

        foreach ($categories as $category) {
            TransactionCategory::query()->updateOrCreate(
                ['user_id' => null, 'slug' => $category['slug'], 'transaction_type' => $category['transaction_type']],
                [...$category, 'is_default' => true]
            );
        }
    }
}
