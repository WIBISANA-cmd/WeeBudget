<?php

namespace Tests\Feature;

use App\Models\DynEntity;
use App\Models\DynField;
use App\Models\DynRecord;
use App\Models\DynUniqueValue;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DynamicSchemaStorageTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected string $adminToken;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $this->adminToken = $this->admin->createToken('admin-test')->plainTextToken;
    }

    public function test_document_mode_full_crud_and_validation(): void
    {
        // 1. Create dynamic entity
        $entityRes = $this->withToken($this->adminToken)
            ->postJson('/api/admin/schema', [
                'slug' => 'products',
                'label' => 'Produk',
                'label_plural' => 'Daftar Produk',
                'icon' => 'Package',
                'initial_fields' => [
                    [
                        'key' => 'sku',
                        'label' => 'SKU',
                        'type' => 'text',
                        'is_required' => true,
                        'is_unique' => true,
                    ],
                    [
                        'key' => 'name',
                        'label' => 'Nama Produk',
                        'type' => 'text',
                        'is_required' => true,
                    ],
                    [
                        'key' => 'price',
                        'label' => 'Harga',
                        'type' => 'number',
                        'is_required' => true,
                    ],
                    [
                        'key' => 'in_stock',
                        'label' => 'Tersedia',
                        'type' => 'boolean',
                    ],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.slug', 'products');

        $entityId = $entityRes->json('data.id');

        // 2. Missing required field -> 400
        $this->withToken($this->adminToken)
            ->postJson('/api/admin/dynamic/products', [
                'sku' => 'SKU-001',
                // missing 'name' and 'price'
            ])
            ->assertStatus(400)
            ->assertJsonPath('errors.name.0', "Field 'Nama Produk' wajib diisi.");

        // 3. Create first valid record
        $createRes1 = $this->withToken($this->adminToken)
            ->postJson('/api/admin/dynamic/products', [
                'sku' => 'SKU-001',
                'name' => 'Laptop Ultra',
                'price' => 15000000,
                'in_stock' => true,
            ])
            ->assertCreated()
            ->assertJsonPath('data.sku', 'SKU-001')
            ->assertJsonPath('data.price', 15000000);

        $recordId1 = $createRes1->json('data.id');

        // 4. Duplicate unique value -> 409
        $this->withToken($this->adminToken)
            ->postJson('/api/admin/dynamic/products', [
                'sku' => 'SKU-001', // duplicate!
                'name' => 'Laptop Ultra 2',
                'price' => 17000000,
            ])
            ->assertStatus(409)
            ->assertJsonPath('message', "Nilai 'SKU-001' pada field 'SKU' sudah digunakan.");

        // 5. Read single record
        $this->withToken($this->adminToken)
            ->getJson("/api/admin/dynamic/products/{$recordId1}")
            ->assertOk()
            ->assertJsonPath('data.name', 'Laptop Ultra');

        // 6. Partial update (merge)
        $this->withToken($this->adminToken)
            ->putJson("/api/admin/dynamic/products/{$recordId1}", [
                'name' => 'Laptop Ultra Pro',
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Laptop Ultra Pro')
            ->assertJsonPath('data.sku', 'SKU-001'); // preserved

        // 7. Delete record & verify slot freed
        $this->withToken($this->adminToken)
            ->deleteJson("/api/admin/dynamic/products/{$recordId1}")
            ->assertOk();

        // 8. Re-use freed unique value -> succeeds
        $this->withToken($this->adminToken)
            ->postJson('/api/admin/dynamic/products', [
                'sku' => 'SKU-001', // now available again!
                'name' => 'Laptop Ultra Reborn',
                'price' => 16000000,
            ])
            ->assertCreated();
    }

    public function test_relation_validation_and_cascade_protection(): void
    {
        // 1. Create authors entity
        $authorEntity = DynEntity::create([
            'slug' => 'authors',
            'label' => 'Author',
            'label_plural' => 'Authors',
        ]);
        DynField::create([
            'entity_id' => $authorEntity->id,
            'key' => 'name',
            'label' => 'Name',
            'type' => 'text',
            'is_required' => true,
        ]);

        // 2. Create books entity with relation to authors
        $bookEntity = DynEntity::create([
            'slug' => 'books',
            'label' => 'Book',
            'label_plural' => 'Books',
        ]);
        DynField::create([
            'entity_id' => $bookEntity->id,
            'key' => 'title',
            'label' => 'Title',
            'type' => 'text',
            'is_required' => true,
        ]);
        DynField::create([
            'entity_id' => $bookEntity->id,
            'key' => 'author_id',
            'label' => 'Author',
            'type' => 'relation',
            'is_required' => true,
            'options' => ['relation' => ['entity' => 'authors', 'display' => 'name']],
        ]);

        // Attempt relation to non-existent author -> 400
        $this->withToken($this->adminToken)
            ->postJson('/api/admin/dynamic/books', [
                'title' => 'Book 1',
                'author_id' => 99999,
            ])
            ->assertStatus(400);

        // Create author record
        $authorRes = $this->withToken($this->adminToken)
            ->postJson('/api/admin/dynamic/authors', ['name' => 'John Doe'])
            ->assertCreated();
        $authorId = $authorRes->json('data.id');

        // Create book referencing valid author
        $bookRes = $this->withToken($this->adminToken)
            ->postJson('/api/admin/dynamic/books', [
                'title' => 'Book 1',
                'author_id' => $authorId,
            ])
            ->assertCreated();
        $bookId = $bookRes->json('data.id');

        // Attempt deleting referenced author -> 409 blocked!
        $this->withToken($this->adminToken)
            ->deleteJson("/api/admin/dynamic/authors/{$authorId}")
            ->assertStatus(409);

        // Delete book first, then deleting author succeeds
        $this->withToken($this->adminToken)
            ->deleteJson("/api/admin/dynamic/books/{$bookId}")
            ->assertOk();

        $this->withToken($this->adminToken)
            ->deleteJson("/api/admin/dynamic/authors/{$authorId}")
            ->assertOk();
    }

    public function test_numeric_sorting_and_pagination(): void
    {
        $entity = DynEntity::create([
            'slug' => 'items',
            'label' => 'Item',
            'label_plural' => 'Items',
        ]);
        DynField::create([
            'entity_id' => $entity->id,
            'key' => 'amount',
            'label' => 'Amount',
            'type' => 'number',
        ]);

        // Insert numbers 12, 2, 5
        foreach ([12, 2, 5] as $val) {
            $this->withToken($this->adminToken)
                ->postJson('/api/admin/dynamic/items', ['amount' => $val])
                ->assertCreated();
        }

        // Sort asc -> must be [2, 5, 12] (numeric, not lexicographical [12, 2, 5])
        $res = $this->withToken($this->adminToken)
            ->getJson('/api/admin/dynamic/items?sort=amount&dir=asc')
            ->assertOk();

        $amounts = array_map(fn ($i) => $i['amount'], $res->json('data'));
        $this->assertEquals([2, 5, 12], $amounts);
    }

    public function test_field_metadata_immutability_of_key_and_type(): void
    {
        $entity = DynEntity::create([
            'slug' => 'articles',
            'label' => 'Article',
            'label_plural' => 'Articles',
        ]);

        $field = DynField::create([
            'entity_id' => $entity->id,
            'key' => 'title',
            'label' => 'Title',
            'type' => 'text',
        ]);

        // Updating label is allowed
        $this->withToken($this->adminToken)
            ->putJson("/api/admin/schema/articles/fields/{$field->id}", [
                'label' => 'Updated Title',
            ])
            ->assertOk()
            ->assertJsonPath('data.label', 'Updated Title');

        // Attempting to change key -> rejected with 400
        $this->withToken($this->adminToken)
            ->putJson("/api/admin/schema/articles/fields/{$field->id}", [
                'key' => 'new_key',
            ])
            ->assertStatus(400);

        // Attempting to change type -> rejected with 400
        $this->withToken($this->adminToken)
            ->putJson("/api/admin/schema/articles/fields/{$field->id}", [
                'type' => 'number',
            ])
            ->assertStatus(400);
    }

    public function test_csv_template_and_import(): void
    {
        $entity = DynEntity::create([
            'slug' => 'customers',
            'label' => 'Customer',
            'label_plural' => 'Customers',
        ]);
        DynField::create([
            'entity_id' => $entity->id,
            'key' => 'email',
            'label' => 'Email',
            'type' => 'email',
            'is_required' => true,
            'order_index' => 1,
        ]);
        DynField::create([
            'entity_id' => $entity->id,
            'key' => 'age',
            'label' => 'Age',
            'type' => 'number',
            'order_index' => 2,
        ]);

        // 1. Download template
        $templateRes = $this->withToken($this->adminToken)
            ->get('/api/admin/dynamic/customers?format=csv&template=1')
            ->assertOk();

        $content = $templateRes->streamedContent();
        $this->assertStringContainsString('email,age', $content);

        // 2. Import CSV with 1 valid row, 1 invalid row (invalid email)
        $csvData = "email,age\nvalid@example.com,25\ninvalid-email,30";
        $importRes = $this->withToken($this->adminToken)
            ->postJson('/api/admin/dynamic/customers/import', ['csv_text' => $csvData])
            ->assertOk()
            ->assertJsonPath('data.imported', 1)
            ->assertJsonPath('data.failed', 1)
            ->assertJsonPath('data.errors.0.row', 3);

        // Verify that the valid row was inserted
        $this->withToken($this->adminToken)
            ->getJson('/api/admin/dynamic/customers')
            ->assertOk()
            ->assertJsonPath('meta.total', 1);
    }

    public function test_menu_customization_and_locked_menu_protection(): void
    {
        // 1. Fetch all menus
        $menuRes = $this->withToken($this->adminToken)
            ->getJson('/api/admin/menu')
            ->assertOk();

        $menus = $menuRes->json('data');
        $dashboardMenu = collect($menus)->firstWhere('menu_key', 'dashboard');
        $this->assertTrue($dashboardMenu['is_locked']);

        // 2. Attempt deactivating locked menu -> 400 rejected
        $this->withToken($this->adminToken)
            ->putJson('/api/admin/menu', [
                'items' => [
                    [
                        'menu_key' => 'dashboard',
                        'is_active' => false,
                        'menu_order' => 10,
                    ],
                ],
            ])
            ->assertStatus(400);

        // 3. Deactivating unlocked menu -> succeeds
        $this->withToken($this->adminToken)
            ->putJson('/api/admin/menu', [
                'items' => [
                    [
                        'menu_key' => 'bills',
                        'is_active' => false,
                        'menu_order' => 90,
                    ],
                ],
            ])
            ->assertOk();
    }
}
