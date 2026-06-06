import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#C8102E',
          hover: '#a50d25',
          light: '#fde8eb',
        },
        sidebar: '#061B2E',
        'sidebar-hover': '#0d2d4a',
        'sidebar-active': '#1F6F8B',
        bg: '#F4F6FB',
        surface: '#FFFFFF',
        border: '#E5E7EB',
        text: {
          primary: '#0B1F3A',
          secondary: '#6B7280',
          muted: '#9CA3AF',
        },
        success: { DEFAULT: '#16A34A', light: '#dcfce7' },
        warning: { DEFAULT: '#F97316', light: '#fff7ed' },
        danger: { DEFAULT: '#DC2626', light: '#fee2e2' },
        info: { DEFAULT: '#1F6F8B', light: '#e0f2fe' },
        violet: { DEFAULT: '#7C3AED', light: '#ede9fe' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '12px',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)',
        elevated: '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)',
      },
    },
  },
  plugins: [],
} satisfies Config
