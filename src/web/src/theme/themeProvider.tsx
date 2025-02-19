import React, { createContext, useEffect, useState } from 'react'; // ^18.2.0
import darkTheme from './darkTheme';
import lightTheme from './lightTheme';
import { THEME_COLORS } from '../constants/theme.constants';

// Theme mode enumeration
export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system'
}

// Default theme and storage configuration
const DEFAULT_THEME = ThemeMode.SYSTEM;
const STORAGE_KEY = 'theme-preference';
const THEME_CHANGE_DEBOUNCE = 250;

// Theme context interface
interface ThemeContextType {
  currentTheme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  isSystemPreference: boolean;
}

// Create theme context with default values
export const ThemeContext = createContext<ThemeContextType>({
  currentTheme: DEFAULT_THEME,
  setTheme: () => {},
  isSystemPreference: true
});

// Hook to detect system theme preference
const useSystemTheme = (): boolean => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    let timeoutId: number;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (event: MediaQueryListEvent) => {
      // Debounce theme changes to prevent rapid switching
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        setIsDarkMode(event.matches);
      }, THEME_CHANGE_DEBOUNCE);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      window.clearTimeout(timeoutId);
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return isDarkMode;
};

// Function to apply theme CSS variables
const applyThemeVariables = (theme: typeof lightTheme | typeof darkTheme): void => {
  const root = document.documentElement;
  const { palette, spacing } = theme;

  // Apply color variables
  Object.entries(THEME_COLORS).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}-main`, value.main);
    root.style.setProperty(`--color-${key}-light`, value.light);
    root.style.setProperty(`--color-${key}-dark`, value.dark);
  });

  // Apply theme-specific variables
  root.style.setProperty('--background-default', palette.background.default);
  root.style.setProperty('--background-paper', palette.background.paper);
  root.style.setProperty('--text-primary', palette.text.primary);
  root.style.setProperty('--text-secondary', palette.text.secondary);

  // Apply spacing variables
  Object.entries(spacing).forEach(([key, value]) => {
    root.style.setProperty(`--spacing-${key}`, `${value}px`);
  });

  // Force minimal repaint
  root.style.display = 'none';
  root.offsetHeight; // Force reflow
  root.style.display = '';
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemPrefersDark = useSystemTheme();
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEY);
    return savedTheme ? (savedTheme as ThemeMode) : DEFAULT_THEME;
  });

  const handleThemeChange = (newTheme: ThemeMode): void => {
    if (!Object.values(ThemeMode).includes(newTheme)) {
      console.error('Invalid theme mode:', newTheme);
      return;
    }

    setCurrentTheme(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);

    // Apply appropriate theme
    const themeToApply = newTheme === ThemeMode.SYSTEM
      ? (systemPrefersDark ? darkTheme : lightTheme)
      : (newTheme === ThemeMode.DARK ? darkTheme : lightTheme);
    
    applyThemeVariables(themeToApply);

    // Announce theme change for screen readers
    const message = `Theme changed to ${newTheme === ThemeMode.SYSTEM 
      ? `system preference (${systemPrefersDark ? 'dark' : 'light'})` 
      : newTheme} mode`;
    
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    document.body.appendChild(announcement);
    setTimeout(() => announcement.remove(), 1000);

    // Dispatch theme change event
    window.dispatchEvent(new CustomEvent('themechange', {
      detail: { theme: newTheme, systemPreference: systemPrefersDark }
    }));
  };

  // Update theme when system preference changes
  useEffect(() => {
    if (currentTheme === ThemeMode.SYSTEM) {
      applyThemeVariables(systemPrefersDark ? darkTheme : lightTheme);
    }
  }, [systemPrefersDark, currentTheme]);

  // Initialize theme on mount
  useEffect(() => {
    handleThemeChange(currentTheme);
  }, []);

  const contextValue: ThemeContextType = {
    currentTheme,
    setTheme: handleThemeChange,
    isSystemPreference: currentTheme === ThemeMode.SYSTEM
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;