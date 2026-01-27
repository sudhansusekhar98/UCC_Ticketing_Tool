import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useThemeStore = create(
    persist(
        (set, get) => ({
            theme: 'light', // 'light', 'dark', or 'system'
            resolvedTheme: 'light', // The actual theme being used (light or dark)

            // Initialize theme on app load
            initTheme: () => {
                const { theme } = get();
                get().applyTheme(theme);
            },

            // Set and apply theme
            setTheme: (newTheme) => {
                set({ theme: newTheme });
                get().applyTheme(newTheme);
            },

            // Apply theme to document
            applyTheme: (theme) => {
                let resolvedTheme = theme;

                if (theme === 'system') {
                    // Check system preference
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    resolvedTheme = prefersDark ? 'dark' : 'light';
                }

                // Update document attribute
                document.documentElement.setAttribute('data-theme', resolvedTheme);

                // Also add/remove class for easier CSS targeting
                document.documentElement.classList.remove('theme-light', 'theme-dark');
                document.documentElement.classList.add(`theme-${resolvedTheme}`);

                set({ resolvedTheme });
            },

            // Listen for system theme changes
            setupSystemThemeListener: () => {
                const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
                
                const handleChange = (e) => {
                    const { theme } = get();
                    if (theme === 'system') {
                        get().applyTheme('system');
                    }
                };

                // Add listener
                if (mediaQuery.addEventListener) {
                    mediaQuery.addEventListener('change', handleChange);
                } else {
                    // Fallback for older browsers
                    mediaQuery.addListener(handleChange);
                }

                // Return cleanup function
                return () => {
                    if (mediaQuery.removeEventListener) {
                        mediaQuery.removeEventListener('change', handleChange);
                    } else {
                        mediaQuery.removeListener(handleChange);
                    }
                };
            },

            // Check if current theme is dark
            isDark: () => get().resolvedTheme === 'dark',
        }),
        {
            name: 'theme-storage',
            partialize: (state) => ({
                theme: state.theme,
            }),
        }
    )
);

export default useThemeStore;
