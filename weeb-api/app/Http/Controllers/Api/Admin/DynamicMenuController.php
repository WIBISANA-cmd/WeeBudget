<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Concerns\RespondsWithApi;
use App\Http\Controllers\Controller;
use App\Models\DynEntity;
use App\Models\DynMenuSetting;
use App\Services\DynamicSchema\MetadataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class DynamicMenuController extends Controller
{
    use RespondsWithApi;

    // Core locked menus that can NEVER be deactivated by server
    public const LOCKED_MENU_KEYS = [
        'dashboard',
        'users',
        'data-builder',
        'menu-settings',
    ];

    public function __construct(
        protected MetadataService $metadataService
    ) {}

    /**
     * Get all combined menus (built-in + dynamic entities).
     */
    public function index(): JsonResponse
    {
        try {
            $menus = $this->buildFullMenuList();

            return $this->success($menus, 'Daftar menu berhasil dimuat.');
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'data' => null,
            ], 500);
        }
    }

    /**
     * Update menu settings (order, active status, icon).
     */
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'items' => ['required', 'array'],
            'items.*.menu_key' => ['required', 'string', 'max:100'],
            'items.*.is_active' => ['required', 'boolean'],
            'items.*.menu_order' => ['required', 'integer'],
            'items.*.icon' => ['nullable', 'string', 'max:50', 'regex:/^[a-zA-Z0-9_-]+$/'],
            'items.*.custom_label' => ['nullable', 'string', 'max:100'],
        ]);

        try {
            foreach ($validated['items'] as $item) {
                $key = $item['menu_key'];

                // Server-side enforcement: locked menus cannot be deactivated
                if (in_array($key, self::LOCKED_MENU_KEYS, true) && ! $item['is_active']) {
                    return response()->json([
                        'success' => false,
                        'message' => "Menu inti '{$key}' dikunci dan tidak dapat dinonaktifkan.",
                        'data' => null,
                    ], 400);
                }

                // If it's a dynamic entity menu (e.g. dyn_slug)
                if (str_starts_with($key, 'dyn_')) {
                    $slug = substr($key, 4);
                    $entity = DynEntity::where('slug', $slug)->first();
                    if ($entity) {
                        $entity->update([
                            'menu_order' => $item['menu_order'],
                            'icon' => $item['icon'] ?: $entity->icon,
                            'is_active' => $item['is_active'],
                        ]);
                    }
                } else {
                    DynMenuSetting::updateOrCreate(
                        ['menu_key' => $key],
                        [
                            'is_active' => $item['is_active'],
                            'menu_order' => $item['menu_order'],
                            'icon' => $item['icon'] ?? null,
                            'custom_label' => $item['custom_label'] ?? null,
                        ]
                    );
                }
            }

            $this->metadataService->clearCache();
            $updatedList = $this->buildFullMenuList();

            return $this->success($updatedList, 'Pengaturan menu berhasil disimpan.');
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'data' => null,
            ], 500);
        }
    }

    /**
     * Assemble full menu list from built-in definitions + dynamic entities + overrides.
     */
    private function buildFullMenuList(): array
    {
        $overrides = DynMenuSetting::all()->keyBy('menu_key');

        $builtInMenus = [
            [
                'menu_key' => 'dashboard',
                'label' => 'Dashboard',
                'path' => '/dashboard',
                'icon' => 'LayoutDashboard',
                'group' => 'main',
                'group_label' => 'Utama',
                'is_locked' => true,
                'default_order' => 10,
                'type' => 'builtin',
            ],
            [
                'menu_key' => 'transactions',
                'label' => 'Transaksi',
                'path' => '/transactions',
                'icon' => 'ArrowRightLeft',
                'group' => 'finance',
                'group_label' => 'Kelola Keuangan',
                'is_locked' => false,
                'default_order' => 20,
                'type' => 'builtin',
            ],
            [
                'menu_key' => 'accounts',
                'label' => 'Rekening',
                'path' => '/accounts',
                'icon' => 'Landmark',
                'group' => 'finance',
                'group_label' => 'Kelola Keuangan',
                'is_locked' => false,
                'default_order' => 30,
                'type' => 'builtin',
            ],
            [
                'menu_key' => 'budget-planner',
                'label' => 'Planner',
                'path' => '/budget-planner',
                'icon' => 'Calculator',
                'group' => 'finance',
                'group_label' => 'Kelola Keuangan',
                'is_locked' => false,
                'default_order' => 40,
                'type' => 'builtin',
            ],
            [
                'menu_key' => 'savings',
                'label' => 'Tabungan',
                'path' => '/savings',
                'icon' => 'Target',
                'group' => 'goals',
                'group_label' => 'Tujuan & Proteksi',
                'is_locked' => false,
                'default_order' => 50,
                'type' => 'builtin',
            ],
            [
                'menu_key' => 'couple-savings',
                'label' => 'Tabungan Berdua',
                'path' => '/couple-savings',
                'icon' => 'HeartHandshake',
                'group' => 'goals',
                'group_label' => 'Tujuan & Proteksi',
                'is_locked' => false,
                'default_order' => 60,
                'type' => 'builtin',
            ],
            [
                'menu_key' => 'emergency-fund',
                'label' => 'Dana Darurat',
                'path' => '/emergency-fund',
                'icon' => 'ShieldAlert',
                'group' => 'goals',
                'group_label' => 'Tujuan & Proteksi',
                'is_locked' => false,
                'default_order' => 70,
                'type' => 'builtin',
            ],
            [
                'menu_key' => 'wishlist',
                'label' => 'Wishlist',
                'path' => '/wishlist',
                'icon' => 'ListChecks',
                'group' => 'goals',
                'group_label' => 'Tujuan & Proteksi',
                'is_locked' => false,
                'default_order' => 80,
                'type' => 'builtin',
            ],
            [
                'menu_key' => 'bills',
                'label' => 'Tagihan',
                'path' => '/bills',
                'icon' => 'BellRing',
                'group' => 'schedule',
                'group_label' => 'Jadwal',
                'is_locked' => false,
                'default_order' => 90,
                'type' => 'builtin',
            ],
            [
                'menu_key' => 'recurring-transactions',
                'label' => 'Rutin',
                'path' => '/recurring-transactions',
                'icon' => 'Repeat',
                'group' => 'schedule',
                'group_label' => 'Jadwal',
                'is_locked' => false,
                'default_order' => 100,
                'type' => 'builtin',
            ],
            [
                'menu_key' => 'reports',
                'label' => 'Laporan',
                'path' => '/reports',
                'icon' => 'FileText',
                'group' => 'insights',
                'group_label' => 'Analitik',
                'is_locked' => false,
                'default_order' => 110,
                'type' => 'builtin',
            ],
            [
                'menu_key' => 'insights',
                'label' => 'Insight',
                'path' => '/insights',
                'icon' => 'Lightbulb',
                'group' => 'insights',
                'group_label' => 'Analitik',
                'is_locked' => false,
                'default_order' => 120,
                'type' => 'builtin',
            ],
            [
                'menu_key' => 'users',
                'label' => 'Kelola User',
                'path' => '/users',
                'icon' => 'Users',
                'group' => 'admin',
                'group_label' => 'Administrator',
                'is_locked' => true,
                'default_order' => 200,
                'type' => 'builtin',
            ],
            [
                'menu_key' => 'data-builder',
                'label' => 'Skema Dinamis',
                'path' => '/admin/data',
                'icon' => 'Database',
                'group' => 'admin',
                'group_label' => 'Administrator',
                'is_locked' => true,
                'default_order' => 210,
                'type' => 'builtin',
            ],
            [
                'menu_key' => 'menu-settings',
                'label' => 'Pengaturan Menu',
                'path' => '/admin/menu',
                'icon' => 'SlidersHorizontal',
                'group' => 'admin',
                'group_label' => 'Administrator',
                'is_locked' => true,
                'default_order' => 220,
                'type' => 'builtin',
            ],
        ];

        $result = [];

        // 1. Process Built-in Menus
        foreach ($builtInMenus as $m) {
            $key = $m['menu_key'];
            $ov = $overrides->get($key);

            $isActive = $m['is_locked'] ? true : ($ov ? (bool) $ov->is_active : true);
            $order = $ov ? (int) $ov->menu_order : $m['default_order'];
            $icon = $ov?->icon ?: $m['icon'];
            $label = $ov?->custom_label ?: $m['label'];

            $result[] = [
                'menu_key' => $key,
                'label' => $label,
                'path' => $m['path'],
                'icon' => $icon,
                'group' => $m['group'],
                'group_label' => $m['group_label'],
                'is_locked' => $m['is_locked'],
                'is_active' => $isActive,
                'menu_order' => $order,
                'type' => 'builtin',
            ];
        }

        // 2. Process Dynamic Entities
        $entities = DynEntity::all();
        foreach ($entities as $entity) {
            $key = "dyn_{$entity->slug}";

            $result[] = [
                'menu_key' => $key,
                'slug' => $entity->slug,
                'label' => $entity->label_plural ?: $entity->label,
                'path' => "/admin/data/{$entity->slug}",
                'icon' => $entity->icon ?: 'LayoutGrid',
                'group' => 'dynamic',
                'group_label' => 'Data Dinamis',
                'is_locked' => false,
                'is_active' => (bool) $entity->is_active,
                'menu_order' => (int) $entity->menu_order,
                'type' => 'dynamic',
                'source_type' => $entity->isBound() ? 'bound' : 'document',
            ];
        }

        usort($result, fn ($a, $b) => $a['menu_order'] <=> $b['menu_order']);

        return $result;
    }
}
