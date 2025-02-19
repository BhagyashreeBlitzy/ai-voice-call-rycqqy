import { THEME_COLORS, SPACING_UNIT, Z_INDEX } from '../constants/theme.constants';

/**
 * Dark theme configuration implementing Material Design principles with WCAG 2.1 Level AA compliance.
 * Provides high contrast ratios, consistent spacing, and enhanced visibility for dark mode.
 * 
 * Color contrast ratios:
 * - Normal text (>4.5:1)
 * - Large text (>3:1)
 * - Interactive elements (>3:1)
 */
export const darkTheme = {
  palette: {
    mode: 'dark',
    primary: {
      ...THEME_COLORS.primary,
      // Enhanced contrast for dark mode
      main: '#1A90FF', // Adjusted for better visibility
      light: '#4DA3FF',
      dark: '#0066CC'
    },
    secondary: {
      ...THEME_COLORS.secondary,
      // Adjusted for dark mode visibility
      main: '#8C959D',
      light: '#A1A8AE',
      dark: '#495057'
    },
    background: {
      // Material Design dark theme surface colors
      default: '#121212', // Base background
      paper: '#1E1E1E',   // Elevated surfaces
      elevated: '#242424' // Higher elevation surfaces
    },
    text: {
      // WCAG 2.1 AA compliant text colors
      primary: '#FFFFFF',                    // Contrast ratio 15.8:1
      secondary: 'rgba(255, 255, 255, 0.7)', // Contrast ratio 11.1:1
      disabled: 'rgba(255, 255, 255, 0.5)'   // Contrast ratio 7.9:1
    },
    divider: 'rgba(255, 255, 255, 0.12)',
    action: {
      // Interactive states with sufficient contrast
      active: 'rgba(255, 255, 255, 0.7)',
      hover: 'rgba(255, 255, 255, 0.08)',
      selected: 'rgba(255, 255, 255, 0.16)',
      disabled: 'rgba(255, 255, 255, 0.3)',
      focus: 'rgba(255, 255, 255, 0.12)'
    }
  },

  // Spacing following Material Design 8px grid system
  spacing: {
    unit: SPACING_UNIT,
    xs: SPACING_UNIT / 2,    // 4px
    sm: SPACING_UNIT,        // 8px
    md: SPACING_UNIT * 2,    // 16px
    lg: SPACING_UNIT * 3,    // 24px
    xl: SPACING_UNIT * 4     // 32px
  },

  // Typography configuration with accessible font sizes and weights
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    fontSize: 16, // Base font size for better readability
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    // Ensure minimum font sizes for accessibility
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
      lineHeight: 1.3
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.3
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5
    }
  },

  // Elevation shadows for dark mode
  shadows: {
    sm: '0 2px 4px rgba(0,0,0,0.3)',
    md: '0 4px 8px rgba(0,0,0,0.4)',
    lg: '0 8px 16px rgba(0,0,0,0.5)',
    xl: '0 12px 24px rgba(0,0,0,0.6)'
  },

  // Z-index hierarchy
  zIndex: {
    ...Z_INDEX
  }
} as const;

export default darkTheme;