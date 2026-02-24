import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../services/api';

const SESSION_MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            loginTimestamp: null,

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
                                profilePicture: user.profilePicture,
                                assignedSites: user.assignedSites || [],
                                rights: user.rights || [],
                                preferences: user.preferences || {}
                            },
                            accessToken,
                            refreshToken,
                            isAuthenticated: true,
                            isLoading: false,
                            error: null,
                            loginTimestamp: Date.now(),
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

            setProfilePicture: (profilePicture) => {
                const { user } = get();
                if (user) {
                    set({
                        user: {
                            ...user,
                            profilePicture
                        }
                    });
                }
            },

            setUserPermissions: (rights) => {
                const { user } = get();
                if (user) {
                    set({
                        user: {
                            ...user,
                            rights: rights
                        }
                    });
                }
            },

            // Refresh user rights from the server without re-login
            refreshUserRights: async () => {
                try {
                    const response = await authApi.getMe();
                    if (response.data.success) {
                        const freshUser = response.data.data;
                        const { user } = get();
                        if (user) {
                            set({
                                user: {
                                    ...user,
                                    rights: freshUser.rights || { siteRights: [], globalRights: [] },
                                    profilePicture: freshUser.profilePicture,
                                    assignedSites: freshUser.assignedSites || user.assignedSites || []
                                }
                            });
                        }
                    }
                } catch (error) {
                    console.error('Failed to refresh user rights:', error);
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
                        loginTimestamp: null,
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

            // Check if session has expired (6 hours since login)
            checkSessionExpiry: () => {
                const { loginTimestamp, isAuthenticated } = get();
                if (!isAuthenticated || !loginTimestamp) return;
                if (Date.now() - loginTimestamp > SESSION_MAX_AGE_MS) {
                    console.log('[Auth] Session expired after 6 hours, logging out.');
                    get().logout();
                }
            },

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

                // Admins/Supervisors have all rights
                if (get().hasRole(['Admin', 'Supervisor'])) return true;

                // If siteId provided, check specific site rights
                if (siteId) {
                    // Normalize siteId to a string ID
                    const targetSiteId = (siteId?._id || siteId)?.toString();
                    if (!targetSiteId) return false;

                    const siteRight = user.rights.siteRights?.find(sr => {
                        const sId = (sr.site?._id || sr.site)?.toString();
                        return sId === targetSiteId;
                    });
                    if (siteRight?.rights?.includes(rightName)) return true;
                } else {
                    // If no specific siteId provided, check if they have this right for ANY site
                    return get().hasRightForAnySite(rightName);
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

                // Admins/Supervisors have all rights
                if (get().hasRole(['Admin', 'Supervisor'])) return true;

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

                // If user has global right or is Admin/Supervisor, return all assigned sites
                if (user.rights.globalRights?.includes(rightName) || get().hasRole(['Admin', 'Supervisor'])) {
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
                loginTimestamp: state.loginTimestamp,
            }),
            onRehydrate: () => {
                // After restoring state from localStorage, check if session expired
                return (state) => {
                    if (state) {
                        state.checkSessionExpiry();
                    }
                };
            },
        }
    )
);

export default useAuthStore;
