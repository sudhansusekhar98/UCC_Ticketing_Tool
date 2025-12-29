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
                        const { userId, username: uname, fullName, email, role, accessToken, refreshToken } = response.data.data;

                        // Store tokens in localStorage for API interceptor
                        localStorage.setItem('accessToken', accessToken);
                        localStorage.setItem('refreshToken', refreshToken);

                        set({
                            user: { userId, username: uname, fullName, email, role },
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
                        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data.data;

                        localStorage.setItem('accessToken', newAccessToken);
                        localStorage.setItem('refreshToken', newRefreshToken);

                        set({
                            accessToken: newAccessToken,
                            refreshToken: newRefreshToken,
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
