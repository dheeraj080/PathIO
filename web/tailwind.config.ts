import type { Config } from 'tailwindcss'

/**
 * Semantic colours resolve to RGB channel variables defined in index.css and
 * wrapped with `<alpha-value>` so Tailwind's opacity modifiers work
 * (e.g. bg-primary/10, ring-ring/40).
 */
const token = (name: string) => `rgb(var(${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: token('--background'),
        foreground: token('--foreground'),
        card: {
          DEFAULT: token('--card'),
          foreground: token('--card-foreground'),
        },
        popover: {
          DEFAULT: token('--popover'),
          foreground: token('--popover-foreground'),
        },
        primary: {
          DEFAULT: token('--primary'),
          foreground: token('--primary-foreground'),
        },
        secondary: {
          DEFAULT: token('--secondary'),
          foreground: token('--secondary-foreground'),
        },
        muted: {
          DEFAULT: token('--muted'),
          foreground: token('--muted-foreground'),
        },
        accent: {
          DEFAULT: token('--accent'),
          foreground: token('--accent-foreground'),
        },
        destructive: {
          DEFAULT: token('--destructive'),
          foreground: token('--destructive-foreground'),
        },
        success: {
          DEFAULT: token('--success'),
          foreground: token('--success-foreground'),
        },
        border: token('--border'),
        input: token('--input'),
        ring: token('--ring'),
        sidebar: {
          DEFAULT: token('--sidebar'),
          foreground: token('--sidebar-foreground'),
          primary: token('--sidebar-primary'),
          'primary-foreground': token('--sidebar-primary-foreground'),
          accent: token('--sidebar-accent'),
          'accent-foreground': token('--sidebar-accent-foreground'),
          border: token('--sidebar-border'),
          ring: token('--sidebar-ring'),
        },
        chart: {
          clicks: token('--chart-clicks'),
          locations: token('--chart-locations'),
          devices: token('--chart-devices'),
          os: token('--chart-os'),
          referrers: token('--chart-referrers'),
          'top-links': token('--chart-top-links'),
        },
      },
      borderRadius: {
        sm: 'calc(var(--radius) - 4px)',
        md: 'calc(var(--radius) - 2px)',
        lg: 'var(--radius)',
        xl: 'calc(var(--radius) + 4px)',
        '2xl': 'calc(var(--radius) + 8px)',
        '3xl': 'calc(var(--radius) + 12px)',
        '4xl': 'calc(var(--radius) + 16px)',
      },
      boxShadow: {
        soft: 'var(--shadow-soft)',
        xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        /* Raised card: hairline top sheen + soft ambient drop (theme-aware). */
        card: 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        /* Warm orange halo for primary accents. */
        glow: '0 0 0 1px rgb(var(--primary) / 0.4), 0 10px 30px -10px rgb(var(--primary) / 0.6)',
        'glow-sm': '0 0 18px -5px rgb(var(--primary) / 0.55)',
      },
      fontFamily: {
        /* Resolve through CSS vars so `.landing-theme` can swap in its own
         * editorial stacks (Fraunces + Geist) without touching the dashboard. */
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'Menlo', 'monospace'],
        display: ['var(--font-display)', 'Georgia', 'Times New Roman', 'serif'],
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '0.9' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'glow-pulse': 'glow-pulse 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
