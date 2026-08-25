<?php

namespace Tests\Feature;

use App\Models\DynEntity;
use App\Models\DynField;
use App\Models\DynRecord;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PostgresDynamicSchemaVerificationTest extends TestCase
{
    public function test_postgres_jsonb_typeof_is_object(): void
    {
        $driver = DB::getDriverName();
        if ($driver !== 'pgsql') {
            $this->markTestSkipped('Only runs on PostgreSQL connection.');
        }

        $entity = DynEntity::create([
            'slug' => 'test_jsonb_obj',
            'label' => 'JSONB Test',
            'label_plural' => 'JSONB Tests',
        ]);

        $record = DynRecord::create([
            'entity_id' => $entity->id,
            'data' => [
                'name' => 'Sample',
                'amount' => 100,
            ],
        ]);

        $typeRow = DB::selectOne("SELECT jsonb_typeof(data) as jtype FROM dyn_records WHERE id = ?", [$record->id]);
        $this->assertEquals('object', $typeRow->jtype);

        $record->delete();
        $entity->delete();
    }
}
