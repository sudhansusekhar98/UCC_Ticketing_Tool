import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Cache configuration
const CACHE_CONFIG = {
    // How long data stays fresh (in milliseconds)
    TTL: {
        SHORT: 1 * 60 * 1000,         // 1 minute - for frequently changing data
        MEDIUM: 5 * 60 * 1000,        // 5 minutes - for moderately dynamic data
        LONG: 30 * 60 * 1000,         // 30 minutes - for rarely changing data
        VERY_LONG: 60 * 60 * 1000,    // 1 hour - for static data like lookups
    },
    // Maximum number of items to cache
    MAX_ITEMS: 200,
    // Maximum cache size in bytes (5MB)
    MAX_SIZE: 5 * 1024 * 1024,
};

// Define which endpoints should be cached and for how long
const CACHE_RULES = {
    // Lookups - rarely change, cache for long time
    '/lookups': CACHE_CONFIG.TTL.VERY_LONG,
    '/lookups/statuses': CACHE_CONFIG.TTL.VERY_LONG,
    '/lookups/priorities': CACHE_CONFIG.TTL.VERY_LONG,
    '/lookups/categories': CACHE_CONFIG.TTL.VERY_LONG,
    '/lookups/asset-types': CACHE_CONFIG.TTL.VERY_LONG,
    '/lookups/asset-statuses': CACHE_CONFIG.TTL.VERY_LONG,
    '/lookups/roles': CACHE_CONFIG.TTL.VERY_LONG,
    '/lookups/device-types': CACHE_CONFIG.TTL.VERY_LONG,
    '/lookups/device-types/all': CACHE_CONFIG.TTL.VERY_LONG,
    '/lookups/models': CACHE_CONFIG.TTL.LONG,

    // Sites - moderately static
    '/sites': CACHE_CONFIG.TTL.LONG,
    '/sites/dropdown': CACHE_CONFIG.TTL.LONG,
    '/sites/cities': CACHE_CONFIG.TTL.LONG,

    // Users - moderately static
    '/users': CACHE_CONFIG.TTL.MEDIUM,
    '/users/dropdown': CACHE_CONFIG.TTL.MEDIUM,
    '/users/engineers': CACHE_CONFIG.TTL.MEDIUM,
    '/users/contacts': CACHE_CONFIG.TTL.MEDIUM,

    // Assets - dynamic but can be cached briefly
    '/assets': CACHE_CONFIG.TTL.SHORT,
    '/assets/dropdown': CACHE_CONFIG.TTL.MEDIUM,
    '/assets/locations': CACHE_CONFIG.TTL.MEDIUM,
    '/assets/asset-types': CACHE_CONFIG.TTL.MEDIUM,
    '/assets/device-types': CACHE_CONFIG.TTL.MEDIUM,

    // Dashboard stats - cache briefly
    '/tickets/dashboard/stats': CACHE_CONFIG.TTL.SHORT,

    // Stock inventory - cache briefly
    '/stock/inventory': CACHE_CONFIG.TTL.SHORT,
    '/stock/movement-stats': CACHE_CONFIG.TTL.SHORT,

    // Settings - rarely change
    '/settings': CACHE_CONFIG.TTL.LONG,

    // User rights - moderately static
    '/user-rights': CACHE_CONFIG.TTL.MEDIUM,
};

// Endpoints that should NEVER be cached (mutations, sensitive data)
const NO_CACHE_ENDPOINTS = [
    '/auth/',
    '/notifications/unread-count',
    '/tickets/', // Individual ticket details should be fresh
    '/rma/',
];

/**
 * Generate a unique cache key from URL and params
 */
const generateCacheKey = (url, params = {}) => {
    const sortedParams = Object.keys(params)
        .sort()
        .map(key => `${key}=${JSON.stringify(params[key])}`)
        .join('&');
    return `cache:${url}${sortedParams ? '?' + sortedParams : ''}`;
};

/**
 * Check if a URL should be cached
 */
const shouldCache = (url) => {
    // Check if URL is in no-cache list
    for (const pattern of NO_CACHE_ENDPOINTS) {
        if (url.includes(pattern)) {
            return false;
        }
    }

    // Check if URL matches any cache rule
    for (const pattern of Object.keys(CACHE_RULES)) {
        if (url.includes(pattern)) {
            return true;
        }
    }

    return false;
};

