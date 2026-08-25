<?php

namespace Tests\Feature;

use App\Models\DynEntity;
use App\Models\DynField;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DynamicSchemaSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected string $adminToken;
    protected User $regularUser;
    protected string $regularToken;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $this->adminToken = $this->admin->createToken('admin-test')->plainTextToken;

        $this->regularUser = User::factory()->create(['role' => 'user', 'status' => 'active']);
        $this->regularToken = $this->regularUser->createToken('user-test')->plainTextToken;
    }

    public function test_unauthenticated_request_is_rejected_with_401(): void
    {
        $this->getJson('/api/admin/schema')->assertUnauthorized();
        $this->getJson('/api/admin/schema/_introspect')->assertUnauthorized();
        $this->getJson('/api/admin/menu')->assertUnauthorized();
    }

    public function test_non_admin_request_is_rejected_with_403(): void
    {
        $this->withToken($this->regularToken)
            ->getJson('/api/admin/schema')
            ->assertForbidden();

        $this->withToken($this->regularToken)
            ->getJson('/api/admin/schema/_introspect')
            ->assertForbidden();

        $this->withToken($this->regularToken)
            ->getJson('/api/admin/menu')
            ->assertForbidden();
    }

    public function test_introspect_rejects_system_schemas(): void
    {
        $this->withToken($this->adminToken)
            ->getJson('/api/admin/schema/_introspect/pg_catalog')
            ->assertStatus(400);

        $this->withToken($this->adminToken)
            ->getJson('/api/admin/schema/_introspect/information_schema')
            ->assertStatus(400);
    }

    public function test_sql_injection_in_table_name_is_safely_rejected(): void
    {
        $maliciousTable = 'users"; DROP TABLE dyn_entities; --';

        $this->withToken($this->adminToken)
            ->getJson('/api/admin/schema/_introspect/public/'.urlencode($maliciousTable))
            ->assertStatus(400);

        $this->assertTrue(\Illuminate\Support\Facades\Schema::hasTable('dyn_entities'));
    }

    public function test_search_term_with_sql_injection_returns_zero_results_without_error(): void
    {
        $entity = DynEntity::create([
            'slug' => 'test_search_sec',
            'label' => 'Sec Item',
            'label_plural' => 'Sec Items',
            'features' => ['create', 'edit', 'delete', 'search', 'filter'],
        ]);

        DynField::create([
            'entity_id' => $entity->id,
            'key' => 'title',
            'label' => 'Title',
            'type' => 'text',
        ]);

        $this->withToken($this->adminToken)
            ->postJson("/api/admin/dynamic/{$entity->slug}", ['title' => 'Sample Record'])
            ->assertCreated();

        $res = $this->withToken($this->adminToken)
            ->getJson("/api/admin/dynamic/{$entity->slug}?search=".urlencode("' OR 1=1 --"))
            ->assertOk();

        $this->assertCount(0, $res->json('data'));
    }

    public function test_disabled_feature_flags_are_enforced_at_server(): void
    {
        $entity = DynEntity::create([
            'slug' => 'read_only_sec',
            'label' => 'Read Only',
            'label_plural' => 'Read Onlys',
            'features' => ['search', 'filter'], // 'create', 'edit', 'delete', 'export', 'import' are disabled!
        ]);

        DynField::create([
            'entity_id' => $entity->id,
            'key' => 'name',
            'label' => 'Name',
            'type' => 'text',
        ]);

        // Attempt Create -> 403
        $this->withToken($this->adminToken)
            ->postJson("/api/admin/dynamic/{$entity->slug}", ['name' => 'Should Fail'])
            ->assertForbidden()
            ->assertJsonPath('message', "Fitur 'create' dinonaktifkan pada entitas ini.");

        // Attempt Export -> 403
        $this->withToken($this->adminToken)
            ->getJson("/api/admin/dynamic/{$entity->slug}?format=csv")
            ->assertForbidden();

        // Attempt Import -> 403
        $this->withToken($this->adminToken)
            ->postJson("/api/admin/dynamic/{$entity->slug}/import", ['csv_text' => "name\nTest"])
            ->assertForbidden();
    }
}
