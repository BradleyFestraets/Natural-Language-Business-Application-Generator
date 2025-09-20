/**
 * Design Tokens for Consistent Visual Appearance
 *
 * These tokens ensure professional, consistent styling across all generated components
 * and provide a cohesive user experience throughout the business platform.
 */

// Color Palette
export const colors = {
  // Primary brand colors
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6', // Main primary color
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },

  // Status colors
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },

  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },

  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },

  info: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },

  // Neutral colors
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },

  // Background colors
  background: {
    primary: '#ffffff',
    secondary: '#f8fafc',
    tertiary: '#f1f5f9',
    accent: '#f0f9ff',
  },

  // Text colors
  text: {
    primary: '#0f172a',
    secondary: '#475569',
    tertiary: '#64748b',
    inverse: '#ffffff',
  },

  // Border colors
  border: {
    light: '#e2e8f0',
    medium: '#cbd5e1',
    dark: '#94a3b8',
  },
} as const;

// Typography
export const typography = {
  // Font families
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
  },

  // Font sizes (in rem)
  fontSize: {
    xs: '0.75rem',   // 12px
    sm: '0.875rem',  // 14px
    base: '1rem',    // 16px
    lg: '1.125rem',  // 18px
    xl: '1.25rem',   // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
    '5xl': '3rem',     // 48px
  },

  // Font weights
  fontWeight: {
    thin: '100',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },

  // Line heights
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },

  // Letter spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const;

// Spacing (in rem)
export const spacing = {
  px: '1px',
  0: '0',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  12: '3rem',       // 48px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
  32: '8rem',       // 128px
} as const;

// Border radius
export const borderRadius = {
  none: '0',
  sm: '0.125rem',   // 2px
  base: '0.25rem',  // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  '3xl': '1.5rem',  // 24px
  full: '9999px',
} as const;

// Shadows
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
} as const;

// Component-specific tokens
export const components = {
  // Button tokens
  button: {
    sizes: {
      xs: { padding: '0.25rem 0.5rem', fontSize: '0.75rem', height: '1.5rem' },
      sm: { padding: '0.375rem 0.75rem', fontSize: '0.875rem', height: '2rem' },
      md: { padding: '0.5rem 1rem', fontSize: '0.875rem', height: '2.5rem' },
      lg: { padding: '0.75rem 1.5rem', fontSize: '1rem', height: '3rem' },
      xl: { padding: '1rem 2rem', fontSize: '1.125rem', height: '3.5rem' },
    },
    variants: {
      primary: {
        background: colors.primary[600],
        color: colors.text.inverse,
        hover: colors.primary[700],
        focus: colors.primary[500],
      },
      secondary: {
        background: colors.neutral[100],
        color: colors.text.primary,
        hover: colors.neutral[200],
        focus: colors.neutral[300],
      },
      outline: {
        background: 'transparent',
        color: colors.text.primary,
        border: colors.border.medium,
        hover: colors.neutral[50],
        focus: colors.primary[100],
      },
    },
  },

  // Card tokens
  card: {
    padding: spacing[6],
    borderRadius: borderRadius.lg,
    shadow: shadows.sm,
    header: {
      padding: spacing[4],
      borderBottom: `1px solid ${colors.border.light}`,
    },
  },

  // Input tokens
  input: {
    padding: spacing[3],
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.border.medium}`,
    focus: `2px solid ${colors.primary[500]}`,
    placeholder: colors.text.tertiary,
  },

  // Badge tokens
  badge: {
    padding: `${spacing[1]} ${spacing[2]}`,
    borderRadius: borderRadius.full,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },

  // Status indicators
  status: {
    success: {
      background: colors.success[100],
      color: colors.success[700],
      border: colors.success[200],
    },
    warning: {
      background: colors.warning[100],
      color: colors.warning[700],
      border: colors.warning[200],
    },
    error: {
      background: colors.error[100],
      color: colors.error[700],
      border: colors.error[200],
    },
    info: {
      background: colors.info[100],
      color: colors.info[700],
      border: colors.info[200],
    },
  },

  // Business-specific colors
  business: {
    revenue: colors.success[600],
    customers: colors.primary[600],
    leads: colors.info[600],
    conversion: colors.success[500],
    churn: colors.error[600],
    health: {
      excellent: colors.success[500],
      good: colors.success[400],
      fair: colors.warning[500],
      poor: colors.warning[600],
      critical: colors.error[500],
    },
  },
} as const;

// Animation tokens
export const animations = {
  duration: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
  },
  easing: {
    linear: 'linear',
    in: 'ease-in',
    out: 'ease-out',
    inOut: 'ease-in-out',
  },
  transitions: {
    all: 'all 300ms ease-in-out',
    colors: 'color 300ms ease-in-out, background-color 300ms ease-in-out, border-color 300ms ease-in-out',
    transform: 'transform 300ms ease-in-out',
    opacity: 'opacity 300ms ease-in-out',
  },
} as const;

// Responsive breakpoints (in px)
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

// Z-index scale
export const zIndex = {
  hide: -1,
  auto: 'auto',
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1020,
  banner: 1030,
  overlay: 1040,
  modal: 1050,
  popover: 1060,
  skipLink: 1070,
  toast: 1080,
  tooltip: 1090,
} as const;

// Utility functions for consistent styling
export const utils = {
  // Create consistent border radius
  borderRadius: (radius: keyof typeof borderRadius) => borderRadius[radius],

  // Create consistent spacing
  spacing: (space: keyof typeof spacing) => spacing[space],

  // Create consistent shadows
  shadow: (shadow: keyof typeof shadows) => shadows[shadow],

  // Create consistent color classes
  colorClass: (color: string, shade: string) => `text-${color}-${shade}`,

  // Create responsive classes
  responsive: (classes: Record<string, string>) => {
    const responsiveClasses = Object.entries(classes)
      .map(([breakpoint, className]) => {
        if (breakpoint === 'base') return className;
        return `${breakpoint}:${className}`;
      })
      .join(' ');
    return responsiveClasses;
  },

  // Create transition classes
  transition: (properties: string[] = ['all']) => {
    return properties.map(prop => `${prop} 300ms ease-in-out`).join(', ');
  },
} as const;

// Export type definitions for TypeScript
export type ColorPalette = typeof colors;
export type TypographyScale = typeof typography;
export type SpacingScale = typeof spacing;
export type ComponentTokens = typeof components;
