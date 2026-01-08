import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
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
            } catch (refreshError) {
                // Refresh failed - clear tokens and redirect to login
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
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
        api.post('/auth/change-password', { currentPassword, newPassword }),
    getProfile: () => api.get('/auth/me'),
    updatePreferences: (preferences) => api.put('/auth/preferences', { preferences }),
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
    updateStatus: (id, status) => api.patch(`/assets/${id}/status`, null, { params: { status } }),
    getDropdown: (siteId) => api.get('/assets/dropdown', { params: { siteId } }),
    // Bulk operations
    downloadTemplate: () => api.get('/assets/template', { responseType: 'blob' }),
    exportAssets: (params) => api.get('/assets/export', { params, responseType: 'blob' }),
    bulkImport: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/assets/import', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    }
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
    close: (id, data) => api.post(`/tickets/${id}/close`, data),
    reopen: (id, reason) => api.post(`/tickets/${id}/reopen`, { reason }),
    getAuditTrail: (id) => api.get(`/tickets/${id}/audit`),
    getDashboardStats: () => api.get('/tickets/dashboard/stats'),
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
    update: (userId, rights) => api.put(`/user-rights/${userId}`, { rights }),
};

// Notifications API
export const notificationsApi = {
    getAll: (params) => api.get('/notifications', { params }),
    getUnreadCount: () => api.get('/notifications/unread-count'),
    markAsRead: (id) => api.put(`/notifications/${id}/read`),
    markAllAsRead: () => api.put('/notifications/read-all'),
    create: (data) => api.post('/notifications', data),
    delete: (id) => api.delete(`/notifications/${id}`),
};
