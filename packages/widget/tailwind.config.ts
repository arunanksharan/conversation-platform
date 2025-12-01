import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--widget-border))',
        input: 'hsl(var(--widget-input))',
        ring: 'hsl(var(--widget-ring))',
        background: 'hsl(var(--widget-bg))',
        foreground: 'hsl(var(--widget-fg))',
        primary: {
          DEFAULT: 'hsl(var(--widget-primary))',
          foreground: 'hsl(var(--widget-primary-fg))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--widget-secondary))',
          foreground: 'hsl(var(--widget-secondary-fg))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--widget-destructive))',
          foreground: 'hsl(var(--widget-destructive-fg))',
        },
        muted: {
          DEFAULT: 'hsl(var(--widget-muted))',
          foreground: 'hsl(var(--widget-muted-fg))',
        },
        accent: {
          DEFAULT: 'hsl(var(--widget-accent))',
          foreground: 'hsl(var(--widget-accent-fg))',
        },
        popover: {
          DEFAULT: 'hsl(var(--widget-popover))',
          foreground: 'hsl(var(--widget-popover-fg))',
        },
        card: {
          DEFAULT: 'hsl(var(--widget-card))',
          foreground: 'hsl(var(--widget-card-fg))',
        },
      },
      borderRadius: {
        lg: 'var(--widget-radius)',
        md: 'calc(var(--widget-radius) - 2px)',
        sm: 'calc(var(--widget-radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
      containerQueries: {
        enabled: true,
      },
    },
  },
  plugins: [],
};

export default config;
