import axios from 'axios';
import useCacheStore, { generateCacheKey, shouldCache } from '../context/cacheStore';

// Use environment variable for API URL, fallback to localhost for development
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - add auth token and check cache
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Only cache GET requests
        if (config.method === 'get' && !config.skipCache) {
            const url = config.url;

            if (shouldCache(url)) {
                const cacheKey = generateCacheKey(url, config.params || {});
                const cachedData = useCacheStore.getState().get(cacheKey);

                if (cachedData) {
                    // Return cached data by throwing a special "error" that will be caught
                    const error = new Error('CACHE_HIT');
                    error.cachedResponse = { data: cachedData, fromCache: true, status: 200 };
                    error.isCacheHit = true;
                    throw error;
                }
            }
        }

        return config;
    },
    (error) => {
        // Check if this is a cache hit "error"
        if (error.isCacheHit) {
            return Promise.reject(error);
        }
        return Promise.reject(error);
    }
);

// Response interceptor - handle token refresh and cache responses
api.interceptors.response.use(
    (response) => {
        // Cache successful GET responses
        if (response.config.method === 'get' && !response.config.skipCache) {
            const url = response.config.url;

            if (shouldCache(url)) {
                const cacheKey = generateCacheKey(url, response.config.params || {});
                useCacheStore.getState().set(cacheKey, response.data, url);
            }
        }

        // Invalidate related caches on mutations
        if (['post', 'put', 'patch', 'delete'].includes(response.config.method)) {
            const url = response.config.url;
            const cacheStore = useCacheStore.getState();

            // Determine which resource type to invalidate
            if (url.includes('/tickets')) cacheStore.invalidateResource('tickets');
            if (url.includes('/assets')) cacheStore.invalidateResource('assets');
            if (url.includes('/users')) cacheStore.invalidateResource('users');
            if (url.includes('/sites')) cacheStore.invalidateResource('sites');
            if (url.includes('/stock')) cacheStore.invalidateResource('stock');
            if (url.includes('/rma')) cacheStore.invalidateResource('rma');
            if (url.includes('/lookups')) cacheStore.invalidateResource('lookups');
        }

        return response;
    },
    async (error) => {
        // Handle cache hits
        if (error.isCacheHit) {
            return error.cachedResponse;
        }

        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (refreshToken) {
                    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                        refreshToken,
                    });

                    // Express.js returns { token } instead of { accessToken }
                    const { token } = response.data.data;
                    localStorage.setItem('accessToken', token);

                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return api(originalRequest);
                }
            } catch {
                // Refresh failed - clear tokens and redirect to login
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                // Also clear cache on logout
                useCacheStore.getState().clearAll();
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);

export default api;


