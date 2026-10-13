import type { Config } from 'tailwindcss';

/**
 * Tailwind config — exactly matches the Engineering Incubator PWA design system.
 * Source: stitch_campus_innovation_platform_pwa/engineering_incubator_pwa/DESIGN.md
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // ── Full Material You / Engineering Incubator color palette ─────────────
      colors: {
        primary: '#004541',
        'on-primary': '#ffffff',
        'primary-container': '#115e59',
        'on-primary-container': '#91d5ce',
        'primary-fixed': '#abefe8',
        'primary-fixed-dim': '#8fd3cc',
        'on-primary-fixed': '#00201e',
        'on-primary-fixed-variant': '#00504b',
        'inverse-primary': '#8fd3cc',
        'surface-tint': '#216963',

        secondary: '#855300',
        'on-secondary': '#ffffff',
        'secondary-container': '#fea619',
        'on-secondary-container': '#684000',
        'secondary-fixed': '#ffddb8',
        'secondary-fixed-dim': '#ffb95f',
        'on-secondary-fixed': '#2a1700',
        'on-secondary-fixed-variant': '#653e00',

        tertiary: '#221eb5',
        'on-tertiary': '#ffffff',
        'tertiary-container': '#3e3ecb',
        'on-tertiary-container': '#c3c3ff',
        'tertiary-fixed': '#e1e0ff',
        'tertiary-fixed-dim': '#c0c1ff',
        'on-tertiary-fixed': '#07006c',
        'on-tertiary-fixed-variant': '#2f2ebe',

        surface: '#faf8ff',
        'surface-dim': '#d2d9f4',
        'surface-bright': '#faf8ff',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f2f3ff',
        'surface-container': '#eaedff',
        'surface-container-high': '#e2e7ff',
        'surface-container-highest': '#dae2fd',
        'surface-variant': '#dae2fd',
        'on-surface': '#131b2e',
        'on-surface-variant': '#3f4947',
        'inverse-surface': '#283044',
        'inverse-on-surface': '#eef0ff',

        background: '#faf8ff',
        'on-background': '#131b2e',

        outline: '#6f7977',
        'outline-variant': '#bec9c7',

        error: '#ba1a1a',
        'on-error': '#ffffff',
        'error-container': '#ffdad6',
        'on-error-container': '#93000a',
      },

      // ── Border radius ─────────────────────────────────────────────────────────
      borderRadius: {
        sm: '0.25rem',
        DEFAULT: '0.25rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.5rem',
        full: '9999px',
      },

      // ── Spacing ───────────────────────────────────────────────────────────────
      spacing: {
        'space-2xs': '0.125rem',
        'space-xs': '0.25rem',
        'space-sm': '0.5rem',
        'space-md': '1rem',
        'space-lg': '1.5rem',
        'space-xl': '2rem',
        'space-2xl': '3rem',
        gutter: '1rem',
        'gutter-md': '1.5rem',
        'gutter-lg': '2rem',
        margin: '1rem',
        'margin-md': '1.5rem',
        'margin-lg': '3rem',
      },

      // ── Fonts ─────────────────────────────────────────────────────────────────
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
        headline: ['Outfit', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },

      // ── Font sizes with design-system line-height / letter-spacing ───────────
      fontSize: {
        'headline-xl': ['2.25rem', { lineHeight: '2.75rem', letterSpacing: '-0.025em', fontWeight: '700' }],
        'headline-xl-mobile': ['1.75rem', { lineHeight: '2.125rem', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-lg': ['1.75rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em', fontWeight: '600' }],
        'headline-lg-mobile': ['1.375rem', { lineHeight: '1.75rem', letterSpacing: '-0.015em', fontWeight: '600' }],
        'headline-md': ['1.25rem', { lineHeight: '1.625rem', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-sm': ['1.125rem', { lineHeight: '1.5rem', letterSpacing: '0', fontWeight: '600' }],
        'body-lg': ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em', fontWeight: '400' }],
        'body-md': ['1rem', { lineHeight: '1.5rem', letterSpacing: '0', fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.375rem', letterSpacing: '0', fontWeight: '400' }],
        'label-lg': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.01em', fontWeight: '600' }],
        'label-md': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.02em', fontWeight: '600' }],
        'label-sm': ['0.6875rem', { lineHeight: '0.875rem', letterSpacing: '0.04em', fontWeight: '700' }],
        'code-sm': ['0.8125rem', { lineHeight: '1.125rem', letterSpacing: '-0.01em', fontWeight: '500' }],
      },

      // ── Elevation shadows ─────────────────────────────────────────────────────
      boxShadow: {
        'level-1': '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
        'level-2': '0 8px 24px -4px rgba(15, 23, 42, 0.08)',
        'level-3': '0 -4px 16px -2px rgba(15, 23, 42, 0.04)',
        'level-4': '0 20px 32px -8px rgba(15, 23, 42, 0.16)',
      },
    },
  },
  plugins: [],
} satisfies Config;
