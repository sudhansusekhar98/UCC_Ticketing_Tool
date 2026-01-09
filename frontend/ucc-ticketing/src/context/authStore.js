import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../services/api';

const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,

            login: async (username, password) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await authApi.login(username, password);

                    if (response.data.success) {
                        // Express.js returns: { user: { id, username, fullName, email, role }, token, refreshToken }
                        const { user, token, refreshToken } = response.data.data;
                        
                        // Map 'token' to 'accessToken' for consistency
                        const accessToken = token;

                        // Store tokens in localStorage for API interceptor
                        localStorage.setItem('accessToken', accessToken);
                        localStorage.setItem('refreshToken', refreshToken);

                        set({
                            user: { 
                                userId: user.id, 
                                username: user.username, 
                                fullName: user.fullName, 
                                email: user.email, 
                                email: user.email, 
                                role: user.role,
                                assignedSites: user.assignedSites || [],
                                rights: user.rights || [],
                                preferences: user.preferences || {}
                            },
                            accessToken,
                            refreshToken,
                            isAuthenticated: true,
                            isLoading: false,
                            error: null,
                        });

                        return { success: true };
                    } else {
                        set({ isLoading: false, error: response.data.message });
                        return { success: false, error: response.data.message };
                    }
                } catch (error) {
                    const errorMessage = error.response?.data?.message || 'Login failed';
                    set({ isLoading: false, error: errorMessage });
                    return { success: false, error: errorMessage };
                }
            },

            setUserPreferences: (preferences) => {
                const { user } = get();
                if (user) {
                    set({
                        user: {
                            ...user,
                            preferences: {
                                ...user.preferences,
                                ...preferences
                            }
                        }
                    });
                }
            },

            logout: async () => {
                try {
                    await authApi.logout();
                } catch {
                    // Ignore logout errors
                } finally {
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    set({
                        user: null,
                        accessToken: null,
                        refreshToken: null,
                        isAuthenticated: false,
                        error: null,
                    });
                }
            },

            refreshTokens: async () => {
                const { refreshToken } = get();
                if (!refreshToken) return false;

                try {
                    const response = await authApi.refresh(refreshToken);
                    if (response.data.success) {
                        // Express.js returns { token } (no new refresh token)
                        const { token } = response.data.data;
                        const newAccessToken = token;

                        localStorage.setItem('accessToken', newAccessToken);

                        set({
                            accessToken: newAccessToken,
                        });

                        return true;
                    }
                } catch {
                    get().logout();
                }

                return false;
            },

            clearError: () => set({ error: null }),

            hasRole: (roles) => {
                const { user } = get();
                if (!user) return false;
                if (typeof roles === 'string') {
                    return user.role === roles;
                }
                return roles.includes(user.role);
            },

            isAdmin: () => get().user?.role === 'Admin',
            isSupervisor: () => get().user?.role === 'Supervisor',
            isDispatcher: () => get().user?.role === 'Dispatcher',
            isEngineer: () => ['L1Engineer', 'L2Engineer'].includes(get().user?.role),

            hasRight: (rightName, siteId = null) => {
                const { user } = get();
                if (!user) return false;
                
                // Handle old format where rights was just an array
                if (Array.isArray(user.rights)) {
                    return user.rights.includes(rightName);
                }
                
                // New format
                if (!user.rights) return false;

                // Check global rights first
                if (user.rights.globalRights?.includes(rightName)) return true;

                // If siteId provided, check specific site rights
                if (siteId) {
                    const targetSiteId = siteId.toString();
                    const siteRight = user.rights.siteRights?.find(sr => {
                        const sId = (sr.site?._id || sr.site)?.toString();
                        return sId === targetSiteId;
                    });
                    if (siteRight?.rights?.includes(rightName)) return true;
                }

                return false;
            },

            // Check if user has a right for ANY of their assigned sites
            hasRightForAnySite: (rightName) => {
                const { user } = get();
                if (!user) return false;
                
                // Handle old format where rights was just an array
                if (Array.isArray(user.rights)) {
                    return user.rights.includes(rightName);
                }
                
                // New format
                if (!user.rights) return false;

                // Check global rights first
                if (user.rights.globalRights?.includes(rightName)) return true;

                // Check if user has the right for any site
                const hasForAnySite = user.rights.siteRights?.some(sr => 
                    sr.rights?.includes(rightName)
                );

                return hasForAnySite || false;
            },

            // Get list of site IDs where user has a specific right
            getSitesWithRight: (rightName) => {
                const { user } = get();
                if (!user) return [];
                
                // Handle old format where rights was just an array
                if (Array.isArray(user.rights)) {
                    // Old format - if they have the right globally, return all assigned sites
                    if (user.rights.includes(rightName)) {
                        return user.assignedSites?.map(s => (s._id || s)?.toString()).filter(Boolean) || [];
                    }
                    return [];
                }
                
                // New format with siteRights and globalRights
                if (!user.rights) return [];

                // If user has global right, return all assigned sites
                if (user.rights.globalRights?.includes(rightName)) {
                    return user.assignedSites?.map(s => (s._id || s)?.toString()).filter(Boolean) || [];
                }

                // Otherwise, return only sites where they have this specific right
                const sitesWithRight = user.rights.siteRights
                    ?.filter(sr => sr.rights?.includes(rightName))
                    ?.map(sr => (sr.site?._id || sr.site)?.toString())
                    ?.filter(Boolean) || [];

                return sitesWithRight;
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                user: state.user,
                accessToken: state.accessToken,
                refreshToken: state.refreshToken,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);

export default useAuthStore;
