import useCacheStore, { generateCacheKey, shouldCache } from '../context/cacheStore';

/**
 * Creates a cached version of an API function
 * @param {Function} apiFn - The original API function (must return a promise)
 * @param {string} baseUrl - The base URL pattern for cache key generation
 * @param {Object} options - Additional options
 * @returns {Function} - Cached API function
 */
export const withCache = (apiFn, baseUrl, options = {}) => {
    const {
        forceRefresh = false, // Bypass cache and fetch fresh
        onCacheHit = null,    // Callback when cache is used
    } = options;

    return async (...args) => {
        const cacheStore = useCacheStore.getState();

        // Generate cache key based on function arguments
        const params = args[0] || {};
        const cacheKey = generateCacheKey(baseUrl, typeof params === 'object' ? params : {});

        // Check if this endpoint should be cached
        if (!forceRefresh && shouldCache(baseUrl)) {
            const cachedData = cacheStore.get(cacheKey);

            if (cachedData) {
                onCacheHit?.();
                // Return cached data in the same format as axios response
                return { data: cachedData, fromCache: true };
            }
        }

        // Fetch fresh data
        const response = await apiFn(...args);

        // Cache the response if this endpoint should be cached
        if (shouldCache(baseUrl) && response.data) {
            cacheStore.set(cacheKey, response.data, baseUrl);
        }

        return { ...response, fromCache: false };
    };
};

/**
 * Create cached versions of all methods in an API object
 * @param {Object} apiObj - Object containing API methods
 * @param {string} basePath - Base path for this API group
 * @returns {Object} - Object with cached API methods
 */
export const createCachedApi = (apiObj, basePath) => {
    const cachedApi = {};

    for (const [methodName, methodFn] of Object.entries(apiObj)) {
        // Skip non-function properties
        if (typeof methodFn !== 'function') {
            cachedApi[methodName] = methodFn;
            continue;
        }

        // Only cache GET-like methods (those that don't modify data)
        const isReadMethod = ['get', 'getAll', 'getById', 'getDropdown', 'getByTicket',
            'getHistory', 'getStats', 'getByCategory', 'getUnreadCount', 'getLogs',
            'getInventory', 'getAvailability', 'getRequisitions', 'getTransfers',
            'getMovementLogs', 'getMovementStats', 'getStatuses', 'getPriorities',
            'getCategories', 'getAssetTypes', 'getAssetStatuses', 'getRoles',
            'getDeviceTypes', 'getAllDeviceTypes', 'getModels', 'getEngineers',
            'getContacts', 'getLocationNames', 'getAssetTypesForSite',
            'getDeviceTypesForSite', 'getCities', 'getEscalationUsers',
            'getAuditTrail', 'getDashboardStats', 'getTicketStats',
            'getSLAPerformance', 'getAssetStats', 'getRMAStats', 'getByUser',
            'getPendingByTicket'
        ].includes(methodName);

        if (isReadMethod) {
            cachedApi[methodName] = withCache(methodFn, `${basePath}/${methodName}`);
        } else {
            // For mutation methods, wrap to invalidate relevant caches
            cachedApi[methodName] = async (...args) => {
                const result = await methodFn(...args);

                // Invalidate related caches after mutations
                const cacheStore = useCacheStore.getState();
                cacheStore.invalidate(basePath);

                return result;
            };
        }
    }

    return cachedApi;
};

/**
 * Hook to use cached data with automatic refresh
 */
export const useCachedData = (cacheKey) => {
    const cachedData = useCacheStore(state => state.get(cacheKey));
    const invalidate = useCacheStore(state => state.invalidate);

    return {
        data: cachedData,
        invalidate: () => invalidate(cacheKey),
    };
};

/**
 * Utility to preload commonly used data into cache
 */
export const preloadCache = async (apis) => {
    const {
        lookupsApi,
        sitesApi,
        usersApi,
    } = apis;

    // Preload static data in parallel
    const preloadTasks = [
        lookupsApi?.getAll?.(),
        lookupsApi?.getStatuses?.(),
        lookupsApi?.getPriorities?.(),
        lookupsApi?.getCategories?.(),
        lookupsApi?.getAssetTypes?.(),
        lookupsApi?.getAssetStatuses?.(),
        lookupsApi?.getRoles?.(),
        lookupsApi?.getAllDeviceTypes?.(),
        sitesApi?.getDropdown?.(),
        sitesApi?.getCities?.(),
        usersApi?.getDropdown?.(),
        usersApi?.getEngineers?.(),
    ].filter(Boolean);

    try {
        await Promise.allSettled(preloadTasks);
        console.log('[Cache] Preloaded static data');
    } catch (error) {
        console.warn('[Cache] Some preload tasks failed:', error);
    }
};

export default { withCache, createCachedApi, useCachedData, preloadCache };
