<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('dyn_entities', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 50)->unique();
            $table->string('label');
            $table->string('label_plural');
            $table->string('icon', 50)->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->jsonb('features')->default(json_encode(['create', 'edit', 'delete', 'search', 'filter', 'export', 'import']));
            $table->integer('menu_order')->default(100);
            $table->string('source_schema')->nullable();
            $table->string('source_table')->nullable();
            $table->string('source_pk')->nullable();
            $table->timestamps();
        });

        Schema::create('dyn_fields', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entity_id')->constrained('dyn_entities')->cascadeOnDelete();
            $table->string('key', 50);
            $table->string('label');
            $table->string('type', 30);
            $table->boolean('is_required')->default(false);
            $table->boolean('is_unique')->default(false);
            $table->text('default_value')->nullable();
            $table->jsonb('options')->default(json_encode(new \stdClass()));
            $table->integer('order_index')->default(0);
            $table->boolean('list_visible')->default(true);
            $table->boolean('form_visible')->default(true);
            $table->text('placeholder')->nullable();
            $table->text('help_text')->nullable();
            $table->timestamps();

            $table->unique(['entity_id', 'key']);
        });

        Schema::create('dyn_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entity_id')->constrained('dyn_entities')->cascadeOnDelete();
            $table->jsonb('data')->default(json_encode(new \stdClass()));
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['entity_id', 'created_at']);
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('CREATE INDEX IF NOT EXISTS dyn_records_data_gin ON dyn_records USING gin (data);');
        }

        Schema::create('dyn_unique_values', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entity_id')->constrained('dyn_entities')->cascadeOnDelete();
            $table->foreignId('record_id')->constrained('dyn_records')->cascadeOnDelete();
            $table->string('field_key', 50);
            $table->text('value');
            $table->timestamps();

            $table->unique(['entity_id', 'field_key', 'value']);
        });

        Schema::create('dyn_menu_settings', function (Blueprint $table) {
            $table->id();
            $table->string('menu_key', 100)->unique();
            $table->boolean('is_active')->default(true);
            $table->integer('menu_order')->default(100);
            $table->string('icon', 50)->nullable();
            $table->string('custom_label')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dyn_menu_settings');
        Schema::dropIfExists('dyn_unique_values');

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS dyn_records_data_gin;');
        }

        Schema::dropIfExists('dyn_records');
        Schema::dropIfExists('dyn_fields');
        Schema::dropIfExists('dyn_entities');
    }
};
