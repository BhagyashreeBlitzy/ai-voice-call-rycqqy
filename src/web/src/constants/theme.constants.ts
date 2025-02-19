/**
 * Core theme constants and configuration values used across the application's theming system.
 * Implements Material Design principles with support for light/dark modes, responsive design,
 * and consistent spacing.
 */

/**
 * Core color palette definitions following Material Design color system.
 * Each color has main, light, dark variants and a contrast text color.
 */
export const THEME_COLORS = {
  primary: {
    main: '#0A84FF',
    light: '#4DA3FF',
    dark: '#0066CC',
    contrastText: '#FFFFFF'
  },
  secondary: {
    main: '#6C757D',
    light: '#A1A8AE',
    dark: '#495057',
    contrastText: '#FFFFFF'
  },
  error: {
    main: '#DC3545',
    light: '#E4606D',
    dark: '#B02A37',
    contrastText: '#FFFFFF'
  },
  success: {
    main: '#28A745',
    light: '#34CE57',
    dark: '#1E7E34',
    contrastText: '#FFFFFF'
  },
  warning: {
    main: '#FFC107',
    light: '#FFCE3A',
    dark: '#D39E00',
    contrastText: '#000000'
  },
  info: {
    main: '#17A2B8',
    light: '#1FC8E3',
    dark: '#117A8B',
    contrastText: '#FFFFFF'
  }
} as const;

/**
 * Base spacing unit in pixels following Material Design's 8-point grid system.
 * Used for consistent spacing across components and layouts.
 */
export const SPACING_UNIT = 8;

/**
 * Responsive design breakpoints in pixels.
 * Follows standard device sizes for consistent responsive behavior:
 * - xs: Mobile phones (320px)
 * - sm: Tablets (768px)
 * - md: Small laptops (1024px)
 * - lg: Large laptops/desktops (1440px)
 * - xl: Extra large displays (1920px)
 */
export const BREAKPOINTS = {
  xs: 320,
  sm: 768,
  md: 1024,
  lg: 1440,
  xl: 1920
} as const;

/**
 * Z-index values for consistent layering of UI elements.
 * Defines a clear hierarchy for overlapping components:
 * - modal: Dialog windows and modal overlays
 * - tooltip: Tooltips and popovers
 * - header: Application header/navigation
 * - overlay: Background overlays
 */
export const Z_INDEX = {
  modal: 1000,
  tooltip: 1100,
  header: 900,
  overlay: 800
} as const;

/**
 * Type definitions for theme constants to ensure type safety
 */
export type ThemeColors = typeof THEME_COLORS;
export type ColorVariant = keyof typeof THEME_COLORS;
export type Breakpoint = keyof typeof BREAKPOINTS;
export type ZIndexLayer = keyof typeof Z_INDEX;