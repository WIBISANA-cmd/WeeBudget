<?php

namespace App\Services\DynamicSchema;

use App\Models\DynEntity;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Cache;

class MetadataService
{
    public const CACHE_KEY = 'dyn_schema_all_entities';
    public const CACHE_TTL_SECONDS = 30;

    /**
     * Process-level in-memory cache to avoid repeated queries and serialization issues.
     *
     * @var Collection<int, DynEntity>|null
     */
    private static ?Collection $memoizedEntities = null;

    /**
     * Get all active and inactive entities with their fields loaded, using memory caching.
     *
     * @return Collection<int, DynEntity>
     */
    public function getAllEntities(): Collection
    {
        if (self::$memoizedEntities instanceof Collection) {
            return self::$memoizedEntities;
        }

        try {
            $cached = Cache::get(self::CACHE_KEY);
            if ($cached instanceof Collection) {
                self::$memoizedEntities = $cached;
                return self::$memoizedEntities;
            }
        } catch (\Throwable) {
            // If cache serialization/unserialization fails or returns incomplete class, clear and re-query
            Cache::forget(self::CACHE_KEY);
        }

        $fresh = DynEntity::with(['fields' => fn ($q) => $q->orderBy('order_index')])
            ->orderBy('menu_order')
            ->orderBy('id')
            ->get();

        self::$memoizedEntities = $fresh;

        return self::$memoizedEntities;
    }

    /**
     * Find an entity by slug with its fields.
     */
    public function getEntityBySlug(string $slug): ?DynEntity
    {
        $entities = $this->getAllEntities();
        $found = $entities->firstWhere('slug', $slug);

        if (! $found) {
            $found = DynEntity::with(['fields' => fn ($q) => $q->orderBy('order_index')])
                ->where('slug', $slug)
                ->first();

            if ($found) {
                self::$memoizedEntities = null;
            }
        }

        return $found;
    }

    /**
     * Explicitly invalidate the metadata cache.
     */
    public function clearCache(): void
    {
        self::$memoizedEntities = null;

        try {
            Cache::forget(self::CACHE_KEY);
        } catch (\Throwable) {
            // Ignore cache store errors on cleanup
        }
    }
}
