import { useState, useEffect, useCallback } from 'react'; // ^18.2.0
import darkTheme from '../theme/darkTheme';
import lightTheme from '../theme/lightTheme';
import { STORAGE_KEYS, setItem, getItem } from '../utils/storage.utils';

// Media query for system theme detection
const MEDIA_QUERY = '(prefers-color-scheme: dark)';
const THEME_TRANSITION_DURATION = 200;

type ThemeMode = 'light' | 'dark';
type Theme = typeof lightTheme | typeof darkTheme;

interface ThemeError {
  code: string;
  message: string;
}

interface ThemeContext {
  theme: Theme;
  themeMode: ThemeMode;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  error: ThemeError | null;
}

/**
 * Custom hook for managing application theme with encryption, system sync, and error handling
 * @returns ThemeContext object containing current theme, theme mode, and theme change functions
 */
export const useTheme = (): ThemeContext => {
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialTheme());
  const [error, setError] = useState<ThemeError | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Get initial theme from encrypted storage or system preference
  function getInitialTheme(): ThemeMode {
    try {
      const storedTheme = getItem<ThemeMode>(STORAGE_KEYS.THEME, true);
      if (storedTheme && ['light', 'dark'].includes(storedTheme)) {
        return storedTheme;
      }
      
      // Check system preference if no stored theme
      const prefersDark = window.matchMedia(MEDIA_QUERY).matches;
      return prefersDark ? 'dark' : 'light';
    } catch (err) {
      console.error('Failed to get initial theme:', err);
      return 'light'; // Fallback to light theme
    }
  }

  // Apply theme with transition management and performance optimization
  const applyTheme = useCallback((mode: ThemeMode) => {
    if (isTransitioning) return;

    setIsTransitioning(true);
    requestAnimationFrame(() => {
      try {
        const root = document.documentElement;
        const theme = mode === 'dark' ? darkTheme : lightTheme;

        // Apply theme class with BEM methodology
        root.classList.remove('theme--light', 'theme--dark');
        root.classList.add(`theme--${mode}`);

        // Apply CSS variables efficiently
        Object.entries(theme.palette).forEach(([key, value]) => {
          if (typeof value === 'object') {
            Object.entries(value).forEach(([subKey, subValue]) => {
              root.style.setProperty(
                `--color-${key}-${subKey}`,
                subValue.toString()
              );
            });
          } else {
            root.style.setProperty(`--color-${key}`, value.toString());
          }
        });

        // Apply spacing variables
        Object.entries(theme.spacing).forEach(([key, value]) => {
          root.style.setProperty(`--spacing-${key}`, `${value}px`);
        });

        // Emit theme change event for analytics
        window.dispatchEvent(new CustomEvent('themechange', { detail: { mode } }));

        setTimeout(() => {
          setIsTransitioning(false);
        }, THEME_TRANSITION_DURATION);
      } catch (err) {
        setError({
          code: 'THEME_APPLICATION_ERROR',
          message: 'Failed to apply theme changes'
        });
        setIsTransitioning(false);
      }
    });
  }, [isTransitioning]);

  // Handle theme changes with transition management
  useEffect(() => {
    applyTheme(themeMode);
    
    // Persist theme securely with encryption
    try {
      setItem(STORAGE_KEYS.THEME, themeMode, true, true);
    } catch (err) {
      setError({
        code: 'THEME_STORAGE_ERROR',
        message: 'Failed to save theme preference'
      });
    }
  }, [themeMode, applyTheme]);

  // Set up system theme preference media query listener
  useEffect(() => {
    const mediaQuery = window.matchMedia(MEDIA_QUERY);
    
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      const systemPreference = getItem<boolean>('useSystemPreference', true);
      if (systemPreference) {
        setThemeMode(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    
    // Cleanup listeners on unmount
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  // Theme toggle function
  const toggleTheme = useCallback(() => {
    setThemeMode(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  // Sync theme across browser tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.THEME && e.newValue) {
        try {
          const newTheme = JSON.parse(e.newValue) as ThemeMode;
          if (newTheme !== themeMode) {
            setThemeMode(newTheme);
          }
        } catch (err) {
          console.error('Failed to sync theme across tabs:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [themeMode]);

  return {
    theme: themeMode === 'dark' ? darkTheme : lightTheme,
    themeMode,
    toggleTheme,
    setThemeMode,
    error
  };
};

export default useTheme;