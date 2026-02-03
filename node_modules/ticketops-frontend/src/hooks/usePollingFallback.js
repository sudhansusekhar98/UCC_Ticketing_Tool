import { useEffect, useRef, useCallback } from 'react';
import socketService from '../services/socket';

/**
 * Hook that provides polling-based updates as a fallback when WebSockets are unavailable.
 * This ensures real-time-like updates even on serverless platforms like Vercel.
 * 
 * @param {Function} fetchFn - Function to call for fetching updates
 * @param {Object} options - Configuration options
 * @param {number} options.interval - Polling interval in ms (default: 30000)
 * @param {boolean} options.enabled - Whether polling is enabled (default: true)
 * @param {Array} options.deps - Dependencies that trigger a reset of the polling
 */
const usePollingFallback = (fetchFn, options = {}) => {
    const {
        interval = 30000, // 30 seconds default
        enabled = true,
        deps = [],
    } = options;

    const intervalRef = useRef(null);
    const isWebSocketActive = socketService.isSocketEnabled?.() || false;

    const startPolling = useCallback(() => {
        // Only poll if WebSocket is not available and polling is enabled
        if (isWebSocketActive || !enabled) {
            return;
        }

        // Clear any existing interval
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        console.log('[Polling] Starting fallback polling (interval:', interval, 'ms)');

        // Start polling
        intervalRef.current = setInterval(() => {
            fetchFn();
        }, interval);

    }, [fetchFn, interval, enabled, isWebSocketActive]);

    const stopPolling = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            console.log('[Polling] Stopped fallback polling');
        }
    }, []);

    // Manual trigger for immediate fetch
    const triggerNow = useCallback(() => {
        fetchFn();
    }, [fetchFn]);

    useEffect(() => {
        startPolling();

        return () => {
            stopPolling();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startPolling, stopPolling, ...deps]);

    // Pause polling when tab is not visible
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                stopPolling();
            } else {
                // Resume polling and fetch immediately when tab becomes visible
                if (!isWebSocketActive && enabled) {
                    fetchFn();
                    startPolling();
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [fetchFn, enabled, isWebSocketActive, startPolling, stopPolling]);

    return {
        isPolling: !isWebSocketActive && enabled,
        triggerNow,
        stopPolling,
        startPolling,
    };
};

export default usePollingFallback;