/**
 * Get TTL for a URL
 */
const getTTL = (url) => {
    for (const [pattern, ttl] of Object.entries(CACHE_RULES)) {
        if (url.includes(pattern)) {
            return ttl;
        }
    }
    return CACHE_CONFIG.TTL.SHORT;
};

/**
 * Cache Store - manages all cached API responses
 */
const useCacheStore = create(
    persist(
        (set, get) => ({
            cache: {},
            lastCleanup: Date.now(),

            /**
             * Get cached data if available and not expired
             */
            get: (key) => {
                const { cache } = get();
                const cached = cache[key];

                if (!cached) return null;

                // Check if expired
                if (Date.now() > cached.expiresAt) {
                    // Remove expired item
                    get().remove(key);
                    return null;
                }

                return cached.data;
            },

            /**
             * Set cache with automatic TTL
             */
            set: (key, data, url) => {
                const { cache } = get();
                const ttl = getTTL(url);

                const newCache = {
                    ...cache,
                    [key]: {
                        data,
                        createdAt: Date.now(),
                        expiresAt: Date.now() + ttl,
                        url,
                    }
                };

                set({ cache: newCache });

                // Periodic cleanup
                get().maybeCleanup();
            },

            /**
             * Remove a specific cache entry
             */
            remove: (key) => {
                const { cache } = get();
                const newCache = { ...cache };
                delete newCache[key];
                set({ cache: newCache });
            },

            /**
             * Invalidate cache entries matching a pattern
             */
            invalidate: (pattern) => {
                const { cache } = get();
                const newCache = {};

                for (const [key, value] of Object.entries(cache)) {
                    if (!key.includes(pattern) && !value.url?.includes(pattern)) {
                        newCache[key] = value;
                    }
                }

                set({ cache: newCache });
            },

            /**
             * Invalidate all caches related to a specific resource type
             */
            invalidateResource: (resourceType) => {
                const patterns = {
                    tickets: ['/tickets'],
                    assets: ['/assets', '/stock'],
                    users: ['/users'],
                    sites: ['/sites'],
                    stock: ['/stock', '/assets'],
                    rma: ['/rma', '/tickets'],
                    lookups: ['/lookups'],
                };

                const resourcePatterns = patterns[resourceType] || [resourceType];
                resourcePatterns.forEach(pattern => get().invalidate(pattern));
            },

            /**
             * Clear all cache
             */
            clearAll: () => {
                set({ cache: {} });
            },

            /**
             * Periodic cleanup of expired entries
             */
            maybeCleanup: () => {
                const { cache, lastCleanup } = get();

                // Run cleanup every 5 minutes
                if (Date.now() - lastCleanup < 5 * 60 * 1000) return;

                const now = Date.now();
                const newCache = {};
                let itemCount = 0;

                // Sort by creation time (newest first) and filter expired
                const entries = Object.entries(cache)
                    .filter(([, value]) => now < value.expiresAt)
                    .sort((a, b) => b[1].createdAt - a[1].createdAt);

                // Keep only MAX_ITEMS newest entries
                for (const [key, value] of entries) {
                    if (itemCount >= CACHE_CONFIG.MAX_ITEMS) break;
                    newCache[key] = value;
                    itemCount++;
                }

                set({ cache: newCache, lastCleanup: now });
            },

            /**
             * Get cache statistics
             */
            getStats: () => {
                const { cache } = get();
                const entries = Object.entries(cache);
                const now = Date.now();

                return {
                    totalItems: entries.length,
                    expiredItems: entries.filter(([, v]) => now > v.expiresAt).length,
                    activeItems: entries.filter(([, v]) => now <= v.expiresAt).length,
                    estimatedSize: JSON.stringify(cache).length,
                };
            },
        }),
        {
            name: 'api-cache-storage',
            partialize: (state) => ({
                cache: state.cache,
                lastCleanup: state.lastCleanup,
            }),
        }
    )
);

export default useCacheStore;
export { generateCacheKey, shouldCache, getTTL, CACHE_CONFIG, CACHE_RULES };
