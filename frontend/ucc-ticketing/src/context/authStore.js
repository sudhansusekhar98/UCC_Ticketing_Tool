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
                                rights: user.rights || []
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

            hasRight: (rightName) => {
                const { user } = get();
                return user?.rights?.includes(rightName) || false;
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
