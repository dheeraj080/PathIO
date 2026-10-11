import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        surface: {
          light: '#ffffff',
          muted: '#f8fafc',
          border: '#e2e8f0',
          dark: '#0f172a',
          darkMuted: '#1e293b',
          darkBorder: '#334155',
        },
        // Semantic tokens (also available as CSS var: var(--color-name))
        border: 'var(--color-border, var(--border))',
        radius: 'var(--radius, var(--border))',
        shadow: 'var(--shadow, none)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
      },
    },
    // Inject CSS var definitions into the tailwind theme so components can use
    // `theme('color.border')` etc.  Fall back to the static tokens above.
    variables: () => ({
      '--color-border': 'var(--border)',
      '--color-radius': 'var(--radius)',
      '--color-shadow': 'var(--shadow-sm)',
    }),
  },
  plugins: [],
} satisfies Config