// Auth API
export const authApi = {
    login: (username, password) =>
        api.post('/auth/login', { username, password }),
    logout: () => api.post('/auth/logout'),
    refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
    changePassword: (currentPassword, newPassword) =>
        api.put('/auth/change-password', { currentPassword, newPassword }),
    getProfile: () => api.get('/auth/me'),
    updatePreferences: (preferences) => api.put('/auth/preferences', { preferences }),
    updateProfilePicture: (file) => {
        const formData = new FormData();
        formData.append('profilePicture', file);
        return api.put('/auth/profile-picture', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
};

// Users API
export const usersApi = {
    getAll: (params) => api.get('/users', { params }),
    getById: (id) => api.get(`/users/${id}`),
    create: (data) => api.post('/users', data),
    update: (id, data) => api.put(`/users/${id}`, data),
    delete: (id) => api.delete(`/users/${id}`),
    getDropdown: (role) => api.get('/users/dropdown', { params: { role } }),
    getEngineers: () => api.get('/users/engineers'),
    getContacts: () => api.get('/users/contacts'),
    getEscalationUsers: (siteId, level) => api.get('/users/escalation-users', { params: { siteId, level } }),
};

// Sites API
export const sitesApi = {
    getAll: (params) => api.get('/sites', { params }),
    getById: (id) => api.get(`/sites/${id}`),
    create: (data) => api.post('/sites', data),
    update: (id, data) => api.put(`/sites/${id}`, data),
    delete: (id) => api.delete(`/sites/${id}`),
    getDropdown: () => api.get('/sites/dropdown'),
    getCities: () => api.get('/sites/cities'),
};

// Assets API
export const assetsApi = {
    getAll: (params) => api.get('/assets', { params }),
    getById: (id) => api.get(`/assets/${id}`),
    create: (data) => api.post('/assets', data),
    update: (id, data) => api.put(`/assets/${id}`, data),
    delete: (id) => api.delete(`/assets/${id}`),
    updateStatus: (id, status) => api.patch(`/assets/${id}/status`, {}, { params: { status } }),
    getDropdown: (siteId, assetType) => api.get('/assets/dropdown', { params: { siteId, assetType } }),
    getLocationNames: (siteId) => api.get('/assets/locations', { params: { siteId } }),
    getAssetTypesForSite: (siteId, locationName) => api.get('/assets/asset-types', { params: { siteId, locationName } }),
    getDeviceTypesForSite: (siteId, locationName, assetType) => api.get('/assets/device-types', { params: { siteId, locationName, assetType } }),
    getSitesWithAssets: () => api.get('/assets/sites-with-assets'),
    // Bulk operations
    downloadTemplate: () => api.get('/assets/template', { responseType: 'blob' }),
    exportAssets: (params) => api.get('/assets/export', { params, responseType: 'blob' }),
    bulkImport: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/assets/import', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    checkStatus: (params) => api.post('/assets/check-status', {}, { params }),
    getPingProgress: () => api.get('/assets/ping-progress', { skipCache: true }),
    clearPingProgress: () => api.delete('/assets/ping-progress'),
    bulkStatusUpdate: (results) => api.post('/assets/bulk-status-update', { results }),
    exportStatusReport: (params) => api.get('/assets/export-status', { params, responseType: 'blob' }),
};

// Tickets API
export const ticketsApi = {
    getAll: (params) => api.get('/tickets', { params }),
    getById: (id) => api.get(`/tickets/${id}`),
    create: (data) => api.post('/tickets', data),
    update: (id, data) => api.put(`/tickets/${id}`, data),
    assign: (id, data) => api.post(`/tickets/${id}/assign`, data),
    acknowledge: (id) => api.post(`/tickets/${id}/acknowledge`),
    start: (id) => api.post(`/tickets/${id}/start`),
    resolve: (id, data) => api.post(`/tickets/${id}/resolve`, data),
    verify: (id) => api.post(`/tickets/${id}/verify`),
    rejectResolution: (id, reason) => api.post(`/tickets/${id}/reject-resolution`, { reason }),
    acknowledgeRejection: (id) => api.post(`/tickets/${id}/acknowledge-rejection`),
    escalate: (id, data) => api.post(`/tickets/${id}/escalate`, data),
    acceptEscalation: (id, data) => api.post(`/tickets/${id}/accept-escalation`, data),
    close: (id, data) => api.post(`/tickets/${id}/close`, data),
    reopen: (id, reason) => api.post(`/tickets/${id}/reopen`, { reason }),
    getAuditTrail: (id) => api.get(`/tickets/${id}/audit`),
    getDashboardStats: (params) => api.get('/tickets/dashboard/stats', { params }),
};

// Lookups API
export const lookupsApi = {
    getAll: () => api.get('/lookups'),
    getStatuses: () => api.get('/lookups/statuses'),
    getPriorities: () => api.get('/lookups/priorities'),
    getCategories: () => api.get('/lookups/categories'),
    getAssetTypes: () => api.get('/lookups/asset-types'),
    getAssetStatuses: () => api.get('/lookups/asset-statuses'),
    getRoles: () => api.get('/lookups/roles'),
    // Device Types
    getDeviceTypes: (assetType) => api.get('/lookups/device-types', { params: { assetType } }),
    getAllDeviceTypes: () => api.get('/lookups/device-types/all'),
    // Models
    getModels: (assetType, deviceType) => api.get('/lookups/models', { params: { assetType, deviceType } }),
    createDeviceType: (data) => api.post('/lookups/device-types', data),
    deleteDeviceType: (id) => api.delete(`/lookups/device-types/${id}`),
    seedDeviceTypes: () => api.post('/lookups/device-types/seed'),
};

// Activities API
export const activitiesApi = {
    getByTicket: (ticketId) => api.get(`/tickets/${ticketId}/activities`),
    create: (ticketId, data) => api.post(`/tickets/${ticketId}/activities`, data),
    uploadAttachment: (ticketId, file, activityId = null) => {
        const formData = new FormData();
        formData.append('file', file);
        const params = activityId ? { activityId } : {};
        return api.post(`/tickets/${ticketId}/activities/attachments`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            params
        });
    },
    downloadAttachment: (attachmentId) =>
        api.get(`/activities/attachments/${attachmentId}/download`, { responseType: 'blob' }),
    deleteAttachment: (attachmentId) =>
        api.delete(`/activities/attachments/${attachmentId}`),
};

// Settings API
export const settingsApi = {
    getAll: () => api.get('/settings'),
    getByCategory: (category) => api.get(`/settings/${category}`),
    update: (settings) => api.put('/settings', settings),
    updateSingle: (category, key, value) =>
        api.patch(`/settings/${category}/${key}`, { value }),
};

// User Rights API
export const userRightsApi = {
    getAll: () => api.get('/user-rights'),
    getByUser: (userId) => api.get(`/user-rights/${userId}`),
    update: (userId, rights, siteId) => api.put(`/user-rights/${userId}`, { rights, siteId }),
};

// Notifications API
export const notificationsApi = {
    getAll: (params) => api.get('/notifications', { params }),
    getById: (id) => api.get(`/notifications/${id}`),
    getUnreadCount: () => api.get('/notifications/unread-count'),
    markAsRead: (id) => api.put(`/notifications/${id}/read`),
    markAllAsRead: () => api.put('/notifications/read-all'),
    create: (data) => api.post('/notifications', data),
    delete: (id) => api.delete(`/notifications/${id}`),
    getLogs: (params) => api.get('/notifications/logs', { params }), // New method
};

// RMA API
export const rmaApi = {
    getAll: (params) => api.get('/rma', { params }),
    create: (data) => api.post('/rma', data),
    getByTicket: (ticketId) => api.get(`/rma/ticket/${ticketId}`),
    getHistory: (assetId) => api.get(`/rma/asset/${assetId}`),
    updateStatus: (id, data) => api.put(`/rma/${id}/status`, data),
    confirmInstallation: (id, data) => api.put(`/rma/${id}/confirm-installation`, data),
};

// Asset Update Request API
export const assetUpdateRequestApi = {
    initiate: (data) => api.post('/asset-update-requests/initiate', data),
    validate: (token) => api.get(`/asset-update-requests/validate/${token}`),
    submit: (token, changes) => api.put(`/asset-update-requests/${token}/submit`, changes),
    getByTicket: (ticketId) => api.get(`/asset-update-requests/ticket/${ticketId}`),
    getPendingByTicket: (ticketId) => api.get(`/asset-update-requests/ticket/${ticketId}`),
    approve: (id) => api.post(`/asset-update-requests/${id}/approve`),
    reject: (id, reason) => api.post(`/asset-update-requests/${id}/reject`, { reason }),
};

// Work Log API
export const worklogApi = {
    getMyToday: () => api.get('/worklogs/my/today'),
    getMyLogs: (params) => api.get('/worklogs/my', { params }),
    getUserLogs: (userId, params) => api.get(`/worklogs/user/${userId}`, { params }),
    getTeamLogs: (params) => api.get('/worklogs/team', { params }),
    updateSummary: (summary) => api.put('/worklogs/summary', { summary }),
    addManualEntry: (formData) => api.post('/worklogs/manual', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    deleteManualEntry: (id) => api.delete(`/worklogs/manual/${id}`),
};

// Reporting API
export const reportingApi = {
    getTicketStats: (params) => api.get('/reporting/tickets', { params }),
    getSLAPerformance: (params) => api.get('/reporting/sla', { params }),
    getAssetStats: (params) => api.get('/reporting/assets', { params }),
    getRMAStats: (params) => api.get('/reporting/rma', { params }),
    exportReport: (params) => api.get('/reporting/export', { params, responseType: 'blob' }),
    exportEmployeeStatus: (params) => api.get('/reporting/export/employees', { params, responseType: 'blob' }),
    exportAssetStatus: (params) => api.get('/reporting/export/assets', { params, responseType: 'blob' }),
    exportRMA: (params) => api.get('/reporting/export/rma', { params, responseType: 'blob' }),
    exportSpareStock: (params) => api.get('/reporting/export/spare-stock', { params, responseType: 'blob' }),
    exportWorkActivity: (params) => api.get('/reporting/export/work-activity', { params, responseType: 'blob' }),
    exportUserActivities: (params) => api.get('/reporting/export/user-activities', { params, responseType: 'blob' }),
};

// Stock API
export const stockApi = {
    getInventory: (params) => api.get('/stock/inventory', { params }),
    getAvailability: (ticketId) => api.get(`/stock/availability/${ticketId}`),
    addStock: (data) => api.post('/stock/add', data),
    // Requisitions
    getRequisitions: (params) => api.get('/stock/requisitions', { params }),
    createRequisition: (data) => api.post('/stock/requisitions', data),
    approveRequisition: (id) => api.put(`/stock/requisitions/${id}/approve`),
    fulfillRequisition: (id, assetId) => api.put(`/stock/requisitions/${id}/fulfill`, { assetId }),
    rejectRequisition: (id, reason) => api.put(`/stock/requisitions/${id}/reject`, { reason }),
    // Transfers
    getTransfers: (params) => api.get('/stock/transfers', { params }),
    initiateTransfer: (data) => api.post('/stock/transfers', data),
    dispatchTransfer: (id, data = {}) => api.put(`/stock/transfers/${id}/dispatch`, data),
    receiveTransfer: (id) => api.put(`/stock/transfers/${id}/receive`),
    getDispatchedTransfersForSite: (siteId) => api.get(`/stock/transfers/dispatched-for-site/${siteId}`),
    // Movement Logs
    getMovementLogs: (params) => api.get('/stock/movement-logs', { params }),
    getMovementStats: (params) => api.get('/stock/movement-stats', { params }),
    // Bulk
    bulkUpload: (formData) => api.post('/stock/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    downloadTemplate: (format) => api.get(`/stock/export-template?format=${format}`, { responseType: 'blob' }),
    replaceAsset: (data) => api.post('/stock/replace', data),
    getReplacementHistory: (assetId) => api.get(`/stock/asset/${assetId}/history`),
    // Stock-specific lookups (only from Spare assets)
    getStockAssetTypes: () => api.get('/stock/asset-types'),
    getStockDeviceTypes: (assetType) => api.get('/stock/device-types', { params: { assetType } }),
    getStockModels: (assetType, deviceType) => api.get('/stock/models', { params: { assetType, deviceType } }),
    // Export selected inventory assets
    exportSelectedAssets: (assetIds, format = 'xlsx') => api.post('/stock/export-selected', { assetIds, format }, { responseType: 'blob' }),
    // Stock CRUD
    updateStock: (assetId, data) => api.put(`/stock/${assetId}`, data),
    deleteStock: (assetId) => api.delete(`/stock/${assetId}`),
};

