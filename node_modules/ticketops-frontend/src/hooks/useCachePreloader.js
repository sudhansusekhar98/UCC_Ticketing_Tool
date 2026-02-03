import { useEffect, useCallback } from 'react';
import useCacheStore from '../context/cacheStore';
import { lookupsApi, sitesApi, usersApi, settingsApi } from '../services/api';
import useAuthStore from '../context/authStore';

/**
 * Hook that preloads commonly used data into cache after authentication
 * This improves perceived performance by fetching static data upfront
 */
const useCachePreloader = () => {
    const isAuthenticated = useAuthStore(state => state.isAuthenticated);
    const clearAll = useCacheStore(state => state.clearAll);
    const getStats = useCacheStore(state => state.getStats);

    const preloadStaticData = useCallback(async () => {
        if (!isAuthenticated) return;

        console.log('[Cache] Starting preload of static data...');

        // Preload in priority order - most commonly used first
        const highPriority = [
            lookupsApi.getAll(),
            sitesApi.getDropdown(),
            usersApi.getDropdown(),
        ];

        const mediumPriority = [
            lookupsApi.getStatuses(),
            lookupsApi.getPriorities(),
            lookupsApi.getCategories(),
            lookupsApi.getAssetTypes(),
            lookupsApi.getAssetStatuses(),
            lookupsApi.getRoles(),
            sitesApi.getCities(),
        ];

        const lowPriority = [
            lookupsApi.getAllDeviceTypes(),
            usersApi.getEngineers(),
            usersApi.getContacts(),
            settingsApi.getAll(),
        ];

        try {
            // Load high priority first
            await Promise.allSettled(highPriority);
            console.log('[Cache] High priority data loaded');

            // Then medium priority
            await Promise.allSettled(mediumPriority);
            console.log('[Cache] Medium priority data loaded');

            // Finally low priority (in background)
            Promise.allSettled(lowPriority).then(() => {
                console.log('[Cache] Low priority data loaded');
                const stats = getStats();
                console.log('[Cache] Preload complete:', stats);
            });

        } catch (error) {
            console.warn('[Cache] Some preload tasks failed:', error);
        }
    }, [isAuthenticated, getStats]);

    // Clear cache on logout
    const handleLogout = useCallback(() => {
        if (!isAuthenticated) {
            clearAll();
            console.log('[Cache] Cleared on logout');
        }
    }, [isAuthenticated, clearAll]);

    // Preload on authentication
    useEffect(() => {
        if (isAuthenticated) {
            // Small delay to not compete with initial page load
            const timer = setTimeout(preloadStaticData, 1000);
            return () => clearTimeout(timer);
        } else {
            handleLogout();
        }
    }, [isAuthenticated, preloadStaticData, handleLogout]);

    return {
        preloadStaticData,
        clearCache: clearAll,
        getCacheStats: getStats,
    };
};

export default useCachePreloader;
