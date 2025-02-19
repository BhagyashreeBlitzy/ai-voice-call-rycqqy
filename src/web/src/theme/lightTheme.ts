/**
 * Light theme configuration for the application.
 * Implements Material Design principles with WCAG 2.1 Level AA compliant color contrast ratios.
 * @version Material-UI v5.0.0 // Using latest stable Material-UI version
 */

import { THEME_COLORS, SPACING_UNIT, Z_INDEX } from '../constants/theme.constants';

/**
 * Light theme configuration object defining colors, typography, spacing, and other visual attributes
 * for the application's light mode appearance.
 */
export const lightTheme = {
  palette: {
    mode: 'light',
    primary: {
      ...THEME_COLORS.primary,
      // Additional shades for hover/focus states
      hover: `${THEME_COLORS.primary.main}CC`, // 80% opacity
      focus: `${THEME_COLORS.primary.main}1F`, // 12% opacity
    },
    secondary: {
      ...THEME_COLORS.secondary,
      hover: `${THEME_COLORS.secondary.main}CC`,
      focus: `${THEME_COLORS.secondary.main}1F`,
    },
    background: {
      default: '#FFFFFF',
      paper: '#F5F5F5',
      elevated: '#FFFFFF',
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)', // High emphasis text
      secondary: 'rgba(0, 0, 0, 0.6)', // Medium emphasis text
      disabled: 'rgba(0, 0, 0, 0.38)', // Disabled text
    },
    divider: 'rgba(0, 0, 0, 0.12)',
    action: {
      active: 'rgba(0, 0, 0, 0.54)',
      hover: 'rgba(0, 0, 0, 0.04)',
      selected: 'rgba(0, 0, 0, 0.08)',
      disabled: 'rgba(0, 0, 0, 0.26)',
      focus: 'rgba(0, 0, 0, 0.12)',
      disabledBackground: 'rgba(0, 0, 0, 0.12)',
    },
  },

  spacing: {
    unit: SPACING_UNIT,
    xs: SPACING_UNIT / 2, // 4px
    sm: SPACING_UNIT, // 8px
    md: SPACING_UNIT * 2, // 16px
    lg: SPACING_UNIT * 3, // 24px
    xl: SPACING_UNIT * 4, // 32px
  },

  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    fontSize: 16,
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.01562em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.00833em',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: '0em',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: '0.00735em',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: '0em',
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: '0.0075em',
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: '0.00938em',
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: '0.01071em',
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.75,
      letterSpacing: '0.02857em',
      textTransform: 'uppercase',
    },
    caption: {
      fontSize: '0.75rem',
      fontWeight: 400,
      lineHeight: 1.66,
      letterSpacing: '0.03333em',
    },
  },

  shadows: {
    sm: '0 2px 4px rgba(0,0,0,0.1)',
    md: '0 4px 8px rgba(0,0,0,0.1)',
    lg: '0 8px 16px rgba(0,0,0,0.1)',
    xl: '0 12px 24px rgba(0,0,0,0.1)',
    // Additional elevation levels
    1: '0px 2px 1px -1px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 1px 3px 0px rgba(0,0,0,0.12)',
    2: '0px 3px 1px -2px rgba(0,0,0,0.2), 0px 2px 2px 0px rgba(0,0,0,0.14), 0px 1px 5px 0px rgba(0,0,0,0.12)',
    3: '0px 3px 3px -2px rgba(0,0,0,0.2), 0px 3px 4px 0px rgba(0,0,0,0.14), 0px 1px 8px 0px rgba(0,0,0,0.12)',
  },

  zIndex: {
    ...Z_INDEX,
    // Additional z-index values for specific components
    appBar: Z_INDEX.header,
    drawer: Z_INDEX.header - 1,
    speedDial: Z_INDEX.header + 1,
  },

  shape: {
    borderRadius: 4,
  },

  transitions: {
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 225,
      leavingScreen: 195,
    },
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    },
  },
} as const;

export default lightTheme;