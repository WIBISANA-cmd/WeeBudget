<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transaction_categories', function (Blueprint $table) {
            $table->foreignId('source_category_id')
                ->nullable()
                ->after('account_id')
                ->constrained('transaction_categories')
                ->nullOnDelete();

            $table->unique(['user_id', 'source_category_id']);
        });
    }

    public function down(): void
    {
        Schema::table('transaction_categories', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'source_category_id']);
            $table->dropConstrainedForeignId('source_category_id');
        });
    }
};
